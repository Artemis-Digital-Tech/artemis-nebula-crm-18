/**
 * Webhook HTTP da Evolution API: sincroniza instâncias WhatsApp, processa mensagens recebidas
 * e encaminha payload ao n8n quando configurado.
 *
 * Fluxo resumido:
 * - `OPTIONS` — resposta CORS (204).
 * - Eventos `connection.update` / `CONNECTION_UPDATE` — atualização de `whatsapp_instances`.
 * - `messages.upsert` com `data.key.fromMe !== true` — cria/atualiza lead, carrega contexto (IA, status, produtos) e dispara webhook n8n se houver URL nas settings.
 * - Qualquer outro evento — HTTP 200 com `{ message: 'Event ignored' }`.
 *
 * Variáveis de ambiente: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; opcional `SUPABASE_ANON_KEY` como fallback do token repassado ao n8n.
 *
 * @module evolution-webhook
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { handleConnectionUpdate } from './connection-update.ts';
import { jsonResponse, optionsResponse } from './http.ts';
import { processMessageUpsert } from './message-upsert.ts';
import { extractAccessToken, extractInstanceName } from './payload.ts';

const CONNECTION_EVENTS = new Set(['connection.update', 'CONNECTION_UPDATE']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  console.log('Evolution webhook received');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? null;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = (await req.json()) as Record<string, unknown>;
    const accessToken = extractAccessToken(req, supabaseAnonKey);
    const instanceName = extractInstanceName(payload);

    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    const event = payload.event as string | undefined;
    if (event && CONNECTION_EVENTS.has(event)) {
      return await handleConnectionUpdate(supabase, payload, instanceName);
    }

    const data = payload.data as { key?: { fromMe?: boolean } } | undefined;
    if (event !== 'messages.upsert' || data?.key?.fromMe) {
      console.log('Ignoring event:', event, 'fromMe:', data?.key?.fromMe);
      return jsonResponse({ message: 'Event ignored' }, 200);
    }

    return await processMessageUpsert({
      supabase,
      payload,
      instanceName,
      accessToken,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: errorMessage }, 500);
  }
});
