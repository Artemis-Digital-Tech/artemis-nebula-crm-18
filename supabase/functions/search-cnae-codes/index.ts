import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const IBGE_CNAE_URL = "https://servicodados.ibge.gov.br/api/v2/cnae/subclasses";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

interface SearchRequest {
  query?: string;
  limit?: number;
}

interface CnaeItem {
  code: string;
  description: string;
  label: string;
}

const toDigits = (value: string): string => value.replace(/\D/g, "");

const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatCnaeCode = (value: string): string => {
  const digits = toDigits(value);
  if (digits.length === 7) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5)}`;
  }
  return value.trim();
};

const parseCnae = (raw: Record<string, unknown>): CnaeItem | null => {
  const rawCode = String(
    raw.id ??
      raw.codigo ??
      raw.subclasse ??
      raw.cnae ??
      raw.classe ??
      "",
  ).trim();
  const rawDescription = String(
    raw.descricao ?? raw.descricao_subclasse ?? raw.text ?? "",
  ).trim();

  const code = toDigits(rawCode);
  if (!code || !rawDescription) {
    return null;
  }

  return {
    code,
    description: rawDescription,
    label: `${formatCnaeCode(code)} - ${rawDescription}`,
  };
};

const fetchAllCnaes = async (): Promise<CnaeItem[]> => {
  const response = await fetch(IBGE_CNAE_URL);
  if (!response.ok) {
    throw new Error(`Erro ao consultar IBGE (${response.status})`);
  }

  const data = await response.json();
  const list = Array.isArray(data) ? data : [];

  return list
    .map((item) => parseCnae(item as Record<string, unknown>))
    .filter((item): item is CnaeItem => Boolean(item));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { query = "", limit = 20 }: SearchRequest = await req.json();
    const cleanQuery = String(query).trim();

    if (cleanQuery.length < 2) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const maxLimit = Math.max(1, Math.min(Number(limit) || 20, 50));
    const queryDigits = toDigits(cleanQuery);
    const queryText = normalizeText(cleanQuery);

    const allCnaes = await fetchAllCnaes();

    const ranked = allCnaes
      .filter((item) => {
        const codeMatch = queryDigits ? item.code.includes(queryDigits) : false;
        const descMatch = normalizeText(item.description).includes(queryText);
        return codeMatch || descMatch;
      })
      .sort((a, b) => {
        if (queryDigits) {
          const aStarts = a.code.startsWith(queryDigits) ? 1 : 0;
          const bStarts = b.code.startsWith(queryDigits) ? 1 : 0;
          if (aStarts !== bStarts) return bStarts - aStarts;
        }

        const aDescStarts = normalizeText(a.description).startsWith(queryText) ? 1 : 0;
        const bDescStarts = normalizeText(b.description).startsWith(queryText) ? 1 : 0;
        if (aDescStarts !== bDescStarts) return bDescStarts - aDescStarts;

        return a.code.localeCompare(b.code);
      })
      .slice(0, maxLimit);

    return new Response(JSON.stringify({ items: ranked }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
