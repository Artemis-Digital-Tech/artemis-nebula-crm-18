import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, referer, user-agent',
  'Access-Control-Max-Age': '86400',
};

interface WebhookMessage {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      senderPn?: string;
    };
    message?: any;
    pushName?: string;
  };
}

const normalizePhoneNumber = (phone: string): string => {
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
};

const resolveLeadAiInteractionId = async ({
  supabase,
  organizationId,
  instanceName,
  lead,
}: {
  supabase: any;
  organizationId: string;
  instanceName: string | null;
  lead: any;
}): Promise<string | null> => {
  if (lead?.ai_interaction_id) {
    return lead.ai_interaction_id;
  }

  if (lead?.id && instanceName) {
    const { data: activeScheduledInteraction } = await supabase
      .from('scheduled_interactions')
      .select('ai_interaction_id')
      .eq('lead_id', lead.id)
      .eq('instance_name', instanceName)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeScheduledInteraction?.ai_interaction_id) {
      return activeScheduledInteraction.ai_interaction_id;
    }
  }

  if (instanceName) {
    const { data: whatsappInstance } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('instance_name', instanceName)
      .maybeSingle();

    if (whatsappInstance?.id) {
      const { data: whatsappComponent } = await supabase
        .from('components')
        .select('id')
        .eq('identifier', 'whatsapp_integration')
        .maybeSingle();

      if (whatsappComponent?.id) {
        const { data: integrationConfig } = await supabase
          .from('agent_component_configurations')
          .select('agent_id')
          .eq('component_id', whatsappComponent.id)
          .contains('config', { whatsapp_instance_id: whatsappInstance.id })
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (integrationConfig?.agent_id) {
          return integrationConfig.agent_id;
        }
      }
    }
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('default_ai_interaction_id')
    .eq('organization_id', organizationId)
    .maybeSingle();

  return settings?.default_ai_interaction_id || null;
};

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }

  console.log('Evolution webhook received');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || null;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: any = await req.json();
    
    // Extrair token do header Authorization se existir (formato: "Bearer {token}")
    const authHeader = req.headers.get('Authorization');
    let accessToken: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.replace('Bearer ', '');
    } else if (authHeader) {
      // Se vier sem "Bearer ", usar direto
      accessToken = authHeader;
    } else {
      // Fallback: usar anon key (formato esperado pelas outras rotas)
      accessToken = supabaseAnonKey;
    }
    const instanceName =
      payload.instance ||
      payload.instanceName ||
      payload.data?.instance ||
      payload.data?.instanceName ||
      payload.session ||
      payload.data?.session ||
      payload.data?.id ||
      payload.data?.name;
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));


    if (payload.event === 'connection.update' || payload.event === 'CONNECTION_UPDATE') {
      const connectionState = payload.data?.state || payload.data?.connection || payload.connection || payload.state;

      console.log('Connection update event received', {
        event: payload.event,
        connectionState,
        instance: instanceName,
        payloadKeys: Object.keys(payload),
        dataKeys: payload.data ? Object.keys(payload.data) : null
      });

      if (connectionState === 'open' || connectionState === 'connected') {
        let phoneNumber: string | null = null;
        let whatsappJid: string | null = null;

        const possiblePaths = [
          payload.data?.wuid,
          payload.sender,
          payload.data?.user?.id,
          payload.data?.user?.jid,
          payload.data?.jid,
          payload.user?.id,
          payload.user?.jid,
          payload.data?.user,
          payload.data?.owner,
          payload.owner,
          payload.instance?.owner,
          payload.data?.instance?.owner
        ];

        for (const path of possiblePaths) {
          if (path) {
            if (typeof path === 'string') {
              whatsappJid = path;
              phoneNumber = path.split('@')[0];
              break;
            } else if (path && typeof path === 'object' && path.id) {
              whatsappJid = path.id;
              phoneNumber = path.id.split('@')[0];
              break;
            } else if (path && typeof path === 'object' && path.jid) {
              whatsappJid = path.jid;
              phoneNumber = path.jid.split('@')[0];
              break;
            }
          }
        }

        console.log('Extracted phone number from connection update:', phoneNumber);
        console.log('Extracted WhatsApp JID:', whatsappJid);

        if (phoneNumber) {
          const cleanedPhone = normalizePhoneNumber(phoneNumber);

          if (cleanedPhone.length >= 10) {
            console.log('Updating instance with phone number:', cleanedPhone, 'and JID:', whatsappJid, 'for instance:', instanceName);

            const { data: existingInstance } = await supabase
              .from('whatsapp_instances')
              .select('id, instance_name')
              .eq('instance_name', instanceName)
              .single();

            if (!existingInstance) {
              console.error('Instance not found for update');
              return new Response(
                JSON.stringify({ success: true, message: 'Instance not found' }),
                {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }

            const { data: duplicateByPhone } = await supabase
              .from('whatsapp_instances')
              .select('id, instance_name')
              .eq('phone_number', cleanedPhone)
              .neq('id', existingInstance.id)
              .maybeSingle();

            if (duplicateByPhone) {
              console.error('Duplicate instance found with same phone number:', duplicateByPhone.instance_name);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: `Já existe uma instância conectada com este número de WhatsApp: ${duplicateByPhone.instance_name}`
                }),
                {
                  status: 409,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }

            if (whatsappJid) {
              const { data: duplicateByJid } = await supabase
                .from('whatsapp_instances')
                .select('id, instance_name')
                .eq('whatsapp_jid', whatsappJid)
                .neq('id', existingInstance.id)
                .maybeSingle();

              if (duplicateByJid) {
                console.error('Duplicate instance found with same JID:', duplicateByJid.instance_name);
                return new Response(
                  JSON.stringify({
                    success: false,
                    error: `Já existe uma instância conectada com este WhatsApp JID: ${duplicateByJid.instance_name}`
                  }),
                  {
                    status: 409,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                  }
                );
              }
            }

            const updateData: any = {
              phone_number: cleanedPhone,
              status: 'connected',
              connected_at: new Date().toISOString(),
              qr_code: null,
            };

            if (whatsappJid) {
              updateData.whatsapp_jid = whatsappJid;
            }

            const { error: updateError } = await supabase
              .from('whatsapp_instances')
              .update(updateData)
              .eq('instance_name', instanceName);

            if (updateError) {
              console.error('Error updating instance phone number:', updateError);
            } else {
              console.log('Instance phone number updated successfully:', cleanedPhone);
            }
          } else {
            console.warn('Phone number too short after cleaning:', cleanedPhone);
          }
        } else {
          console.warn('Could not extract phone number from connection update payload');
          if (instanceName) {
            const { error: statusOnlyError } = await supabase
              .from('whatsapp_instances')
              .update({
                status: 'connected',
                connected_at: new Date().toISOString(),
                qr_code: null,
              })
              .eq('instance_name', instanceName);
            if (statusOnlyError) {
              console.error('Error updating status without phone:', statusOnlyError);
            }
          }
        }
      }

      if (connectionState && connectionState !== 'open' && connectionState !== 'connected') {
        if (instanceName) {
          const { error: statusUpdateError } = await supabase
            .from('whatsapp_instances')
            .update({
              status: connectionState === 'close' || connectionState === 'closed' ? 'disconnected' : connectionState,
              phone_number: connectionState === 'close' || connectionState === 'closed' ? null : undefined,
              whatsapp_jid: connectionState === 'close' || connectionState === 'closed' ? null : undefined,
              connected_at: connectionState === 'close' || connectionState === 'closed' ? null : undefined,
              qr_code: null,
            })
            .eq('instance_name', instanceName);
          if (statusUpdateError) {
            console.error('Error updating status for non-open state:', statusUpdateError);
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Connection update processed' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }


    if (payload.event !== 'messages.upsert' || payload.data?.key?.fromMe) {
      console.log('Ignoring event:', payload.event, 'fromMe:', payload.data?.key?.fromMe);
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }


    const remoteJid = payload.data?.key?.remoteJid;
    const senderPn = payload.data?.key?.senderPn;

    let phoneNumber: string;


    if (senderPn && typeof senderPn === 'string') {
      phoneNumber = senderPn.split('@')[0];
    } else {
      phoneNumber = remoteJid.split('@')[0];
    }

    phoneNumber = normalizePhoneNumber(phoneNumber);

    if (phoneNumber.length < 10) {
      console.log('Invalid phone number format:', phoneNumber);
      return new Response(
        JSON.stringify({ message: 'Invalid phone number format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const contactName = payload.data?.pushName || '';

    console.log('Processing message from:', phoneNumber, 'name:', contactName, 'remoteJid:', remoteJid, 'senderPn:', senderPn);


    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('organization_id')
      .eq('instance_name', instanceName)
      .single();

    if (instanceError || !instance) {
      console.error('Instance not found:', instanceError);
      return new Response(
        JSON.stringify({ error: 'Instance not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }


    const { data: existingLead, error: findError } = await supabase
      .from('leads')
      .select('*')
      .eq('contact_whatsapp', phoneNumber)
      .eq('organization_id', instance.organization_id)
      .maybeSingle();

    if (findError) {
      console.error('Error finding lead:', findError);
      throw findError;
    }

    let leadId: string | undefined;
    let lead: any = null;

    if (existingLead) {

      console.log('Updating existing lead:', existingLead.id);
      leadId = existingLead.id;

      const updateData: any = {
        status: 'conversation_started',
        remote_jid: remoteJid,
      };


      if (contactName && !existingLead.name) {
        updateData.name = contactName;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Error updating lead:', updateError);
        throw updateError;
      }

      console.log('Lead updated successfully');
    } else {

      console.log('Creating new lead for:', phoneNumber);

      const preResolvedAiInteractionId = await resolveLeadAiInteractionId({
        supabase,
        organizationId: instance.organization_id,
        instanceName: instanceName || null,
        lead: null,
      });

      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          name: contactName || `Lead ${phoneNumber}`,
          contact_whatsapp: phoneNumber,
          status: 'conversation_started',
          organization_id: instance.organization_id,
          whatsapp_verified: true,
          source: 'whatsapp',
          remote_jid: remoteJid,
          ai_interaction_id: preResolvedAiInteractionId,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating lead:', insertError);
        throw insertError;
      }

      if (!newLead) {
        throw new Error('Failed to create lead: no data returned');
      }

      leadId = newLead.id;
      lead = newLead;

      console.log('Lead created successfully');
    }

    if (!lead && leadId !== undefined) {
      const { data: fetchedLead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!fetchError && fetchedLead) {
        lead = fetchedLead;
      }
    }

    if (lead) {
      const resolvedAiInteractionId = await resolveLeadAiInteractionId({
        supabase,
        organizationId: instance.organization_id,
        instanceName: instanceName || null,
        lead,
      });

      if (resolvedAiInteractionId && lead.ai_interaction_id !== resolvedAiInteractionId) {
        const { error: leadAiUpdateError } = await supabase
          .from('leads')
          .update({ ai_interaction_id: resolvedAiInteractionId })
          .eq('id', lead.id);

        if (!leadAiUpdateError) {
          lead.ai_interaction_id = resolvedAiInteractionId;
        } else {
          console.error('Error updating lead ai_interaction_id:', leadAiUpdateError);
        }
      }
    }

    const messageType = payload.data?.messageType || null;
    const conversation = payload.data?.message?.conversation || null;
    const messageId = payload.data?.key?.id || null;
    const fromMe = payload.data?.key?.fromMe || false;

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', instance.organization_id)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
    }

    let aiConfig = null;
    let aiInteractionId: string | null = null;
    let agentComponents: any[] = [];
    let agentComponentConfigurations: any[] = [];

    if (lead) {
      aiInteractionId = lead.ai_interaction_id || null;

      if (aiInteractionId) {
        const { data: aiInteraction, error: aiError } = await supabase
          .from('ai_interaction_settings')
          .select('*')
          .eq('id', aiInteractionId)
          .eq('organization_id', instance.organization_id)
          .maybeSingle();

        if (!aiError && aiInteraction) {
          aiConfig = aiInteraction;
          console.log('AI config loaded with all fields:', {
            id: aiInteraction.id,
            name: aiInteraction.name,
            hasPersonalityTraits: !!aiInteraction.personality_traits,
            communicationStyle: aiInteraction.communication_style,
            expertiseLevel: aiInteraction.expertise_level,
            agentColor: aiInteraction.agent_color,
            agentDescription: aiInteraction.agent_description,
            empathyLevel: aiInteraction.empathy_level,
            formalityLevel: aiInteraction.formality_level,
            humorLevel: aiInteraction.humor_level,
            proactivityLevel: aiInteraction.proactivity_level,
            responseLength: aiInteraction.response_length,
          });
          console.log('Full AI config object:', JSON.stringify(aiConfig, null, 2));

          const { data: components, error: componentsError } = await supabase
            .from('agent_components')
            .select(`
              id,
              agent_id,
              component_id,
              created_at,
              components(*)
            `)
            .eq('agent_id', aiInteractionId);

          if (!componentsError && components) {
            agentComponents = components;
            console.log('Agent components loaded:', components.length);
          } else if (componentsError) {
            console.error('Error loading agent components:', componentsError);
          }

          const { data: configurations, error: configsError } = await supabase
            .from('agent_component_configurations')
            .select(`
              id,
              agent_id,
              component_id,
              config,
              created_at,
              updated_at,
              components(*)
            `)
            .eq('agent_id', aiInteractionId);

          if (!configsError && configurations) {
            agentComponentConfigurations = configurations;
            console.log('Agent component configurations loaded:', configurations.length);
          } else if (configsError) {
            console.error('Error loading agent component configurations:', configsError);
          }
        } else if (aiError) {
          console.error('Error loading AI config:', aiError);
        }
      }
    }

    // Buscar status personalizados da organização
    let leadStatuses: any[] = [];
    const { data: statusesData, error: statusesError } = await supabase
      .from('lead_statuses')
      .select('*')
      .eq('organization_id', instance.organization_id)
      .order('display_order', { ascending: true });

    if (!statusesError && statusesData) {
      // Ordenar conforme a lógica: obrigatórios primeiro (exceto finished), depois customizados, depois finished
      const finishedStatus = statusesData.find((s: any) => s.status_key === 'finished');
      const requiredStatuses = statusesData.filter((s: any) => s.is_required && s.status_key !== 'finished');
      const customStatuses = statusesData.filter((s: any) => !s.is_required && s.status_key !== 'finished');

      const sortedRequiredStatuses = requiredStatuses.sort((a: any, b: any) => a.display_order - b.display_order);
      const sortedCustomStatuses = customStatuses.sort((a: any, b: any) => a.display_order - b.display_order);

      if (finishedStatus) {
        leadStatuses = [...sortedRequiredStatuses, ...sortedCustomStatuses, finishedStatus];
      } else {
        leadStatuses = [...sortedRequiredStatuses, ...sortedCustomStatuses];
      }
    }

    let organizationProducts: any[] = [];
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select(
        'id, name, category, description, price, currency, features, target_audience, use_cases, differentiators, tags',
      )
      .eq('organization_id', instance.organization_id)
      .eq('is_active', true)
      .order('name');

    if (!productsError && productsData) {
      organizationProducts = productsData;
    }

    const responseData = {
      success: true,
      message: 'Lead processed',
      lead: lead || null,
      organization: organization || null,
      ai_config: aiConfig,
      agent_components: agentComponents,
      agent_component_configurations: agentComponentConfigurations,
      lead_statuses: leadStatuses,
      organization_products: organizationProducts,
      messageType: messageType,
      conversation: conversation,
      messageId: messageId,
      fromMe: fromMe,
      access_token: accessToken,
      evolution: {
        apikey: payload.apikey || null,
        serverUrl: payload.server_url || null,
        instance: payload.instance || null
      }
    };

    if (lead) {
      const { data: settings } = await supabase
        .from('settings')
        .select('n8n_webhook_url')
        .eq('organization_id', instance.organization_id)
        .maybeSingle();

      if (settings?.n8n_webhook_url) {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Adicionar token de acesso se disponível
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        fetch(settings.n8n_webhook_url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event: payload.event,
            instance: payload.instance,
            lead: lead,
            organization: organization,
            ai_config: aiConfig,
            agent_components: agentComponents,
            agent_component_configurations: agentComponentConfigurations,
            lead_statuses: leadStatuses,
            organization_products: organizationProducts,
            message: payload.data?.message,
            messageType: messageType,
            conversation: conversation,
            messageId: messageId,
            contactName: contactName,
            phoneNumber: phoneNumber,
            remoteJid: remoteJid,
            fromMe: fromMe,
            access_token: accessToken,
            evolution: {
              apikey: payload.apikey || null,
              serverUrl: payload.server_url || null,
              instance: payload.instance || null
            },
            timestamp: new Date().toISOString(),
          }),
        })
          .then((response) => {
            if (!response.ok) {
              console.error('n8n webhook returned error:', response.status, response.statusText);
            } else {
              console.log('n8n webhook called successfully');
            }
          })
          .catch((error) => {
            console.error('Error calling n8n webhook:', error);
          });
      } else {
        console.log('No n8n webhook URL configured for organization');
      }
    }

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
