import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent, x-api-key",
  "Access-Control-Max-Age": "86400",
};

type ProvisionUserBody = {
  email: string;
  password: string;
  display_name?: string;
  company_name?: string;
  phone?: string;
};

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Método não permitido" },
      405,
      { Allow: "POST, OPTIONS" },
    );
  }

  const expectedApiKey = Deno.env.get("PROVISIONING_API_KEY") ?? "";
  if (!expectedApiKey) {
    return jsonResponse(
      { success: false, error: "PROVISIONING_API_KEY não configurada" },
      500,
    );
  }

  const providedApiKey = req.headers.get("x-api-key") ?? "";
  if (!providedApiKey || providedApiKey !== expectedApiKey) {
    return jsonResponse({ success: false, error: "Não autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        success: false,
        error: "Variáveis SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes",
      },
      500,
    );
  }

  let body: ProvisionUserBody;
  try {
    body = (await req.json()) as ProvisionUserBody;
  } catch {
    return jsonResponse({ success: false, error: "JSON inválido" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !email.includes("@")) {
    return jsonResponse({ success: false, error: "Email inválido" }, 400);
  }

  if (!password || password.length < 8) {
    return jsonResponse(
      { success: false, error: "Senha inválida (mínimo 8 caracteres)" },
      400,
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        selected_plan: "pro",
        display_name: body.display_name,
        company_name: body.company_name,
        phone: body.phone,
      },
    });

  if (createError || !created?.user?.id) {
    return jsonResponse(
      {
        success: false,
        error: createError?.message ?? "Falha ao criar usuário",
      },
      400,
    );
  }

  const userId = created.user.id;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return jsonResponse(
      { success: false, error: "Falha ao buscar profile do usuário" },
      500,
    );
  }

  const organizationId = profile?.organization_id ?? null;

  if (organizationId) {
    const { error: orgError } = await supabaseAdmin
      .from("organizations")
      .update({ plan: "pro" })
      .eq("id", organizationId);

    if (orgError) {
      return jsonResponse(
        {
          success: false,
          error: "Usuário criado, mas falhou ao liberar plano Pro",
          user_id: userId,
          organization_id: organizationId,
        },
        500,
      );
    }
  }

  return jsonResponse({
    success: true,
    user_id: userId,
    organization_id: organizationId,
    plan: "pro",
  });
});

