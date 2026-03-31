import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials não configuradas");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const nowISO = now.toISOString();

    const { data: scheduledInteractions, error: fetchError } = await supabase
      .from("scheduled_interactions")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", nowISO)
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!scheduledInteractions || scheduledInteractions.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma interação para processar", processed: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    let successCount = 0;
    let errorCount = 0;

    for (const scheduledInteraction of scheduledInteractions) {
      try {
        const { data: lead, error: leadError } = await supabase
          .from("leads")
          .select("*")
          .eq("id", scheduledInteraction.lead_id)
          .single();

        if (leadError || !lead) {
          throw new Error(`Lead não encontrado: ${scheduledInteraction.lead_id}`);
        }

        const { data: instance, error: instanceError } = await supabase
          .from("whatsapp_instances")
          .select("organization_id, status")
          .eq("instance_name", scheduledInteraction.instance_name)
          .single();

        if (instanceError || !instance) {
          throw new Error(`Instância WhatsApp não encontrada: ${scheduledInteraction.instance_name}`);
        }

        if (instance.status !== "connected") {
          throw new Error(`Instância WhatsApp não está conectada: ${scheduledInteraction.instance_name}`);
        }

        const { data: organization, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", instance.organization_id)
          .single();

        if (orgError) {
          console.error("Erro ao buscar organização:", orgError);
        }

        let aiConfig = null;
        let agentComponents: any[] = [];
        let agentComponentConfigurations: any[] = [];

        const { data: aiInteraction, error: aiError } = await supabase
          .from("ai_interaction_settings")
          .select("*")
          .eq("id", scheduledInteraction.ai_interaction_id)
          .eq("organization_id", instance.organization_id)
          .maybeSingle();

        if (!aiError && aiInteraction) {
          aiConfig = aiInteraction;

          const { data: components, error: componentsError } = await supabase
            .from("agent_components")
            .select(`
              id,
              agent_id,
              component_id,
              created_at,
              components(*)
            `)
            .eq("agent_id", scheduledInteraction.ai_interaction_id);

          if (!componentsError && components) {
            agentComponents = components;
          }

          const { data: configurations, error: configsError } = await supabase
            .from("agent_component_configurations")
            .select(`
              id,
              agent_id,
              component_id,
              config,
              created_at,
              updated_at,
              components(*)
            `)
            .eq("agent_id", scheduledInteraction.ai_interaction_id);

          if (!configsError && configurations) {
            agentComponentConfigurations = configurations;
          }
        }

        let leadStatuses: any[] = [];
        const { data: statusesData, error: statusesError } = await supabase
          .from("lead_statuses")
          .select("*")
          .eq("organization_id", instance.organization_id)
          .order("display_order", { ascending: true });

        if (!statusesError && statusesData) {
          const finishedStatus = statusesData.find((s: any) => s.status_key === "finished");
          const requiredStatuses = statusesData.filter((s: any) => s.is_required && s.status_key !== "finished");
          const customStatuses = statusesData.filter((s: any) => !s.is_required && s.status_key !== "finished");

          const sortedRequiredStatuses = requiredStatuses.sort((a: any, b: any) => a.display_order - b.display_order);
          const sortedCustomStatuses = customStatuses.sort((a: any, b: any) => a.display_order - b.display_order);

          if (finishedStatus) {
            leadStatuses = [...sortedRequiredStatuses, ...sortedCustomStatuses, finishedStatus];
          } else {
            leadStatuses = [...sortedRequiredStatuses, ...sortedCustomStatuses];
          }
        }

        const { data: settings, error: settingsError } = await supabase
          .from("settings")
          .select("n8n_webhook_url")
          .eq("organization_id", instance.organization_id)
          .maybeSingle();

        if (settingsError) {
          console.error("Erro ao buscar settings:", settingsError);
        }

        if (settings?.n8n_webhook_url) {
          const phoneNumber = lead.contact_whatsapp || scheduledInteraction.remote_jid.split("@")[0];
          const remoteJid = scheduledInteraction.remote_jid;
          const contactName = lead.name || "";
          const leadContactOrigin = lead.source || "base de contatos da organização";

          const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
          const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

          const messageId = `scheduled-${scheduledInteraction.id}-${Date.now()}`;
          const conversationText = "";

          const webhookPayload = {
            event: "messages.upsert",
            instance: scheduledInteraction.instance_name,
            lead: lead,
            organization: organization,
            ai_config: aiConfig,
            agent_components: agentComponents,
            agent_component_configurations: agentComponentConfigurations,
            lead_statuses: leadStatuses,
            message: {
              conversation: conversationText,
            },
            messageType: "conversation",
            conversation: conversationText,
            messageId: messageId,
            contactName: contactName,
            phoneNumber: phoneNumber,
            remoteJid: remoteJid,
            fromMe: false,
            evolution: {
              apikey: EVOLUTION_API_KEY || null,
              serverUrl: EVOLUTION_API_URL || null,
              instance: scheduledInteraction.instance_name || null,
            },
            isScheduledInteraction: true,
            scheduledInteraction: {
              id: scheduledInteraction.id,
              scheduled_at: scheduledInteraction.scheduled_at,
            },
            lead_contact_origin: leadContactOrigin,
            timestamp: new Date().toISOString(),
          };

          const webhookResponse = await fetch(settings.n8n_webhook_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookPayload),
          });

          if (!webhookResponse.ok) {
            const errorText = await webhookResponse.text();
            console.error("Erro ao chamar webhook n8n:", webhookResponse.status, errorText);
            throw new Error(`Webhook n8n retornou erro: ${webhookResponse.status}`);
          }

          console.log("Webhook n8n chamado com sucesso para interação:", scheduledInteraction.id);

          await supabase
            .from("scheduled_interactions")
            .update({
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", scheduledInteraction.id);

          await supabase
            .from("leads")
            .update({
              status: "conversation_started",
              whatsapp_verified: true,
              ai_interaction_id: scheduledInteraction.ai_interaction_id,
            })
            .eq("id", scheduledInteraction.lead_id);

          successCount++;
        } else {
          console.log("Nenhum webhook n8n configurado para a organização");
          throw new Error("Webhook n8n não configurado para a organização");
        }
      } catch (error: any) {
        console.error(`Erro ao processar interação ${scheduledInteraction.id}:`, error);

        await supabase
          .from("scheduled_interactions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", scheduledInteraction.id);

        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Processamento concluído",
        processed: scheduledInteractions.length,
        success: successCount,
        errors: errorCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro em process-scheduled-interactions:", error);

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
        processed: 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

