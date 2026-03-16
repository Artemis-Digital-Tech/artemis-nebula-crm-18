import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Instagram, Loader2, Send, Info } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InstagramConfigForm {
  businessName: string;
  contactEmail: string;
  instagramUsername: string;
  instagramProfileUrl: string;
  facebookPageUrl: string;
  hasMetaApp: "yes" | "no" | "";
  metaAppId: string;
  notes: string;
}

const initialState: InstagramConfigForm = {
  businessName: "",
  contactEmail: "",
  instagramUsername: "",
  instagramProfileUrl: "",
  facebookPageUrl: "",
  hasMetaApp: "",
  metaAppId: "",
  notes: "",
};

const InstagramConfiguration = () => {
  const [form, setForm] = useState<InstagramConfigForm>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  const updateField = <K extends keyof InstagramConfigForm>(
    key: K,
    value: InstagramConfigForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.contactEmail.trim() || !form.instagramUsername.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome do negócio, e-mail e usuário do Instagram.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: orgData } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      const { error } = await supabase.from("instagram_config_requests").insert({
        organization_id: orgData?.organization_id ?? null,
        business_name: form.businessName.trim(),
        contact_email: form.contactEmail.trim(),
        instagram_username: form.instagramUsername.trim(),
        instagram_profile_url: form.instagramProfileUrl.trim() || null,
        facebook_page_url: form.facebookPageUrl.trim() || null,
        has_meta_app: form.hasMetaApp === "yes",
        meta_app_id: form.metaAppId.trim() || null,
        notes: form.notes.trim() || null,
      });

      if (error) throw error;

      setSubmitted(true);
      setForm(initialState);
      toast({
        title: "Solicitação enviada",
        description:
          "Nossa equipe usará essas informações para configurar o bot do Instagram e entrará em contato em breve.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao enviar solicitação.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5" />
                  Solicitação recebida
                </CardTitle>
                <CardDescription>
                  Obrigado pelas informações. Nossa equipe utilizará esses dados para configurar
                  o bot do Instagram na sua conta e entrará em contato pelo e-mail informado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Enviar outra solicitação
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Instagram className="h-8 w-8" />
              Configurar bot no Instagram
            </h1>
            <p className="text-muted-foreground">
              Preencha os dados abaixo. Nossa equipe utilizará essas informações para configurar
              o bot do Instagram na sua conta e entrará em contato.
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Requisitos do Instagram</AlertTitle>
            <AlertDescription>
              A conta do Instagram precisa ser Professional (Business ou Creator). Se estiver
              vinculada a uma Página do Facebook, informe o link da página. O bot receberá e
              enviará mensagens pelo Direct (DMs) na janela de 24h após a última mensagem do usuário.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Dados para configuração</CardTitle>
              <CardDescription>
                Informações que precisamos para configurar o bot do Instagram para você
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nome do negócio / empresa *</Label>
                  <Input
                    id="businessName"
                    placeholder="Ex: Minha Loja Ltda"
                    value={form.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">E-mail de contato *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="Ex: contato@empresa.com.br"
                    value={form.contactEmail}
                    onChange={(e) => updateField("contactEmail", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagramUsername">Usuário do Instagram (conta Professional) *</Label>
                  <Input
                    id="instagramUsername"
                    placeholder="Ex: @minhaempresa ou minhaempresa"
                    value={form.instagramUsername}
                    onChange={(e) => updateField("instagramUsername", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    A conta deve ser Business ou Creator para usar a API de mensagens.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagramProfileUrl">Link do perfil do Instagram (opcional)</Label>
                  <Input
                    id="instagramProfileUrl"
                    type="url"
                    placeholder="Ex: https://www.instagram.com/minhaempresa/"
                    value={form.instagramProfileUrl}
                    onChange={(e) => updateField("instagramProfileUrl", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebookPageUrl">Página do Facebook vinculada (opcional)</Label>
                  <Input
                    id="facebookPageUrl"
                    type="url"
                    placeholder="Ex: https://www.facebook.com/minhaempresa"
                    value={form.facebookPageUrl}
                    onChange={(e) => updateField("facebookPageUrl", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se sua conta Instagram for Professional e estiver vinculada a uma Página do
                    Facebook, informe o link.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Já possui um app no Meta for Developers?</Label>
                  <RadioGroup
                    value={form.hasMetaApp}
                    onValueChange={(v) => updateField("hasMetaApp", v as InstagramConfigForm["hasMetaApp"])}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="hasMetaYes" />
                      <Label htmlFor="hasMetaYes" className="font-normal cursor-pointer">
                        Sim
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="hasMetaNo" />
                      <Label htmlFor="hasMetaNo" className="font-normal cursor-pointer">
                        Não
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {form.hasMetaApp === "yes" && (
                  <div className="space-y-2">
                    <Label htmlFor="metaAppId">App ID (opcional)</Label>
                    <Input
                      id="metaAppId"
                      placeholder="Ex: 1234567890123456"
                      value={form.metaAppId}
                      onChange={(e) => updateField("metaAppId", e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações / como pretende usar o bot (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Ex: Atendimento de dúvidas de produtos, agendamento de consultas, qualificação de leads..."
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar solicitação
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/abilities")}
                  >
                    Voltar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default InstagramConfiguration;
