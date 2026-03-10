import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Sparkles,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/useOrganization";

const CategoryManager = () => {
  const { organization } = useOrganization();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [suggestedCategories, setSuggestedCategories] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cnaeCodesText: "",
  });
  const [cnaeQuery, setCnaeQuery] = useState("");
  const [cnaeSuggestions, setCnaeSuggestions] = useState<
    { code: string; description: string; label: string }[]
  >([]);
  const [isSearchingCnae, setIsSearchingCnae] = useState(false);
  const [selectedCnaes, setSelectedCnaes] = useState<
    { code: string; description: string; label: string }[]
  >([]);
  const [cnaeInputMode, setCnaeInputMode] = useState<"search" | "manual">("search");

  const normalizedCnaeCodes = useMemo(() => {
    const fromSelection = selectedCnaes.map((item) => item.code);
    const fromText = formData.cnaeCodesText
      .split(",")
      .map((item) => item.replace(/\D/g, "").trim())
      .filter(Boolean);
    return Array.from(new Set([...fromSelection, ...fromText]));
  }, [selectedCnaes, formData.cnaeCodesText]);

  const formatCnaeCode = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 7) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5)}`;
    }
    return digits;
  };

  const syncSelectedCnaesToText = (
    list: { code: string; description: string; label: string }[],
  ) => {
    const nextText = Array.from(new Set(list.map((item) => item.code))).join(", ");
    setFormData((prev) =>
      prev.cnaeCodesText === nextText ? prev : { ...prev, cnaeCodesText: nextText },
    );
  };

  const removeSelectedCnae = (code: string) => {
    const nextList = selectedCnaes.filter((item) => item.code !== code);
    setSelectedCnaes(nextList);
    syncSelectedCnaesToText(nextList);
  };

  const clearSelectedCnaes = () => {
    setSelectedCnaes([]);
    setFormData((prev) => ({ ...prev, cnaeCodesText: "" }));
  };

  const addSelectedCnae = (item: { code: string; description: string; label: string }) => {
    if (selectedCnaes.some((selected) => selected.code === item.code)) {
      return;
    }
    const nextList = [...selectedCnaes, item];
    setSelectedCnaes(nextList);
    syncSelectedCnaesToText(nextList);

    if (!formData.name.trim()) {
      setFormData((prev) => ({
        ...prev,
        name: item.description.slice(0, 80),
      }));
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("lead_categories")
      .select("*")
      .order("name");
    setCategories(data || []);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization?.id) {
      toast.error("Aguarde o carregamento da organização");
      return;
    }
    
    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("lead_categories")
          .update({
            name: formData.name,
            description: formData.description,
            cnae_codes: normalizedCnaeCodes,
          })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Categoria atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("lead_categories")
          .insert([{
            name: formData.name,
            description: formData.description,
            cnae_codes: normalizedCnaeCodes,
            organization_id: organization.id,
          }]);
        if (error) throw error;
        toast.success("Categoria criada com sucesso!");
      }
      
      setFormData({ name: "", description: "", cnaeCodesText: "" });
      setSelectedCnaes([]);
      setCnaeQuery("");
      setCnaeSuggestions([]);
      setCnaeInputMode("search");
      setEditingId(null);
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      const errorMessage = error?.message || "Erro ao salvar categoria";
      toast.error(errorMessage);
      console.error("Error saving category:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Digite uma descrição para buscar categorias");
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-categories', {
        body: { prompt: aiPrompt }
      });

      if (error) throw error;
      
      setSuggestedCategories(data.categories || []);
      toast.success(`${data.categories.length} categorias sugeridas pela IA!`);
    } catch (error: any) {
      toast.error("Erro ao buscar sugestões de categorias");
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddSuggestedCategory = async (category: any) => {
    try {
      const { error } = await supabase
        .from("lead_categories")
        .insert([{ ...category, organization_id: organization?.id }]);
      if (error) throw error;
      toast.success("Categoria adicionada com sucesso!");
      fetchCategories();
      setSuggestedCategories(prev => prev.filter(c => c !== category));
    } catch (error: any) {
      toast.error("Erro ao adicionar categoria");
      console.error(error);
    }
  };

  const handleEdit = (category: any) => {
    const cnaeList = Array.isArray(category.cnae_codes)
      ? category.cnae_codes
          .map((item: string) => String(item).replace(/\D/g, "").trim())
          .filter(Boolean)
          .map((code: string) => ({
            code,
            description: "",
            label: formatCnaeCode(code),
          }))
      : [];

    setSelectedCnaes(cnaeList);
    setCnaeQuery("");
    setCnaeSuggestions([]);
    setCnaeInputMode("search");
    setFormData({
      name: category.name,
      description: category.description || "",
      cnaeCodesText: Array.isArray(category.cnae_codes)
        ? category.cnae_codes.join(", ")
        : "",
    });
    setEditingId(category.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const { error } = await supabase
        .from("lead_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Categoria excluída com sucesso!");
      fetchCategories();
    } catch (error: any) {
      toast.error("Erro ao excluir categoria");
      console.error(error);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "", cnaeCodesText: "" });
    setSelectedCnaes([]);
    setCnaeQuery("");
    setCnaeSuggestions([]);
    setCnaeInputMode("search");
    setEditingId(null);
    setIsDialogOpen(false);
  };

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    const query = cnaeQuery.trim();
    if (query.length < 2) {
      setCnaeSuggestions([]);
      setIsSearchingCnae(false);
      return;
    }

    let active = true;
    setIsSearchingCnae(true);

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("search-cnae-codes", {
          body: { query, limit: 15 },
        });

        if (!active) return;
        if (error) throw error;

        const items = Array.isArray(data?.items) ? data.items : [];
        setCnaeSuggestions(
          items.filter(
            (item: { code: string }) =>
              !selectedCnaes.some((selected) => selected.code === item.code),
          ),
        );
      } catch (error) {
        if (!active) return;
        setCnaeSuggestions([]);
        toast.error("Erro ao buscar CNAEs");
      } finally {
        if (active) {
          setIsSearchingCnae(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cnaeQuery, isDialogOpen, selectedCnaes]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === categories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(categories.map(c => c.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Deseja realmente excluir ${selectedIds.length} categoria(s)?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from("lead_categories")
      .delete()
      .in("id", selectedIds);

    if (error) {
      toast.error("Erro ao excluir categorias");
      console.error(error);
    } else {
      toast.success(`${selectedIds.length} categoria(s) excluída(s) com sucesso!`);
      setSelectedIds([]);
      setIsSelectionMode(false);
      fetchCategories();
    }
    setLoading(false);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Categorias</h1>
            <p className="text-muted-foreground mt-1">
              Adicione e organize categorias de leads
            </p>
          </div>
          <div className="flex gap-2">
            {categories.length > 0 && (
              <>
                {isSelectionMode ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={toggleSelectAll}
                    >
                      {selectedIds.length === categories.length ? (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          Desmarcar Todos
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Selecionar Todos
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={selectedIds.length === 0 || loading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedIds([]);
                      }}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsSelectionMode(true)}
                  >
                    Selecionar Múltiplos
                  </Button>
                )}
              </>
            )}
            <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => { setAiPrompt(""); setSuggestedCategories([]); }}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Buscar com IA
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Buscar Categorias com IA</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-prompt">Descreva o tipo de negócio ou necessidade</Label>
                    <Textarea
                      id="ai-prompt"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ex: Preciso de categorias para uma agência de marketing digital..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleAiSuggest} disabled={aiLoading} className="w-full">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {aiLoading ? "Buscando..." : "Buscar Sugestões"}
                  </Button>

                  {suggestedCategories.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h3 className="font-semibold">Categorias Sugeridas:</h3>
                      {suggestedCategories.map((category, index) => (
                        <Card key={index} className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{category.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {category.description}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddSuggestedCategory(category)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Adicionar
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingId(null);
                    setSelectedCnaes([]);
                    setCnaeQuery("");
                    setCnaeSuggestions([]);
                    setCnaeInputMode("search");
                    setFormData({ name: "", description: "", cnaeCodesText: "" });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Editar Categoria" : "Nova Categoria"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder="Ex: Desenvolvimento Web"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Descrição da categoria..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnae_codes">Códigos CNAE (opcional)</Label>
                    <Tabs value={cnaeInputMode} onValueChange={(value) => setCnaeInputMode(value as "search" | "manual")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="search">Buscar CNAE</TabsTrigger>
                        <TabsTrigger value="manual">Manual</TabsTrigger>
                      </TabsList>
                      <TabsContent value="search" className="space-y-2 mt-3">
                        <Input
                          id="cnae_codes"
                          value={cnaeQuery}
                          onChange={(e) => setCnaeQuery(e.target.value)}
                          placeholder="Buscar por descrição ou código CNAE"
                        />
                        <p className="text-xs text-muted-foreground">
                          Digite ao menos 2 caracteres para buscar e clique em um item para adicionar.
                        </p>

                        {isSearchingCnae && (
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Buscando CNAEs...
                          </div>
                        )}

                        {!isSearchingCnae && cnaeQuery.trim().length >= 2 && cnaeSuggestions.length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            Nenhum CNAE encontrado para a busca
                          </div>
                        )}

                        {cnaeSuggestions.length > 0 && (
                          <div className="border rounded-md max-h-48 overflow-y-auto">
                            {cnaeSuggestions.map((item) => (
                              <button
                                key={item.code}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                                onClick={() => {
                                  addSelectedCnae(item);
                                  setCnaeQuery("");
                                  setCnaeSuggestions([]);
                                }}
                              >
                                <div className="text-sm font-medium">{formatCnaeCode(item.code)}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                  {item.description}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {selectedCnaes.length > 0 && (
                          <div className="space-y-2 rounded-md border p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground">
                                CNAEs selecionados ({selectedCnaes.length})
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={clearSelectedCnaes}
                                className="h-7 px-2 text-xs"
                              >
                                Limpar
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedCnaes.map((item) => (
                                <Badge key={item.code} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                                  <span className="text-xs">{formatCnaeCode(item.code)}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeSelectedCnae(item.code)}
                                    className="rounded-sm hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
                                    aria-label={`Remover CNAE ${item.code}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="manual" className="space-y-2 mt-3">
                        <Input
                          value={formData.cnaeCodesText}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, cnaeCodesText: e.target.value }))
                          }
                          placeholder="Ex: 6201501, 6202300"
                        />
                        <p className="text-xs text-muted-foreground">
                          Informe os códigos CNAE separados por vírgula.
                        </p>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading || !organization?.id}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingId ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card 
              key={category.id} 
              className={`p-4 space-y-3 relative transition-colors ${
                isSelectionMode ? 'cursor-pointer hover:bg-accent/50' : ''
              } ${
                selectedIds.includes(category.id) ? 'ring-2 ring-primary bg-accent/30' : ''
              }`}
              onClick={() => isSelectionMode && toggleSelection(category.id)}
            >
              {isSelectionMode && (
                <div className="absolute top-4 right-4 pointer-events-none">
                  <Checkbox
                    checked={selectedIds.includes(category.id)}
                    onCheckedChange={() => toggleSelection(category.id)}
                  />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {category.description || "Sem descrição"}
                </p>
                {Array.isArray(category.cnae_codes) &&
                  category.cnae_codes.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      CNAE: {category.cnae_codes.join(", ")}
                    </p>
                  )}
              </div>
              {!isSelectionMode && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(category)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">
              Nenhuma categoria criada ainda. Clique em "Nova Categoria" para começar.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CategoryManager;
