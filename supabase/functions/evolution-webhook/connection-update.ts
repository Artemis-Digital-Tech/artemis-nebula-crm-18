/**
 * Handler dos eventos de atualização de conexão da Evolution (`connection.update`).
 *
 * @module connection-update
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { jsonResponse } from './http.ts';
import { normalizePhoneNumber } from './phone.ts';
import { extractConnectionState, extractPhoneAndJidFromConnectionPayload } from './payload.ts';

type PayloadRecord = Record<string, unknown>;

function isOpenConnectionState(state: unknown): boolean {
  return state === 'open' || state === 'connected';
}

function isClosedConnectionState(state: unknown): boolean {
  return state === 'close' || state === 'closed';
}

/**
 * Processa eventos `connection.update` / `CONNECTION_UPDATE`: atualiza `whatsapp_instances`
 * (telefone, JID, status, QR limpo) e trata conflitos de número/JID duplicados (HTTP 409).
 *
 * @param supabase — Cliente com service role.
 * @param payload — Corpo bruto do webhook.
 * @param instanceName — Nome da instância (chave em `whatsapp_instances.instance_name`).
 * @returns Resposta JSON final do branch de conexão (sempre 200 no sucesso lógico, exceto 409 em duplicidade).
 */
export async function handleConnectionUpdate(
  supabase: SupabaseClient,
  payload: PayloadRecord,
  instanceName: string | undefined,
): Promise<Response> {
  const connectionState = extractConnectionState(payload);

  console.log('Connection update event received', {
    event: payload.event,
    connectionState,
    instance: instanceName,
    payloadKeys: Object.keys(payload),
    dataKeys: payload.data && typeof payload.data === 'object' ? Object.keys(payload.data as object) : null,
  });

  if (isOpenConnectionState(connectionState)) {
    const { phoneNumber, whatsappJid } = extractPhoneAndJidFromConnectionPayload(payload);

    console.log('Extracted phone number from connection update:', phoneNumber);
    console.log('Extracted WhatsApp JID:', whatsappJid);

    if (phoneNumber) {
      const cleanedPhone = normalizePhoneNumber(phoneNumber);

      if (cleanedPhone.length >= 10) {
        console.log(
          'Updating instance with phone number:',
          cleanedPhone,
          'and JID:',
          whatsappJid,
          'for instance:',
          instanceName,
        );

        const { data: existingInstance } = await supabase
          .from('whatsapp_instances')
          .select('id, instance_name')
          .eq('instance_name', instanceName)
          .single();

        if (!existingInstance) {
          console.error('Instance not found for update');
          return jsonResponse({ success: true, message: 'Instance not found' }, 200);
        }

        const { data: duplicateByPhone } = await supabase
          .from('whatsapp_instances')
          .select('id, instance_name')
          .eq('phone_number', cleanedPhone)
          .neq('id', existingInstance.id)
          .maybeSingle();

        if (duplicateByPhone) {
          console.error('Duplicate instance found with same phone number:', duplicateByPhone.instance_name);
          return jsonResponse(
            {
              success: false,
              error: `Já existe uma instância conectada com este número de WhatsApp: ${duplicateByPhone.instance_name}`,
            },
            409,
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
            return jsonResponse(
              {
                success: false,
                error: `Já existe uma instância conectada com este WhatsApp JID: ${duplicateByJid.instance_name}`,
              },
              409,
            );
          }
        }

        const updateData: Record<string, unknown> = {
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

  if (connectionState && !isOpenConnectionState(connectionState) && instanceName) {
    const { error: statusUpdateError } = await supabase
      .from('whatsapp_instances')
      .update({
        status: isClosedConnectionState(connectionState) ? 'disconnected' : connectionState,
        phone_number: isClosedConnectionState(connectionState) ? null : undefined,
        whatsapp_jid: isClosedConnectionState(connectionState) ? null : undefined,
        connected_at: isClosedConnectionState(connectionState) ? null : undefined,
        qr_code: null,
      })
      .eq('instance_name', instanceName);
    if (statusUpdateError) {
      console.error('Error updating status for non-open state:', statusUpdateError);
    }
  }

  return jsonResponse({ success: true, message: 'Connection update processed' }, 200);
}
