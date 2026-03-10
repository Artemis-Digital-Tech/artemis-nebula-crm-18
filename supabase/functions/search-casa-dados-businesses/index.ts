import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const CASA_DOS_DADOS_API_URL = "https://api.casadosdados.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

interface SearchRequest {
  uf: string;
  municipio?: string;
  categories?: string[];
  textQuery?: string;
  cnaeCodes?: string[];
  limit?: number;
  page?: number;
}

interface SearchBusinessResult {
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  category: string;
  rating: null;
  latitude: number | null;
  longitude: number | null;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEARCH-CASA-DADOS-BUSINESSES] ${step}${detailsStr}`);
};

const onlyDigits = (value: string): string => value.replace(/\D/g, "");

const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizePhoneValue = (phone: unknown): string | null => {
  if (typeof phone === "string" || typeof phone === "number") {
    const raw = String(phone).trim();
    return onlyDigits(raw).length >= 10 ? raw : null;
  }

  if (phone && typeof phone === "object") {
    const value = phone as Record<string, unknown>;
    const ddd = String(value.ddd ?? "").trim();
    const numero = String(value.numero ?? value.telefone ?? "").trim();
    const combined = `${ddd}${numero}`.trim();
    return onlyDigits(combined).length >= 10 ? combined : null;
  }

  return null;
};

const dedupePhones = (phones: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const phone of phones) {
    const normalized = onlyDigits(phone);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(phone);
  }

  return result;
};

const extractPhones = (company: any): string[] => {
  const candidates: unknown[] = [];

  if (Array.isArray(company?.telefone)) {
    candidates.push(...company.telefone);
  } else if (company?.telefone) {
    candidates.push(company.telefone);
  }

  if (Array.isArray(company?.telefones)) {
    candidates.push(...company.telefones);
  } else if (company?.telefones) {
    candidates.push(company.telefones);
  }

  if (Array.isArray(company?.contato_telefonico)) {
    candidates.push(...company.contato_telefonico);
  } else if (company?.contato_telefonico) {
    candidates.push(company.contato_telefonico);
  }

  if (Array.isArray(company?.celular)) {
    candidates.push(...company.celular);
  } else if (company?.celular) {
    candidates.push(company.celular);
  }

  if (company?.ddd && company?.telefone) {
    candidates.push(`${String(company.ddd)}${String(company.telefone)}`);
  }

  const normalizedPhones = candidates
    .map((candidate) => normalizePhoneValue(candidate))
    .filter((phone): phone is string => Boolean(phone));

  return dedupePhones(normalizedPhones);
};

const extractEmails = (company: any): string[] => {
  if (Array.isArray(company?.email)) {
    return company.email.map((email: unknown) => String(email)).filter(Boolean);
  }

  if (Array.isArray(company?.emails)) {
    return company.emails.map((email: unknown) => String(email)).filter(Boolean);
  }

  if (typeof company?.email === "string" && company.email.trim()) {
    return [company.email.trim()];
  }

  return [];
};

const buildAddress = (endereco: any): string => {
  if (!endereco) {
    return "";
  }

  const firstPart = [endereco.tipo_logradouro, endereco.logradouro, endereco.numero]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [
    firstPart,
    endereco.complemento,
    endereco.bairro,
    endereco.municipio,
    endereco.uf,
    endereco.cep,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
};

const matchCategory = (company: any, categories: string[]): string => {
  if (categories.length === 0) {
    return "Casa dos Dados";
  }

  const haystack = normalizeText(
    [
      company?.nome_fantasia,
      company?.razao_social,
      company?.codigo_atividade_principal,
      company?.descricao_natureza_juridica,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const matched = categories.find((category) => haystack.includes(normalizeText(category)));
  return matched || categories[0];
};

const fetchCompanyDetails = async (cnpj: string, apiKey: string) => {
  const normalizedCnpj = onlyDigits(cnpj);
  const response = await fetch(`${CASA_DOS_DADOS_API_URL}/v4/cnpj/${normalizedCnpj}`, {
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const apiKey = Deno.env.get("CASA_DOS_DADOS_API_KEY");

    if (!apiKey) {
      throw new Error("CASA_DOS_DADOS_API_KEY não configurada");
    }

    const {
      uf,
      municipio,
      categories = [],
      textQuery = "",
      cnaeCodes = [],
      limit = 50,
      page = 1,
    }: SearchRequest = await req.json();

    if (!uf?.trim()) {
      throw new Error("UF é obrigatória");
    }

    const cleanedCategories = (Array.isArray(categories) ? categories : [])
      .map((item) => item.trim())
      .filter(Boolean);
    const normalizedTextQuery = String(textQuery ?? "").trim();
    const textualSearchTerms = normalizedTextQuery ? [normalizedTextQuery] : [];
    const cleanedCnaes = cnaeCodes.map((item) => onlyDigits(item)).filter(Boolean);

    if (textualSearchTerms.length === 0 && cleanedCnaes.length === 0) {
      throw new Error("Informe uma busca textual livre ou um código CNAE");
    }

    const payload: Record<string, unknown> = {
      situacao_cadastral: ["ATIVA"],
      mais_filtros: {
        com_telefone: true,
      },
      uf: [uf.toLowerCase()],
      limite: Math.max(1, Math.min(limit, 100)),
      pagina: Math.max(page, 1),
    };

    if (municipio?.trim()) {
      payload.municipio = [municipio.toLowerCase()];
    }

    if (textualSearchTerms.length > 0) {
      payload.busca_textual = textualSearchTerms.map((term) => ({
        texto: [term],
        tipo_busca: "radical",
        razao_social: true,
        nome_fantasia: true,
        nome_socio: false,
      }));
    }

    if (cleanedCnaes.length > 0) {
      payload.codigo_atividade_principal = cleanedCnaes;
    }

    logStep("Calling Casa dos Dados API", {
      uf,
      municipio,
      categories: cleanedCategories,
      textQuery: normalizedTextQuery,
      textualSearchTerms,
      cnaeCodes: cleanedCnaes,
      limit: payload.limite,
      page: payload.pagina,
    });

    const searchResponse = await fetch(`${CASA_DOS_DADOS_API_URL}/v5/cnpj/pesquisa?tipo_resultado=completo`, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text();
      logStep("Casa dos Dados API error", {
        status: searchResponse.status,
        body: errorBody,
      });
      throw new Error(`Erro da Casa dos Dados: ${searchResponse.status}`);
    }

    const data = await searchResponse.json();
    const companies = Array.isArray(data?.cnpjs) ? data.cnpjs : [];

    const businesses: SearchBusinessResult[] = [];
    let skippedWithoutPhone = 0;

    for (const company of companies) {
      const details = company?.cnpj
        ? await fetchCompanyDetails(String(company.cnpj), apiKey)
        : null;
      const sourceForContacts = details || company;

      const phones = extractPhones(sourceForContacts);
      const emails = extractEmails(sourceForContacts);
      const primaryPhone = phones[0] || null;

      if (!primaryPhone) {
        skippedWithoutPhone += 1;
        continue;
      }

      businesses.push({
        name: company?.nome_fantasia || company?.razao_social || company?.cnpj || "Empresa sem nome",
        address: buildAddress(company?.endereco),
        phone: primaryPhone,
        email: emails[0] || null,
        category: matchCategory(company, cleanedCategories),
        rating: null,
        latitude: company?.endereco?.ibge?.latitude || null,
        longitude: company?.endereco?.ibge?.longitude || null,
      });
    }

    logStep("Search completed", {
      totalReturned: businesses.length,
      totalFromApi: data?.total ?? companies.length,
      skippedWithoutPhone,
    });

    return new Response(
      JSON.stringify({
        businesses,
        total: businesses.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
