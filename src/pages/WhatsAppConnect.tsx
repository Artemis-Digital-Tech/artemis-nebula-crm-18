import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Smartphone,
  QrCode,
  CheckCircle2,
  Trash2,
  RefreshCw,
  MessageCircle,
  Zap,
  Star,
  Heart,
  Rocket,
  Crown,
  Sparkles,
  Trophy,
  Gem,
  Flame,
  Sun,
  Moon,
  Cloud,
  Leaf,
  AlertCircle,
  Bot,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/hooks/useOrganization";
import { whatsappInstanceAgentBindingService } from "@/services/whatsapp/WhatsappInstanceAgentBindingService";

const INSTANCE_ICONS = [
  MessageCircle,
  Zap,
  Star,
  Heart,
  Rocket,
  Crown,
  Sparkles,
  Trophy,
  Gem,
  Flame,
  Sun,
  Moon,
  Cloud,
  Leaf,
];

const getInstanceIcon = (instanceId: string) => {
  let hash = 0;
  for (let i = 0; i < instanceId.length; i++) {
    hash = ((hash << 5) - hash) + instanceId.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % INSTANCE_ICONS.length;
  return INSTANCE_ICONS[index];
};

const WhatsAppConnect = () => {
  const [instanceName, setInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [instanceToDelete, setInstanceToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [orgWhatsappEnabled, setOrgWhatsappEnabled] = useState(false);
  const [boundInstanceIds, setBoundInstanceIds] = useState<string[]>([]);
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [instancePendingBind, setInstancePendingBind] = useState<{
    id: string;
    instance_name: string;
  } | null>(null);
  const [orgAgents, setOrgAgents] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [selectedAgentIdForBind, setSelectedAgentIdForBind] =
    useState<string>("");
  const [bindingAgent, setBindingAgent] = useState(false);

  const refreshBindingMeta = useCallback(async () => {
    if (!organization?.id) {
      setOrgWhatsappEnabled(false);
      setBoundInstanceIds([]);
      return;
    }
    const enabled =
      await whatsappInstanceAgentBindingService.isOrganizationWhatsappAbilityEnabled(
        organization.id,
      );
    setOrgWhatsappEnabled(enabled);
    const bound =
      await whatsappInstanceAgentBindingService.listWhatsappInstanceIdsWithAgentInOrganization(
        organization.id,
      );
    setBoundInstanceIds(Array.from(bound));
  }, [organization?.id]);

  useEffect(() => {
    checkAuth();
    loadInstances();
  }, []);

  useEffect(() => {
    void refreshBindingMeta();
  }, [refreshBindingMeta]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
    }
  };

  const loadInstances = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInstances(data || []);
      await refreshBindingMeta();
    } catch (error: any) {
      console.error("Error loading instances:", error);
    }
  };

  const openBindDialogForInstance = async (inst: {
    id: string;
    instance_name: string;
  }) => {
    if (!organization?.id) {
      return;
    }
    const { data: agents } = await supabase
      .from("ai_interaction_settings")
      .select("id, name")
      .eq("organization_id", organization.id)
      .order("name");
    const list = agents ?? [];
    setOrgAgents(list);
    setSelectedAgentIdForBind(list[0]?.id ?? "");
    setInstancePendingBind(inst);
    setBindDialogOpen(true);
  };

  const submitInstanceAgentBinding = async () => {
    if (!organization?.id || !instancePendingBind || !selectedAgentIdForBind) {
      toast({
        title: "Selecione um agente",
        description: "É necessário escolher um agente para atender esta linha.",
        variant: "destructive",
      });
      return;
    }
    setBindingAgent(true);
    try {
      await whatsappInstanceAgentBindingService.bindWhatsappInstanceToAgent(
        organization.id,
        selectedAgentIdForBind,
        instancePendingBind.id,
      );
      toast({
        title: "Vínculo salvo",
        description: "Esta instância está associada ao agente selecionado.",
      });
      setBindDialogOpen(false);
      setInstancePendingBind(null);
      await refreshBindingMeta();
      await loadInstances();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao vincular agente";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBindingAgent(false);
    }
  };

  const createInstance = async () => {
    if (!instanceName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um nome para a instância",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite de 3 instâncias antes de criar
    if (instances.length >= 3) {
      toast({
        title: "Limite atingido",
        description: "Você já possui 3 instâncias. Delete uma instância existente para criar uma nova.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("evolution-create-instance", {
        body: { instanceName: instanceName.trim() },
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Instância criada com sucesso",
      });

      setInstanceName("");
      await loadInstances();
      setSelectedInstance(data.instance);
    } catch (error: any) {
      console.error("Error creating instance:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar instância",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const connectInstance = async (instance: any) => {
    setIsConnecting(true);
    setSelectedInstance(instance);

    try {
      const { data, error } = await supabase.functions.invoke("evolution-connect-instance", {
        body: { instanceName: instance.instance_name },
      });

      if (error) throw error;

      if (data.qrcode) {
        setQrCode(data.qrcode);
        // Poll for connection status
        startStatusPolling(instance.instance_name);
      }
    } catch (error: any) {
      console.error("Error connecting instance:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao conectar instância",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const reconnectInstance = async (instance: any) => {
    setIsConnecting(true);
    setSelectedInstance(instance);

    try {
      const { data, error } = await supabase.functions.invoke("evolution-connect-instance", {
        body: { instanceName: instance.instance_name },
      });

      if (error) {
        if (error.error) {
          throw new Error(error.error);
        }
        throw error;
      }

      if (data.qrcode) {
        setQrCode(data.qrcode);
        startStatusPolling(instance.instance_name);
        toast({
          title: "Reconectando...",
          description: "Escaneie o novo QR Code para reconectar",
        });
      } else {
        throw new Error("QR Code não recebido");
      }
    } catch (error: any) {
      console.error("Error reconnecting instance:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao reconectar instância",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const startStatusPolling = (instanceName: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("evolution-instance-status", {
          body: { instanceName },
        });

        if (error) {
          if (error.message?.includes("Já existe uma instância conectada")) {
            clearInterval(pollInterval);
            setQrCode(null);
            setIsConnecting(false);
            toast({
              title: "Erro",
              description: error.message || "Já existe uma instância conectada com este número de WhatsApp",
              variant: "destructive",
            });
            await loadInstances();
            return;
          }
          throw error;
        }

        const stateIsOpen = data.status === "open" || data.connected;

        const { data: updatedInstance } = await supabase
          .from("whatsapp_instances")
          .select("id, phone_number, whatsapp_jid, instance_name, status")
          .eq("instance_name", instanceName)
          .single();

        if (!updatedInstance) {
          console.error("Instance not found after connection");
          return;
        }

        const dbConnected = updatedInstance.status === "connected";
        const resolvedConnected = stateIsOpen || dbConnected;

        if (!resolvedConnected) {
          console.log("Instance not marked as connected yet, waiting...");
          return;
        }

        if (updatedInstance?.phone_number || updatedInstance?.whatsapp_jid) {
          const { data: duplicateInstances, error: checkError } = await supabase
            .from("whatsapp_instances")
            .select("instance_name, phone_number, whatsapp_jid")
            .eq("status", "connected")
            .neq("instance_name", instanceName);

          if (!checkError && duplicateInstances) {
            const hasDuplicate = duplicateInstances.some((inst) => {
              if (updatedInstance.phone_number && inst.phone_number === updatedInstance.phone_number) {
                return true;
              }
              if (updatedInstance.whatsapp_jid && inst.whatsapp_jid === updatedInstance.whatsapp_jid) {
                return true;
              }
              return false;
            });

            if (hasDuplicate) {
              const duplicate = duplicateInstances.find(
                (inst) =>
                  (updatedInstance.phone_number && inst.phone_number === updatedInstance.phone_number) ||
                  (updatedInstance.whatsapp_jid && inst.whatsapp_jid === updatedInstance.whatsapp_jid)
              );

              clearInterval(pollInterval);
              setQrCode(null);
              setIsConnecting(false);
              toast({
                title: "Erro",
                description: `Já existe uma instância conectada com este número de WhatsApp: ${duplicate?.instance_name}`,
                variant: "destructive",
              });
              await loadInstances();
              return;
            }
          }
        }

        clearInterval(pollInterval);
        setQrCode(null);
        setIsConnecting(false);
        toast({
          title: "Conectado!",
          description: "WhatsApp conectado com sucesso",
        });
        await loadInstances();

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("organization_id")
              .eq("id", user.id)
              .maybeSingle();
            const orgId = profile?.organization_id;
            if (orgId && updatedInstance.id) {
              const enabled =
                await whatsappInstanceAgentBindingService.isOrganizationWhatsappAbilityEnabled(
                  orgId,
                );
              if (enabled) {
                const bound =
                  await whatsappInstanceAgentBindingService.listWhatsappInstanceIdsWithAgentInOrganization(
                    orgId,
                  );
                if (!bound.has(updatedInstance.id as string)) {
                  const { data: agents } = await supabase
                    .from("ai_interaction_settings")
                    .select("id, name")
                    .eq("organization_id", orgId)
                    .order("name");
                  const list = agents ?? [];
                  setOrgAgents(list);
                  setSelectedAgentIdForBind(list[0]?.id ?? "");
                  setInstancePendingBind({
                    id: updatedInstance.id as string,
                    instance_name: updatedInstance.instance_name,
                  });
                  setBindDialogOpen(true);
                }
              }
            }
          }
        } catch (bindFlowError) {
          console.error("Post-connect bind check failed:", bindFlowError);
        }
      } catch (error: any) {
        if (error.message?.includes("Já existe uma instância conectada")) {
          clearInterval(pollInterval);
          setQrCode(null);
          setIsConnecting(false);
          toast({
            title: "Erro",
            description: error.message || "Já existe uma instância conectada com este número de WhatsApp",
            variant: "destructive",
          });
          await loadInstances();
        } else {
          console.error("Error checking status:", error);
        }
      }
    }, 3000); // Check every 3 seconds

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsConnecting(false);
    }, 120000);
  };

  const deleteInstance = async () => {
    if (!instanceToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("evolution-delete-instance", {
        body: { instanceName: instanceToDelete.instance_name },
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Instância deletada com sucesso",
      });

      await loadInstances();
      setInstanceToDelete(null);
    } catch (error: any) {
      console.error("Error deleting instance:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar instância",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Conectar WhatsApp</h1>
            <p className="text-muted-foreground">
              Gerencie suas instâncias do WhatsApp Business
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Nova Instância
              </CardTitle>
              <CardDescription>
                Crie uma nova instância do WhatsApp para começar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-start">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="instanceName">Nome da Instância</Label>
                  <Input
                    id="instanceName"
                    placeholder="Ex: atendimento-vendas"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    disabled={isCreating || instances.length >= 3}
                  />
                  <p className="text-sm text-muted-foreground">
                    {instances.length >= 3
                      ? "Limite de 3 instâncias atingido. Delete uma instância para criar uma nova."
                      : `${instances.length}/3 instâncias criadas`
                    }
                  </p>
                </div>
                <div className="flex items-center pt-8">
                  <Button
                    onClick={createInstance}
                    disabled={isCreating || !instanceName.trim() || instances.length >= 3}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Instância"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {qrCode && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Escaneie o QR Code
                </CardTitle>
                <CardDescription>
                  Abra o WhatsApp no seu celular e escaneie o código abaixo
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Aguardando conexão...
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Instâncias Existentes</CardTitle>
              <CardDescription>
                Lista de todas as suas instâncias do WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              {instances.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma instância criada ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {instances.map((instance) => {
                    const InstanceIcon = getInstanceIcon(instance.id);
                    return (
                      <div
                        key={instance.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <InstanceIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{instance.instance_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Status: {instance.status}
                            </p>
                            {instance.phone_number && (
                              <p className="text-sm font-medium text-primary mt-1">
                                Número: {instance.phone_number}
                              </p>
                            )}
                            {instance.connected_at && (
                              <p className="text-xs text-muted-foreground">
                                Conectado em: {new Date(instance.connected_at).toLocaleString("pt-BR")}
                              </p>
                            )}
                            {orgWhatsappEnabled &&
                              instance.status === "connected" &&
                              !boundInstanceIds.includes(instance.id) && (
                                <p className="text-sm text-amber-600 dark:text-amber-500 flex items-center gap-1.5 mt-2">
                                  <AlertCircle className="h-4 w-4 shrink-0" />
                                  Habilidade WhatsApp ativa: vincule um agente a esta instância.
                                </p>
                              )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {instance.status === "connected" ? (
                            <>
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="text-sm font-medium">Conectado</span>
                              </div>
                              {orgWhatsappEnabled &&
                                !boundInstanceIds.includes(instance.id) && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      void openBindDialogForInstance({
                                        id: instance.id,
                                        instance_name: instance.instance_name,
                                      })
                                    }
                                  >
                                    <Bot className="h-4 w-4 mr-1.5" />
                                    Vincular agente
                                  </Button>
                                )}
                              <Button
                                onClick={() => reconnectInstance(instance)}
                                disabled={isConnecting && selectedInstance?.id === instance.id}
                                variant="outline"
                                size="sm"
                              >
                                {isConnecting && selectedInstance?.id === instance.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Reconectando...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reconectar
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => connectInstance(instance)}
                              disabled={isConnecting && selectedInstance?.id === instance.id}
                              size="sm"
                            >
                              {isConnecting && selectedInstance?.id === instance.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Conectando...
                                </>
                              ) : (
                                "Conectar"
                              )}
                            </Button>
                          )}
                          <Button
                            onClick={() => setInstanceToDelete(instance)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={bindDialogOpen}
        onOpenChange={(open) => {
          setBindDialogOpen(open);
          if (!open) {
            setInstancePendingBind(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular agente à instância</DialogTitle>
            <DialogDescription>
              A instância{" "}
              <span className="font-medium text-foreground">
                {instancePendingBind?.instance_name}
              </span>{" "}
              precisa de um agente de IA para atender as mensagens recebidas neste número
              quando a habilidade WhatsApp está ativa na organização.
            </DialogDescription>
          </DialogHeader>
          {orgAgents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum agente cadastrado.{" "}
              <Link
                to="/ai-interaction/create"
                className="text-primary font-medium underline underline-offset-2"
              >
                Criar agente
              </Link>
            </p>
          ) : (
            <div className="space-y-2 py-2">
              <Label htmlFor="bind-agent-select">Agente</Label>
              <Select
                value={selectedAgentIdForBind}
                onValueChange={setSelectedAgentIdForBind}
              >
                <SelectTrigger id="bind-agent-select">
                  <SelectValue placeholder="Selecione o agente" />
                </SelectTrigger>
                <SelectContent>
                  {orgAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBindDialogOpen(false)}
              disabled={bindingAgent}
            >
              Agora não
            </Button>
            <Button
              type="button"
              onClick={() => void submitInstanceAgentBinding()}
              disabled={
                bindingAgent ||
                orgAgents.length === 0 ||
                !selectedAgentIdForBind
              }
            >
              {bindingAgent ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Confirmar vínculo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!instanceToDelete} onOpenChange={() => setInstanceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Instância</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a instância "{instanceToDelete?.instance_name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteInstance}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                "Deletar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default WhatsAppConnect;