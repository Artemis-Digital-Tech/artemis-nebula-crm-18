import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import {
  AVAILABLE_PLACEHOLDERS,
  formatLeadMessage,
} from "@/utils/messageTemplate";

export default function MessageConfiguration() {
  const { toast } = useToast();
  const { organization, loading: orgLoading } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const getTemplateFeedback = (text: string) => {
    if (!text) {
      return {
        status: "neutral" as const,
        label: "Digite sua mensagem e use os marcadores se desejar.",
      };
    }

    const matches = text.match(/\{[^}]+\}/g) || [];

    if (matches.length === 0) {
      return {
        status: "neutral" as const,
        label: "Nenhum marcador dinâmico encontrado. A mensagem será enviada exatamente como está.",
      };
    }

    const unknown = matches.filter(
      (token) => !AVAILABLE_PLACEHOLDERS.includes(token),
    );
    const hasKnown = matches.some((token) =>
      AVAILABLE_PLACEHOLDERS.includes(token),
    );

    if (unknown.length > 0) {
      return {
        status: "error" as const,
        label: `Marcadores inválidos: ${unknown.join(
          ", ",
        )}. Use apenas ${AVAILABLE_PLACEHOLDERS.join(", ")}.`,
      };
    }

    if (hasKnown) {
      return {
        status: "success" as const,
        label: "Marcadores dinâmicos válidos! Eles serão substituídos corretamente no envio.",
      };
    }

    return {
      status: "neutral" as const,
      label: "Revise seus marcadores dinâmicos.",
    };
  };

  useEffect(() => {
    if (organization?.id) {
      fetchSettings();
    }
  }, [organization?.id]);

  const fetchSettings = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from("settings")
        .select("default_message, default_image_url")
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMessage(data.default_message || "");
        setImageUrl(data.default_image_url || "");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization?.id) return;

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${organization.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("message-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("message-images")
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);

      toast({
        title: "Sucesso",
        description: "Imagem carregada com sucesso!",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    setLoading(true);

    try {
      const { data: existingSettings } = await supabase
        .from("settings")
        .select("id")
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (existingSettings) {
        const { error } = await supabase
          .from("settings")
          .update({
            default_message: message,
            default_image_url: imageUrl,
          })
          .eq("organization_id", organization.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("settings").insert({
          organization_id: organization.id,
          default_message: message,
          default_image_url: imageUrl,
        });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Configuração de Mensagem</h1>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem Padrão</Label>
            <Textarea
              id="message"
              placeholder="Digite a mensagem padrão que será enviada aos leads..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Esta mensagem será enviada automaticamente ao iniciar uma conversa com o lead.
            </p>
            {(() => {
              const feedback = getTemplateFeedback(message);
              const colorClasses =
                feedback.status === "success"
                  ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                  : feedback.status === "error"
                    ? "text-red-600 bg-red-50 border-red-200"
                    : "text-muted-foreground bg-muted/40 border-muted";

              return (
                <div
                  className={`mt-1 inline-flex items-center rounded-full border px-3 py-1 text-xs ${colorClasses}`}
                >
                  <span
                    className={`mr-2 h-2 w-2 rounded-full ${
                      feedback.status === "success"
                        ? "bg-emerald-500"
                        : feedback.status === "error"
                          ? "bg-red-500"
                          : "bg-muted-foreground"
                    }`}
                  />
                  {feedback.label}
                </div>
              );
            })()}
            <p className="text-xs text-muted-foreground">
              Você pode usar marcadores dinâmicos como{" "}
              <code className="px-1 py-0.5 rounded bg-muted">{`{name}`}</code> para o
              nome do lead e{" "}
              <code className="px-1 py-0.5 rounded bg-muted">{`{organization}`}</code>{" "}
              para o nome da empresa. Eles serão substituídos automaticamente na hora
              do envio.
            </p>
            <p className="text-xs text-muted-foreground">
              Disponíveis: {AVAILABLE_PLACEHOLDERS.join(", ")}
            </p>
            {message && (
              <div className="mt-2 rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-medium mb-1 text-muted-foreground">
                  Preview com dados de exemplo:
                </p>
                <p className="text-xs whitespace-pre-wrap">
                  {formatLeadMessage(message, {
                    leadName: "João da Silva",
                    organizationName:
                      organization?.name ?? "Empresa Exemplo",
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Imagem Anexa</Label>
            <div className="flex items-center gap-4">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                size="icon"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {imageUrl && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-w-sm rounded-lg border"
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Faça upload da imagem que será enviada junto com a mensagem.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading || uploading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
