/**
 * Helpers de resposta HTTP e cabeçalhos CORS compartilhados pelo webhook Evolution.
 *
 * @module http
 */

/** Cabeçalhos CORS aplicados a todas as respostas desta Edge Function. */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent',
  'Access-Control-Max-Age': '86400',
} as const;

/**
 * Monta uma `Response` JSON com `Content-Type: application/json` e os cabeçalhos CORS do módulo.
 *
 * @param body — Objeto serializado com `JSON.stringify` (ou valor compatível).
 * @param status — Código HTTP da resposta.
 */
export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Resposta ao preflight CORS (`OPTIONS`), status 204 sem corpo. */
export function optionsResponse(): Response {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  });
}
