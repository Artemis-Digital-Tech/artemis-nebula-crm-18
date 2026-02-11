export type LeadTemplateContext = {
  leadName?: string | null;
  organizationName?: string | null;
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PLACEHOLDERS: Record<
  string,
  (ctx: LeadTemplateContext) => string
> = {
  // Inglês
  "{name}": (ctx) => ctx.leadName?.toString() ?? "",
  "{organization}": (ctx) => ctx.organizationName?.toString() ?? "",
  // Alias em Português (mantidos por compatibilidade)
  "{nome}": (ctx) => ctx.leadName?.toString() ?? "",
  "{empresa}": (ctx) => ctx.organizationName?.toString() ?? "",
};

export const AVAILABLE_PLACEHOLDERS = Object.keys(PLACEHOLDERS);

export function formatLeadMessage(
  template: string,
  ctx: LeadTemplateContext
): string {
  if (!template) return "";

  let result = template;

  for (const [token, getValue] of Object.entries(PLACEHOLDERS)) {
    const value = getValue(ctx);
    const regex = new RegExp(escapeRegExp(token), "g");
    result = result.replace(regex, value);
  }

  return result;
}

