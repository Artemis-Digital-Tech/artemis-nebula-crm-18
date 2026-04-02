/**
 * Normalização de telefone/WhatsApp para chaves em `leads.contact_whatsapp` e `whatsapp_instances`.
 *
 * @module phone
 */

/**
 * Remove caracteres não numéricos e garante prefixo `55` para números brasileiros
 * quando o comprimento indica DDD+número (10 ou 11 dígitos) ou dígitos insuficientes.
 *
 * @param phone — Identificador parcial (ex.: parte antes de `@` no JID).
 * @returns Dígitos normalizados, priorizando formato já iniciado em `55` ou comprimento acima de 11 dígitos.
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('55')) {
    return cleaned;
  }

  if (cleaned.length === 11 || cleaned.length === 10) {
    return `55${cleaned}`;
  }

  if (cleaned.length > 11) {
    return cleaned;
  }

  return `55${cleaned}`;
}
