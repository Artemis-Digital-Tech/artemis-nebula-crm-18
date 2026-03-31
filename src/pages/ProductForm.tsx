import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeDollarSign,
  BookType,
  CircleHelp,
  Layers3,
  Loader2,
  Package,
  Tags,
  Users,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface Product {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number | null;
  currency: string;
  features: string | null;
  target_audience: string | null;
  use_cases: string | null;
  differentiators: string | null;
  tags: string[];
  is_active: boolean;
}

interface ProductFormData {
  name: string;
  category: string;
  description: string;
  price: string;
  currency: string;
  features: string;
  target_audience: string;
  use_cases: string;
  differentiators: string;
  tags: string;
  is_active: boolean;
}

const initialFormData: ProductFormData = {
  name: "",
  category: "",
  description: "",
  price: "",
  currency: "BRL",
  features: "",
  target_audience: "",
  use_cases: "",
  differentiators: "",
  tags: "",
  is_active: true,
};

const FieldHint = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <CircleHelp className="h-4 w-4 text-muted-foreground cursor-help" />
    </TooltipTrigger>
    <TooltipContent>{text}</TooltipContent>
  </Tooltip>
);

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const totalSteps = 4;
  const progress = Math.round((currentStep / totalSteps) * 100);

  useEffect(() => {
    if (!isEditing || !id) return;

    const loadProduct = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        const product = data as Product;
        setFormData({
          name: product.name,
          category: product.category ?? "",
          description: product.description ?? "",
          price: product.price ? String(product.price) : "",
          currency: product.currency ?? "BRL",
          features: product.features ?? "",
          target_audience: product.target_audience ?? "",
          use_cases: product.use_cases ?? "",
          differentiators: product.differentiators ?? "",
          tags: product.tags?.join(", ") ?? "",
          is_active: product.is_active,
        });
      } catch (error) {
        toast.error("Não foi possível carregar o produto");
        navigate("/products");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, isEditing, navigate]);

  const buildPayload = () => {
    const tags = formData.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    return {
      organization_id: organization?.id,
      name: formData.name.trim(),
      category: formData.category.trim() || null,
      description: formData.description.trim() || null,
      price: formData.price ? Number(formData.price.replace(",", ".")) : null,
      currency: formData.currency.trim().toUpperCase() || "BRL",
      features: formData.features.trim() || null,
      target_audience: formData.target_audience.trim() || null,
      use_cases: formData.use_cases.trim() || null,
      differentiators: formData.differentiators.trim() || null,
      tags,
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    };
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!organization?.id) {
      toast.error("Organização não identificada");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();

      if (isEditing && id) {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
        toast.success("Produto atualizado com sucesso");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Produto criado com sucesso");
      }

      navigate("/products");
    } catch (error: any) {
      if (error?.message?.includes("products_organization_id_name_key")) {
        toast.error("Já existe um produto com esse nome na sua organização");
      } else {
        toast.error("Não foi possível salvar o produto");
      }
    } finally {
      setSaving(false);
    }
  };

  const goNextStep = () => {
    if (currentStep === 1 && !formData.name.trim()) {
      toast.error("Informe o nome do produto para continuar");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const goPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              {isEditing ? "Editar produto" : "Novo produto"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Registre informações estratégicas para o agente usar no contexto.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/products")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cadastro do produto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Etapa {currentStep} de {totalSteps}
                  </span>
                  <span className="font-medium">{progress}% concluído</span>
                </div>
                <Progress value={progress} />
              </div>

              {currentStep === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Nome
                      <FieldHint text="Nome principal que o agente citará ao responder." />
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, name: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="flex items-center gap-2">
                      <BookType className="h-4 w-4 text-primary" />
                      Categoria
                      <FieldHint text="Tipo do produto para facilitar busca e filtro." />
                    </Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, category: event.target.value }))
                      }
                      placeholder="Ex.: Software, Consultoria"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description" className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-primary" />
                      Descrição
                      <FieldHint text="Resumo objetivo do valor entregue." />
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Explique o produto em termos simples"
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="flex items-center gap-2">
                        <BadgeDollarSign className="h-4 w-4 text-primary" />
                        Preço
                        <FieldHint text="Valor base para negociações e respostas comerciais." />
                      </Label>
                      <Input
                        id="price"
                        value={formData.price}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, price: event.target.value }))
                        }
                        placeholder="Ex.: 1990.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="flex items-center gap-2">
                        <BadgeDollarSign className="h-4 w-4 text-primary" />
                        Moeda
                        <FieldHint text="Use código ISO da moeda, como BRL ou USD." />
                      </Label>
                      <Input
                        id="currency"
                        value={formData.currency}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            currency: event.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="BRL"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="features" className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-primary" />
                      Principais recursos
                      <FieldHint text="Funcionalidades e entregáveis que o agente deve destacar." />
                    </Label>
                    <Textarea
                      id="features"
                      value={formData.features}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, features: event.target.value }))
                      }
                      placeholder="Liste os principais recursos"
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="target_audience" className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Público-alvo
                        <FieldHint text="Perfil ideal de cliente para este produto." />
                      </Label>
                      <Textarea
                        id="target_audience"
                        value={formData.target_audience}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            target_audience: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="use_cases" className="flex items-center gap-2">
                        <BookType className="h-4 w-4 text-primary" />
                        Casos de uso
                        <FieldHint text="Situações práticas em que o produto resolve dores." />
                      </Label>
                      <Textarea
                        id="use_cases"
                        value={formData.use_cases}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, use_cases: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="differentiators" className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-primary" />
                      Diferenciais
                      <FieldHint text="Pontos de vantagem frente a outras opções do mercado." />
                    </Label>
                    <Textarea
                      id="differentiators"
                      value={formData.differentiators}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          differentiators: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="flex items-center gap-2">
                      <Tags className="h-4 w-4 text-primary" />
                      Tags
                      <FieldHint text="Palavras-chave separadas por vírgula para facilitar contexto." />
                    </Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, tags: event.target.value }))
                      }
                      placeholder="crm, automacao, whatsapp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="is_active" className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Produto ativo
                      <FieldHint text="Produtos inativos ficam salvos, mas não devem ser priorizados pelo agente." />
                    </Label>
                    <div className="h-10 px-3 rounded-md border flex items-center justify-between">
                      <span className="text-sm">
                        {formData.is_active ? "Ativo para uso" : "Inativo"}
                      </span>
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(value) =>
                          setFormData((prev) => ({ ...prev, is_active: value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-2">
                <div>
                  {currentStep > 1 && (
                    <Button type="button" variant="outline" onClick={goPreviousStep}>
                      Voltar etapa
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {currentStep < totalSteps ? (
                    <Button type="button" onClick={goNextStep}>
                      Próxima etapa
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="outline" onClick={() => navigate("/products")}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar produto
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProductForm;
