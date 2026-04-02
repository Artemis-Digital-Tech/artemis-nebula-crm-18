/**
 * Funções puras para ler token, instância, estado de conexão e JID a partir do JSON da Evolution.
 *
 * @module payload
 */

/** Corpo JSON do webhook tratado como registro genérico (formatos variam por evento Evolution). */
type PayloadRecord = Record<string, unknown>;

function asRecord(value: unknown): PayloadRecord | undefined {
  return value !== null && typeof value === 'object' ? (value as PayloadRecord) : undefined;
}

/**
 * Obtém o token Bearer enviado pelo cliente ou, na ausência de `Authorization`, a anon key do Supabase.
 * Útil para repassar credencial ao n8n nas mesmas convenções das demais rotas.
 *
 * @param req — Requisição HTTP recebida pelo Deno.
 * @param supabaseAnonKey — Valor de `SUPABASE_ANON_KEY` ou `null` se não configurado.
 * @returns Token sem o prefixo `Bearer `, ou `null` se não houver header e anon key for `null`.
 */
export function extractAccessToken(req: Request, supabaseAnonKey: string | null): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return supabaseAnonKey;
  }
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }
  return authHeader;
}

/**
 * Resolve o nome lógico da instância Evolution a partir de vários formatos de payload
 * (`instance`, `instanceName`, `session`, campos aninhados em `data`, etc.).
 */
export function extractInstanceName(payload: PayloadRecord): string | undefined {
  const data = asRecord(payload.data);
  return (
    (payload.instance as string | undefined) ||
    (payload.instanceName as string | undefined) ||
    (data?.instance as string | undefined) ||
    (data?.instanceName as string | undefined) ||
    (payload.session as string | undefined) ||
    (data?.session as string | undefined) ||
    (data?.id as string | undefined) ||
    (data?.name as string | undefined)
  );
}

/**
 * Estado da conexão informado no evento de atualização (ex.: `open`, `close`, `connected`).
 * Consulta `data.state`, `data.connection` e campos de topo do payload.
 */
export function extractConnectionState(payload: PayloadRecord): unknown {
  const data = asRecord(payload.data);
  return data?.state ?? data?.connection ?? payload.connection ?? payload.state;
}

type JidSource = string | { id?: string; jid?: string } | undefined;

/**
 * Extrai o primeiro JID/telefone útil quando a conexão fica `open`/`connected`,
 * percorrendo os caminhos conhecidos nos payloads da Evolution (wuid, user, owner, etc.).
 *
 * @returns `phoneNumber` — parte antes de `@` do JID; `whatsappJid` — string completa do JID quando encontrada.
 */
export function extractPhoneAndJidFromConnectionPayload(payload: PayloadRecord): {
  phoneNumber: string | null;
  whatsappJid: string | null;
} {
  const data = asRecord(payload.data);
  const user = asRecord(data?.user);
  const instanceNested = asRecord(data?.instance);
  const payloadInstance = asRecord(payload.instance);
  const payloadUser = asRecord(payload.user);

  const candidates: JidSource[] = [
    data?.wuid as JidSource,
    payload.sender as JidSource,
    user?.id as JidSource,
    user?.jid as JidSource,
    data?.jid as JidSource,
    payloadUser?.id as JidSource,
    payloadUser?.jid as JidSource,
    data?.user as JidSource,
    data?.owner as JidSource,
    payload.owner as JidSource,
    payloadInstance?.owner as JidSource,
    instanceNested?.owner as JidSource,
  ];

  for (const path of candidates) {
    if (!path) continue;
    if (typeof path === 'string') {
      return { whatsappJid: path, phoneNumber: path.split('@')[0] };
    }
    if (typeof path === 'object' && path.id) {
      return { whatsappJid: path.id, phoneNumber: path.id.split('@')[0] };
    }
    if (typeof path === 'object' && path.jid) {
      return { whatsappJid: path.jid, phoneNumber: path.jid.split('@')[0] };
    }
  }

  return { phoneNumber: null, whatsappJid: null };
}
