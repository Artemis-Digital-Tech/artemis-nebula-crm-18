import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Phone, Clock, DollarSign, CheckCircle, MessageCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { formatWhatsAppNumber, formatPhoneDisplay, cleanPhoneNumber } from "@/lib/utils";
import { MessagePreviewDialog } from "@/components/MessagePreviewDialog";

type Lead = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  contact_email: string | null;
  contact_whatsapp: string | null;
  source: string | null;
  integration_start_time: string | null;
  payment_link_url: string | null;
  payment_status: string;
  payment_amount: number | null;
  paid_at: string | null;
  created_at: string;
  remote_jid: string | null;
  whatsapp_verified?: boolean;
};

export const LeadCard = ({
  lead,
  isDraggable = false,
  onLeadUpdate,
  onClick,
  compact = false,
}: {
  lead: Lead;
  isDraggable?: boolean;
  onLeadUpdate?: (updatedLead: Lead) => void;
  onClick?: (lead: Lead) => void;
  compact?: boolean;
}) => {
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>();
  const [previewSettings, setPreviewSettings] = useState<any>(null);
  const [previewInstanceName, setPreviewInstanceName] = useState<string | null>(null);
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);
  const [isValidatingWhatsApp, setIsValidatingWhatsApp] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    disabled: !isDraggable,
  });

  const { className: _, ...attributesWithoutClassName } = attributes || {};

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleShowPreview = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      if (!lead.contact_whatsapp) {
        toast.error("Lead não possui WhatsApp");
        return;
      }

      // Busca as configurações do webhook e mensagem padrão
      const { data: settings } = await supabase
        .from("settings")
        .select("n8n_webhook_url, default_message, default_image_url")
        .maybeSingle();

      // Busca todas as instâncias conectadas do WhatsApp
      const { data: whatsappInstances, error: instancesError } = await supabase
        .from("whatsapp_instances")
        .select("id, instance_name, phone_number, status")
        .eq("status", "connected")
        .order("created_at", { ascending: false });

      if (instancesError) {
        throw instancesError;
      }

      if (!whatsappInstances || whatsappInstances.length === 0) {
        toast.error("Nenhuma instância WhatsApp conectada. Configure em WhatsApp > Conectar", {
          duration: 5000,
          action: {
            label: "Configurar",
            onClick: () => {
              window.location.href = "/whatsapp";
            },
          },
        });
        return;
      }

      setAvailableInstances(whatsappInstances);

      // Usa mensagem e imagem configuradas ou fallback para as padrões
      const message = settings?.default_message || `👋 Oi! Tudo bem?
Aqui é a equipe da Artemis Digital Solutions e temos uma oferta especial de Black Friday para impulsionar suas vendas e organizar seu atendimento nesse período de alta demanda.

🤖 O que é um chatbot?

É um assistente virtual que responde automaticamente seus clientes 24h por dia, mesmo quando você está ocupado, offline ou atendendo outras pessoas.
Ele responde dúvidas, coleta informações, organiza pedidos e direciona atendimentos — tudo sem você precisar tocar no celular.

🚀 Vantagens para o seu negócio

✔ Atendimento 24h
Nunca mais perca vendas por falta de resposta.

✔ Respostas instantâneas ⚡
Informações rápidas sobre preços, horários, serviços, catálogo, agenda e muito mais.

✔ Adeus acúmulo de mensagens 📥
O chatbot filtra, organiza e prioriza atendimentos.

✔ Mais profissionalismo 💼
Seu negócio transmite agilidade, organização e confiança.

✔ Perfeito para a Black Friday 🖤
Ele absorve o alto volume de mensagens e evita gargalos no atendimento.

✔ Captura e organiza leads 🔥
Coleta nome, WhatsApp, interesse e entrega tudo prontinho para você.

Se quiser saber mais, é só acessar:
🌐 www.artemisdigital.tech`;

      const imageUrl = settings?.default_image_url && settings.default_image_url.startsWith('http')
        ? settings.default_image_url
        : undefined;

      // Armazena dados para uso posterior na confirmação
      setPreviewMessage(message);
      setPreviewImageUrl(imageUrl);
      setPreviewSettings(settings);
      // Define a primeira instância como padrão se houver apenas uma, caso contrário será selecionada pelo usuário
      setPreviewInstanceName(whatsappInstances.length === 1 ? whatsappInstances[0].instance_name : null);
      setShowPreview(true);
    } catch (error: any) {
      toast.error("Erro ao carregar preview da mensagem");
      console.error(error);
    }
  };

  const handleConfirmSend = async () => {
    setIsStartingConversation(true);
    setShowPreview(false);

    try {
      if (!lead.contact_whatsapp || !previewInstanceName) {
        toast.error("Dados insuficientes para enviar mensagem");
        setIsStartingConversation(false);
        return;
      }

      if (!lead.remote_jid) {
        toast.error("Lead não possui remoteJid válido. Por favor, recrie o lead.");
        setIsStartingConversation(false);
        return;
      }

      const remoteJid = lead.remote_jid;

      // Envia a mensagem primeiro
      const { data: sendData, error: sendError } = await supabase.functions.invoke("evolution-send-message", {
        body: {
          instanceName: previewInstanceName,
          remoteJid,
          message: previewMessage,
          imageUrl: previewImageUrl
        }
      });

      // Verifica se há erro na resposta da função
      if (sendError) {
        console.error("Erro ao enviar mensagem:", sendError);
        const errorMessage = sendError.message || "Erro ao enviar mensagem";
        toast.error(errorMessage);
        setIsStartingConversation(false);
        return;
      }

      // Verifica se a resposta contém um erro
      if (sendData && typeof sendData === 'object' && 'error' in sendData) {
        const errorMessage = (sendData as any).error || "Erro ao enviar mensagem";
        console.error("Erro na resposta da função:", errorMessage);
        toast.error(errorMessage);
        setIsStartingConversation(false);
        return;
      }

      // Só atualiza o status se o envio foi bem-sucedido
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          status: "conversa_iniciada",
          whatsapp_verified: true
        })
        .eq("id", lead.id);

      if (updateError) {
        console.error("Erro ao atualizar status do lead:", updateError);
        toast.error("Mensagem enviada, mas houve erro ao atualizar o status do lead");
        setIsStartingConversation(false);
        return;
      }

      // Atualiza o lead localmente
      const updatedLead = { ...lead, status: "conversa_iniciada", whatsapp_verified: true };
      if (onLeadUpdate) {
        onLeadUpdate(updatedLead);
      }

      // Se há webhook configurado, envia os dados
      if (previewSettings?.n8n_webhook_url) {
        try {
          await fetch(previewSettings.n8n_webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId: lead.id,
              name: lead.name,
              email: lead.contact_email,
              whatsapp: lead.contact_whatsapp,
              category: lead.category,
              description: lead.description,
              action: "start_conversation"
            })
          });
        } catch (webhookError) {
          console.error("Erro ao enviar webhook:", webhookError);
        }
      }

      toast.success("Conversa iniciada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao iniciar conversa:", error);
      const errorMessage = error?.message || "Erro ao iniciar conversa";
      toast.error(errorMessage);
    } finally {
      setIsStartingConversation(false);
    }
  };

  const canStartConversation = lead.status === "novo" && (lead.contact_whatsapp || lead.contact_email);
  const needsWhatsAppValidation = lead.contact_whatsapp && (!lead.remote_jid || !lead.whatsapp_verified);

  const handleValidateWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!lead.contact_whatsapp) {
      toast.error("Lead não possui número de WhatsApp");
      return;
    }

    setIsValidatingWhatsApp(true);

    try {
      const cleanedPhone = cleanPhoneNumber(lead.contact_whatsapp);

      const { data: checkData, error: checkError } = await supabase.functions.invoke('evolution-check-whatsapp', {
        body: { numbers: [cleanedPhone] }
      });

      if (checkError) {
        console.error("Error checking WhatsApp:", checkError);

        const isNoInstanceError = checkError.message?.includes("No connected WhatsApp instance") ||
          checkError.message?.includes("connected WhatsApp instance");

        if (isNoInstanceError) {
          toast.error("Nenhuma instância WhatsApp conectada. Configure em WhatsApp > Conectar", {
            duration: 5000,
            action: {
              label: "Configurar",
              onClick: () => navigate("/whatsapp"),
            },
          });
          setIsValidatingWhatsApp(false);
          return;
        }

        toast.error("Erro ao validar WhatsApp: " + (checkError.message || "Erro desconhecido"));
        setIsValidatingWhatsApp(false);
        return;
      }

      if (checkData?.results?.[0]?.exists && checkData.results[0].jid) {
        const remoteJid = checkData.results[0].jid;

        const { error: updateError } = await supabase
          .from("leads")
          .update({
            remote_jid: remoteJid,
            whatsapp_verified: true
          })
          .eq("id", lead.id);

        if (updateError) {
          console.error("Error updating lead:", updateError);
          toast.error("Erro ao atualizar lead");
          setIsValidatingWhatsApp(false);
          return;
        }

        const updatedLead = { ...lead, remote_jid: remoteJid, whatsapp_verified: true };
        if (onLeadUpdate) {
          onLeadUpdate(updatedLead);
        }

        toast.success("WhatsApp validado com sucesso! ✅ Agora é possível agendar interações.");
      } else {
        toast.warning("Este número não está registrado no WhatsApp. Verifique se o número está correto.");
      }
    } catch (error: any) {
      console.error("Error validating WhatsApp:", error);
      toast.error("Erro ao validar WhatsApp: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsValidatingWhatsApp(false);
    }
  };

  if (compact) {
    return (
      <Card
        ref={setNodeRef}
        style={style}
        {...attributesWithoutClassName}
        {...listeners}
        className="p-3 cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group min-w-0 w-full overflow-hidden max-h-[100px] flex flex-col"
        onClick={() => {
          if (!isDragging && onClick) {
            onClick(lead);
          }
        }}
      >
        <div className="flex flex-col gap-1.5 min-h-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate cursor-default">
                  {lead.name}
                </h3>
              </TooltipTrigger>
              <TooltipContent>
                <p>{lead.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={lead.status as any} />
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributesWithoutClassName}
      {...listeners}
      className="p-5 cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 group min-w-0 w-full overflow-hidden h-full flex flex-col"
      onClick={() => {
        if (!isDragging && onClick) {
          onClick(lead);
        }
      }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="mb-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors break-words leading-tight line-clamp-2 cursor-default">
                  {lead.name}
                </h3>
              </TooltipTrigger>
              <TooltipContent>
                <p>{lead.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="mt-2">
            <StatusBadge status={lead.status as any} />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="space-y-3">
            {lead.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 break-words overflow-hidden">{lead.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {lead.category && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-xs font-medium break-all">
                  {lead.category}
                </span>
              )}
              {lead.source && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs break-all">
                  {lead.source}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 text-sm text-muted-foreground">
              {lead.contact_email && (
                <a
                  href={`mailto:${lead.contact_email}`}
                  className="flex items-center gap-1 hover:text-primary transition-colors min-w-0 flex-1 sm:flex-initial"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="break-all min-w-0">{lead.contact_email}</span>
                </a>
              )}
              {lead.contact_whatsapp && (
                <a
                  href={`https://wa.me/${formatWhatsAppNumber(lead.contact_whatsapp)}?text=${encodeURIComponent(`Olá ${lead.name}! Tudo bem?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors min-w-0 flex-1 sm:flex-initial"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span className="break-all min-w-0">{formatPhoneDisplay(lead.contact_whatsapp)}</span>
                </a>
              )}
            </div>

            {lead.payment_amount && (
              <div className="flex flex-col p-2.5 bg-accent/10 rounded-md gap-1 min-w-0">
                <span className="text-sm font-medium text-muted-foreground">Valor da Proposta:</span>
                <span className="text-lg font-bold text-accent">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(lead.payment_amount)}
                </span>
              </div>
            )}

            {lead.status === "pago" && lead.paid_at && (
              <div className="flex items-center gap-2 p-2.5 bg-status-pago/10 rounded-md">
                <CheckCircle className="w-4 h-4 text-status-pago flex-shrink-0" />
                <span className="text-xs text-status-pago break-words min-w-0">
                  Pago em {format(new Date(lead.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          {(needsWhatsAppValidation || canStartConversation) && (
            <div className="mt-auto pt-4 space-y-2">
              {needsWhatsAppValidation && (
                <Button
                  onClick={handleValidateWhatsApp}
                  disabled={isValidatingWhatsApp}
                  variant="outline"
                  className="w-full gap-2 border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isValidatingWhatsApp ? "animate-spin" : ""}`} />
                  {isValidatingWhatsApp ? "Validando..." : "Validar WhatsApp"}
                </Button>
              )}

              {canStartConversation && (
                <>
                  <Button
                    onClick={handleShowPreview}
                    disabled={isStartingConversation}
                    className="w-full gap-2"
                    size="sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Iniciar Conversa
                  </Button>
                  <MessagePreviewDialog
                    open={showPreview}
                    onOpenChange={setShowPreview}
                    onConfirm={handleConfirmSend}
                    message={previewMessage}
                    imageUrl={previewImageUrl}
                    leadName={lead.name}
                    isLoading={isStartingConversation}
                    instances={availableInstances}
                    selectedInstanceName={previewInstanceName}
                    onInstanceChange={setPreviewInstanceName}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 mt-4 border-t border-border/50 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="whitespace-nowrap">{format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
          {lead.payment_status !== "nao_criado" && (
            <div className="flex items-center gap-1 text-accent min-w-0">
              <DollarSign className="w-3 h-3 flex-shrink-0" />
              <span className="capitalize truncate">{lead.payment_status.replace("_", " ")}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
