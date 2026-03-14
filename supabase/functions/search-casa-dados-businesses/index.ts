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
  bairro?: string[];
  categories?: string[];
  textQuery?: string;
  cnaeCodes?: string[];
  cnaeSecundario?: string[];
  incluirAtividadeSecundaria?: boolean;
  codigoNaturezaJuridica?: string[];
  limit?: number;
  page?: number;
  situacaoCadastral?: string[];
  matrizFilial?: "MATRIZ" | "FILIAL";
  comTelefone?: boolean;
  comEmail?: boolean;
  somenteMatriz?: boolean;
  somenteFilial?: boolean;
  somenteFixo?: boolean;
  somenteCelular?: boolean;
  porteEmpresa?: string[];
  capitalSocialMin?: number;
  capitalSocialMax?: number;
  dataAberturaInicio?: string;
  dataAberturaFim?: string;
  dataAberturaUltimosDias?: number;
  meiOptante?: boolean;
  meiExcluirOptante?: boolean;
  simplesOptante?: boolean;
  simplesExcluirOptante?: boolean;
}

interface SearchBusinessResult {
  name: string;
  razaoSocial?: string;
  cnpj?: string;
  address: string;
  phone: string | null;
  email: string | null;
  category: string;
  rating: null;
  latitude: number | null;
  longitude: number | null;
  porte?: string;
  matrizFilial?: string;
  dataAbertura?: string;
  capitalSocial?: number;
  naturezaJuridica?: string;
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
      bairro = [],
      categories = [],
      textQuery = "",
      cnaeCodes = [],
      cnaeSecundario = [],
      incluirAtividadeSecundaria = false,
      codigoNaturezaJuridica = [],
      limit = 50,
      page = 1,
      situacaoCadastral,
      matrizFilial,
      comTelefone = true,
      comEmail,
      somenteMatriz,
      somenteFilial,
      somenteFixo,
      somenteCelular,
      porteEmpresa = [],
      capitalSocialMin,
      capitalSocialMax,
      dataAberturaInicio,
      dataAberturaFim,
      dataAberturaUltimosDias,
      meiOptante,
      meiExcluirOptante,
      simplesOptante,
      simplesExcluirOptante,
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
    const cleanedCnaeSec = cnaeSecundario.map((item) => onlyDigits(item)).filter(Boolean);
    const cleanedNatureza = codigoNaturezaJuridica.map((item) => onlyDigits(item)).filter(Boolean);

    if (textualSearchTerms.length === 0 && cleanedCnaes.length === 0) {
      throw new Error("Informe uma busca textual livre ou um código CNAE");
    }

    const cleanedSituacao = Array.isArray(situacaoCadastral)
      ? situacaoCadastral.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
      : [];
    const situacaoFinal = cleanedSituacao.length > 0 ? cleanedSituacao : ["ATIVA"];

    const maisFiltros: Record<string, boolean> = {
      com_telefone: comTelefone,
    };
    if (comEmail !== undefined) maisFiltros.com_email = comEmail;
    if (somenteMatriz !== undefined) maisFiltros.somente_matriz = somenteMatriz;
    if (somenteFilial !== undefined) maisFiltros.somente_filial = somenteFilial;
    if (somenteFixo !== undefined) maisFiltros.somente_fixo = somenteFixo;
    if (somenteCelular !== undefined) maisFiltros.somente_celular = somenteCelular;

    const payload: Record<string, unknown> = {
      situacao_cadastral: situacaoFinal,
      mais_filtros: maisFiltros,
      uf: [uf.toLowerCase()],
      limite: Math.max(1, Math.min(limit, 100)),
      pagina: Math.max(page, 1),
    };

    if (municipio?.trim()) {
      payload.municipio = [municipio.toLowerCase()];
    }

    if (Array.isArray(bairro) && bairro.length > 0) {
      payload.bairro = bairro.map((b) => String(b).trim().toLowerCase()).filter(Boolean);
    }

    if (matrizFilial) {
      payload.matriz_filial = matrizFilial;
    }

    if (incluirAtividadeSecundaria) {
      payload.incluir_atividade_secundaria = true;
    }

    if (cleanedCnaeSec.length > 0) {
      payload.codigo_atividade_secundaria = cleanedCnaeSec;
    }

    if (cleanedNatureza.length > 0) {
      payload.codigo_natureza_juridica = cleanedNatureza;
    }

    if (porteEmpresa.length > 0) {
      payload.porte_empresa = { codigos: porteEmpresa };
    }

    if (capitalSocialMin !== undefined || capitalSocialMax !== undefined) {
      payload.capital_social = {};
      if (capitalSocialMin !== undefined) (payload.capital_social as Record<string, number>).minimo = capitalSocialMin;
      if (capitalSocialMax !== undefined) (payload.capital_social as Record<string, number>).maximo = capitalSocialMax;
    }

    if (dataAberturaInicio || dataAberturaFim || dataAberturaUltimosDias) {
      payload.data_abertura = {};
      if (dataAberturaInicio) (payload.data_abertura as Record<string, string>).inicio = dataAberturaInicio;
      if (dataAberturaFim) (payload.data_abertura as Record<string, string>).fim = dataAberturaFim;
      if (dataAberturaUltimosDias) (payload.data_abertura as Record<string, number>).ultimos_dias = dataAberturaUltimosDias;
    }

    if (meiOptante !== undefined || meiExcluirOptante !== undefined) {
      payload.mei = {};
      if (meiOptante !== undefined) (payload.mei as Record<string, boolean>).optante = meiOptante;
      if (meiExcluirOptante !== undefined) (payload.mei as Record<string, boolean>).excluir_optante = meiExcluirOptante;
    }

    if (simplesOptante !== undefined || simplesExcluirOptante !== undefined) {
      payload.simples = {};
      if (simplesOptante !== undefined) (payload.simples as Record<string, boolean>).optante = simplesOptante;
      if (simplesExcluirOptante !== undefined) (payload.simples as Record<string, boolean>).excluir_optante = simplesExcluirOptante;
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
      situacaoCadastral: situacaoFinal,
      comTelefone,
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

      const porteDesc = company?.porte_empresa?.descricao || company?.porte_empresa?.codigo;
      const matrizFilialVal = company?.matriz_filial;

      businesses.push({
        name: company?.nome_fantasia || company?.razao_social || company?.cnpj || "Empresa sem nome",
        razaoSocial: company?.razao_social || undefined,
        cnpj: company?.cnpj ? onlyDigits(company.cnpj) : undefined,
        address: buildAddress(company?.endereco),
        phone: primaryPhone,
        email: emails[0] || null,
        category: matchCategory(company, cleanedCategories),
        rating: null,
        latitude: company?.endereco?.ibge?.latitude || null,
        longitude: company?.endereco?.ibge?.longitude || null,
        porte: porteDesc || undefined,
        matrizFilial: matrizFilialVal || undefined,
        dataAbertura: company?.data_abertura || undefined,
        capitalSocial: typeof company?.capital_social === "number" ? company.capital_social : undefined,
        naturezaJuridica: company?.descricao_natureza_juridica || company?.codigo_natureza_juridica || undefined,
      });
    }

    logStep("Search completed", {
      totalReturned: businesses.length,
      totalFromApi: data?.total ?? companies.length,
      skippedWithoutPhone,
    });

    const apiTotal = typeof data?.total === "number" ? data.total : companies.length;

    return new Response(
      JSON.stringify({
        businesses,
        total: businesses.length,
        totalFromApi: apiTotal,
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
