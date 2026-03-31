UPDATE public.lead_statuses
SET ai_transition_condition = 'A IA não deve mover o lead para este status: novos leads já nascem em Novo. Trate Novo apenas como estágio atual antes da primeira transição.'
WHERE organization_id = 'ef3a1c6c-19b1-4e8a-b708-e9ddb5394a1b'
  AND status_key = 'new';

UPDATE public.lead_statuses
SET ai_transition_condition = 'Atualize para Conversa Iniciada quando o status atual do lead for new e houver primeira troca mensurável: o lead enviou qualquer mensagem neste canal (inclui cumprimentos como "oi" ou "olá"), ou você enviou a primeira mensagem ao lead (ex.: prospecção ou interação agendada). Uma vez que o lead já não está em new, não volte a usar este status.'
WHERE organization_id = 'ef3a1c6c-19b1-4e8a-b708-e9ddb5394a1b'
  AND status_key = 'conversation_started';

UPDATE public.lead_statuses
SET ai_transition_condition = 'Atualize para Proposta Enviada somente depois que proposta, orçamento ou documento comercial equivalente foi de fato entregue ao lead (ex.: envio por e-mail registrado ou canal oficial) ou o lead confirma explicitamente que recebeu a proposta. Não avance apenas porque perguntou preço ou demonstrou curiosidade: nesses casos permaneça em conversa até existir envio ou confirmação de recebimento.'
WHERE organization_id = 'ef3a1c6c-19b1-4e8a-b708-e9ddb5394a1b'
  AND status_key = 'proposal_sent';

UPDATE public.lead_statuses
SET ai_transition_condition = 'Atualize para Reunião Agendada quando data e horário de reunião, demonstração ou call foram acordados de forma explícita pelo lead (compromisso concreto), idealmente após confirmação de agenda ou uso bem-sucedido do agendador. Não use para interesse vago ("vamos marcar", "depois te falo") sem data e hora definidos.'
WHERE organization_id = 'ef3a1c6c-19b1-4e8a-b708-e9ddb5394a1b'
  AND status_key = 'meeting_scheduled';

UPDATE public.lead_statuses
SET ai_transition_condition = 'Atualize para Finalizado quando o funil deste lead está encerrado: venda ou contrato confirmado; lead declara sem ambiguidade que não tem interesse ou pede encerramento; ou acordo explícito de encerrar o atendimento comercial. Não use só por pausa na conversa sem decisão.'
WHERE organization_id = 'ef3a1c6c-19b1-4e8a-b708-e9ddb5394a1b'
  AND status_key = 'finished';
