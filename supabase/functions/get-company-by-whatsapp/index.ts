import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";
import { resolveAgentIdForWhatsappInstanceId } from "../_shared/resolve-whatsapp-instance-agent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { phone_number, whatsapp_jid } = await req.json();

    if (!phone_number && !whatsapp_jid) {
      return new Response(
        JSON.stringify({ error: "phone_number or whatsapp_jid is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let instanceQuery = supabaseClient
      .from("whatsapp_instances")
      .select("id, organization_id")
      .eq("status", "connected");

    if (whatsapp_jid) {
      instanceQuery = instanceQuery.eq("whatsapp_jid", whatsapp_jid);
    } else if (phone_number) {
      let cleanedPhone = phone_number.replace(/\D/g, "");

      if (cleanedPhone.startsWith("55") && cleanedPhone.length > 10) {
        cleanedPhone = cleanedPhone.substring(2);
      }

      instanceQuery = instanceQuery.eq("phone_number", cleanedPhone);
    }

    const { data: instance, error: instanceError } = await instanceQuery.maybeSingle();

    if (instanceError) {
      console.error("Error finding instance:", instanceError);
      return new Response(
        JSON.stringify({ error: "Error finding WhatsApp instance" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!instance || !instance.organization_id) {
      return new Response(
        JSON.stringify({ error: "No connected WhatsApp instance found for the provided number" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const organizationId = instance.organization_id as string;
    const instanceId = instance.id as string;

    const { data: organization, error: orgError } = await supabaseClient
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      console.error("Error finding organization:", orgError);
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: settings } = await supabaseClient
      .from("settings")
      .select("default_ai_interaction_id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    let defaultAiContext = null;
    if (settings?.default_ai_interaction_id) {
      const { data: aiContext, error: aiError } = await supabaseClient
        .from("ai_interaction_settings")
        .select("*")
        .eq("id", settings.default_ai_interaction_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (!aiError && aiContext) {
        defaultAiContext = aiContext;
      }
    }

    let instanceAiContext = null;
    const instanceBoundAgentId = await resolveAgentIdForWhatsappInstanceId(
      supabaseClient,
      instanceId,
    );
    if (instanceBoundAgentId) {
      const { data: boundRow, error: boundError } = await supabaseClient
        .from("ai_interaction_settings")
        .select("*")
        .eq("id", instanceBoundAgentId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (!boundError && boundRow) {
        instanceAiContext = boundRow;
      }
    }

    const resolvedAiContext = instanceAiContext ?? defaultAiContext;

    const { data: statuses, error: statusesError } = await supabaseClient
      .from("lead_statuses")
      .select("*")
      .eq("organization_id", organizationId)
      .order("display_order", { ascending: true });

    if (statusesError) {
      console.error("Error fetching statuses:", statusesError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        organization,
        default_ai_context: defaultAiContext,
        instance_ai_context: instanceAiContext,
        resolved_ai_context: resolvedAiContext,
        statuses: statuses || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in get-company-by-whatsapp:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
