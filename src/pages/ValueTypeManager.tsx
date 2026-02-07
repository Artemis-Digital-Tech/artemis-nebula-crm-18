import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useOrganization } from "@/hooks/useOrganization";
import {
  LeadValueTypeService,
  LeadValueTypeRepository,
  type LeadValueType,
  type CreateLeadValueTypeDTO,
} from "@/services/leadValueTypes";

const repository = new LeadValueTypeRepository();
const valueTypeService = new LeadValueTypeService(repository);

const ValueTypeManager = () => {
  const { organization } = useOrganization();
  const [items, setItems] = useState<LeadValueType[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateLeadValueTypeDTO>({
    name: "",
    description: "",
    key: "",
    display_order: 0,
  });

  const fetchItems = async () => {
    if (!organization?.id) return;
    try {
      const data = await valueTypeService.getAll(organization.id);
      setItems(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao carregar tipos de valor";
      toast.error(message);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [organization?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error("Aguarde o carregamento da organização");
      return;
    }
    if (!formData.name?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await valueTypeService.update(editingId, {
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          key: formData.key?.trim() || undefined,
          display_order: formData.display_order ?? 0,
        });
        toast.success("Tipo de valor atualizado com sucesso!");
      } else {
        await valueTypeService.create(organization.id, {
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          key: formData.key?.trim() || undefined,
          display_order: formData.display_order ?? 0,
        });
        toast.success("Tipo de valor criado com sucesso!");
      }
      setFormData({ name: "", description: "", key: "", display_order: 0 });
      setEditingId(null);
      setIsDialogOpen(false);
      fetchItems();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao salvar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: LeadValueType) => {
    setFormData({
      name: item.name,
      description: item.description || "",
      key: item.key,
      display_order: item.display_order,
    });
    setEditingId(item.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await valueTypeService.delete(id);
      toast.success("Tipo de valor excluído com sucesso!");
      setDeleteId(null);
      fetchItems();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao excluir";
      toast.error(message);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "", key: "", display_order: 0 });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tipos de Valor</h1>
            <p className="text-muted-foreground mt-1">
              Cadastre tipos de valor para associar aos leads e usar nas
              métricas financeiras
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    name: "",
                    description: "",
                    key: "",
                    display_order: 0,
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Tipo de Valor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Tipo de Valor" : "Novo Tipo de Valor"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ex: Valor da Proposta, Desconto, Adicional"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Descrição do que este valor representa"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key">Chave (opcional)</Label>
                  <Input
                    id="key"
                    value={formData.key ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, key: e.target.value }))
                    }
                    placeholder="Ex: valor_proposta (gerada automaticamente se vazio)"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {editingId ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum tipo de valor cadastrado
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Crie tipos de valor (ex: Valor da Proposta, Desconto) para
              associar aos leads. Eles serão usados nas métricas financeiras do
              dashboard.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Tipo de Valor
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id} className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      {item.key}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item)}
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo de valor?</AlertDialogTitle>
            <AlertDialogDescription>
              Os valores já associados a leads deste tipo permanecerão nos
              leads, mas o tipo não poderá mais ser usado em novos cadastros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default ValueTypeManager;
