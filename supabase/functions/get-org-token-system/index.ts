import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent',
  'Access-Control-Max-Age': '86400',
};

type JsonRecord = Record<string, unknown>;

class JsonResponder {
  public ok(body: JsonRecord, status = 200): Response {
    return this.json(body, status);
  }

  public badRequest(message: string): Response {
    return this.json({ success: false, error: message }, 400);
  }

  public unauthorized(message: string): Response {
    return this.json({ success: false, error: message }, 401);
  }

  public notFound(message: string): Response {
    return this.json({ success: false, error: message }, 404);
  }

  public serverError(message: string): Response {
    return this.json({ success: false, error: message }, 500);
  }

  private json(body: JsonRecord, status: number): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

class SafeStringComparer {
  public equals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }
}

class SystemBearerAuthenticator {
  constructor(
    private readonly expectedToken: string,
    private readonly comparer: SafeStringComparer
  ) {}

  public isAuthorized(req: Request): boolean {
    const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
    if (!header) return false;
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) return false;
    return this.comparer.equals(match[1].trim(), this.expectedToken);
  }
}

class SupabasePasswordlessTokenIssuer {
  constructor(
    private readonly supabaseUrl: string,
    private readonly serviceRoleKey: string
  ) {}

  public async issueUserAccessToken(email: string): Promise<{
    accessToken: string;
    expiresIn: number;
    tokenType: string;
  } | null> {
    const admin = createClient(this.supabaseUrl, this.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData) {
      console.error('Erro ao gerar magiclink:', linkError);
      return null;
    }

    const properties = (linkData as unknown as { properties?: Record<string, unknown> }).properties;
    const tokenHash =
      (typeof properties?.['hashed_token'] === 'string' ? (properties['hashed_token'] as string) : null) ??
      (typeof properties?.['hashedToken'] === 'string' ? (properties['hashedToken'] as string) : null) ??
      (typeof (linkData as unknown as { hashed_token?: unknown }).hashed_token === 'string'
        ? ((linkData as unknown as { hashed_token: string }).hashed_token as string)
        : null) ??
      '';

    if (!tokenHash) {
      console.error('Magiclink gerado sem hashed token:', linkData);
      return null;
    }

    const { data: sessionData, error: verifyError } = await admin.auth.verifyOtp({
      type: 'email',
      token_hash: tokenHash,
    });

    if (verifyError || !sessionData?.session?.access_token) {
      console.error('Erro ao verificar OTP (token_hash):', verifyError);
      return null;
    }

    return {
      accessToken: sessionData.session.access_token,
      expiresIn: sessionData.session.expires_in ?? 3600,
      tokenType: sessionData.session.token_type ?? 'bearer',
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const responder = new JsonResponder();

  try {
    const systemToken = Deno.env.get('SYSTEM_BEARER_TOKEN');
    if (!systemToken) {
      return responder.serverError('SYSTEM_BEARER_TOKEN não configurado');
    }

    const authenticator = new SystemBearerAuthenticator(systemToken, new SafeStringComparer());
    if (!authenticator.isAuthorized(req)) {
      return responder.unauthorized('Bearer token inválido');
    }

    const payload = (await req.json().catch(() => ({}))) as JsonRecord;
    const organizationId = typeof payload.organizationId === 'string' ? payload.organizationId : '';

    if (!organizationId) {
      return responder.badRequest('organizationId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    if (profileError || !profile) {
      return responder.notFound('Organização não encontrada ou sem usuários associados');
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id);

    if (userError || !userData?.user?.email) {
      return responder.notFound('Usuário não encontrado');
    }

    const issuer = new SupabasePasswordlessTokenIssuer(supabaseUrl, supabaseServiceKey);
    const issued = await issuer.issueUserAccessToken(userData.user.email);

    if (!issued) {
      return responder.serverError('Não foi possível gerar token automaticamente');
    }

    return responder.ok({
      success: true,
      access_token: issued.accessToken,
      token_type: issued.tokenType,
      expires_in: issued.expiresIn,
      organization_id: organizationId,
      user_id: profile.id,
      user_email: userData.user.email,
    });
  } catch (error) {
    console.error('Error in get-org-token-system:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return responder.serverError(errorMessage);
  }
});

