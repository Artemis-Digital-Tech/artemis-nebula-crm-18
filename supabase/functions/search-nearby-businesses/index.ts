import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEARCH-NEARBY-BUSINESSES] ${step}${detailsStr}`);
};

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    logStep("Function started");

    const { location, categories = [], textQuery = "", radius = 5000 } = await req.json();
    const cleanedCategories = (Array.isArray(categories) ? categories : [])
      .map((category: string) => category.trim())
      .filter(Boolean);
    const normalizedTextQuery = String(textQuery ?? "").trim();
    const searchTerms = Array.from(new Set([...cleanedCategories, normalizedTextQuery].filter(Boolean)));
    
    if (!location || searchTerms.length === 0) {
      throw new Error("Location and at least one search term are required");
    }

    logStep("Request parameters", { location, categories: cleanedCategories, textQuery: normalizedTextQuery, radius });


    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY not configured");
    }

    logStep("API key found");


    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
    logStep("Geocoding location", { url: geocodeUrl.replace(apiKey, "***") });

    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== "OK" || geocodeData.results.length === 0) {
      logStep("Geocoding failed", {
        status: geocodeData.status,
        error_message: geocodeData.error_message,
      });

      let userMessage = "Erro ao consultar localização.";
      if (geocodeData.status === "REQUEST_DENIED") {
        userMessage =
          "Google Places API negou a requisição. Verifique se a chave está correta, se o faturamento está ativo e se as APIs Geocoding, Places e Place Details estão habilitadas e sem restrições de uso.";
      } else if (geocodeData.status === "ZERO_RESULTS") {
        userMessage = "Localização não encontrada para o endereço informado.";
      }

      throw new Error(userMessage);
    }

    const { lat, lng } = geocodeData.results[0].geometry.location;
    logStep("Location geocoded", { lat, lng });


    const allBusinesses: any[] = [];
    
    for (const term of searchTerms) {
      logStep("Searching for term", { term });


      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(term)}&location=${lat},${lng}&radius=${radius}&language=pt-BR&key=${apiKey}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      logStep("Search response", { status: searchData.status, results: searchData.results?.length || 0 });

      if (searchData.status === "OK" && searchData.results) {

        for (const place of searchData.results) {
          try {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,rating,geometry,website&language=pt-BR&key=${apiKey}`;
            
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();
            
            if (detailsData.status === "OK" && detailsData.result) {

              let email: string | null = null;
              if (detailsData.result.website) {
                const websiteUrl = detailsData.result.website;
                const domain = websiteUrl.replace(/^https?:\/\//i, '').split('/')[0];

                email = `contato@${domain}`;
              }
              
              const business = {
                name: detailsData.result.name,
                address: detailsData.result.formatted_address || place.vicinity,
                phone: detailsData.result.formatted_phone_number || null,
                email: email,
                category: term,
                rating: detailsData.result.rating || null,
                latitude: detailsData.result.geometry?.location?.lat || null,
                longitude: detailsData.result.geometry?.location?.lng || null,
              };
              
              allBusinesses.push(business);
            }
          } catch (detailError: any) {
            logStep("Error fetching place details", { error: detailError.message, placeId: place.place_id });

            const business = {
              name: place.name,
              address: place.formatted_address || place.vicinity,
              phone: null,
              email: null,
              category: term,
              rating: place.rating || null,
              latitude: place.geometry?.location?.lat || null,
              longitude: place.geometry?.location?.lng || null,
            };
            allBusinesses.push(business);
          }
        }
      }
    }

    logStep("Search completed", { totalBusinesses: allBusinesses.length });

    return new Response(
      JSON.stringify({ 
        businesses: allBusinesses,
        total: allBusinesses.length 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

/* 
DOCUMENTAÇÃO DA API - Google Places Integration

Esta edge function busca negócios próximos usando Google Places API.

Parâmetros JSON esperados pela função:
{
  "location": "São Paulo, SP",           // Localização para busca
  "categories": [                        // Categorias selecionadas
    "Desenvolvimento Web",
    "E-commerce"
  ],
  "radius": 5000                         // Raio em metros (padrão: 5000)
}

Resposta JSON retornada:
{
  "businesses": [
    {
      "name": "Nome do Negócio",
      "address": "Endereço completo",
      "phone": "(11) 98765-4321",       // Pode ser null
      "category": "Categoria do lead",
      "rating": 4.5,                     // Pode ser null
      "latitude": -23.5505,              // Pode ser null
      "longitude": -46.6333              // Pode ser null
    }
  ],
  "total": 10
}

APIs do Google utilizadas:
1. Geocoding API - converte endereço em coordenadas lat/lng
2. Places Text Search API - busca negócios por categoria e localização
3. Place Details API - obtém informações detalhadas incluindo telefone

Requisitos:
1. Obtenha uma API key em: https://console.cloud.google.com/
2. Ative as seguintes APIs no projeto:
   - Geocoding API
   - Places API (New)
   - Place Details API
3. Configure limites de uso e faturamento se necessário
4. A API key já está configurada em GOOGLE_PLACES_API_KEY

Limites do Google Places API (com cobrança):
- Text Search: $32 por 1.000 requisições
- Place Details: $17 por 1.000 requisições
- Geocoding: $5 por 1.000 requisições
*/
