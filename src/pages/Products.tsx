import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Package, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  organization_id: string;
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
  created_at: string;
  updated_at: string;
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    if (!searchValue) return products;

    return products.filter((product) => {
      const source = [
        product.name,
        product.category ?? "",
        product.description ?? "",
        product.tags?.join(" ") ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return source.includes(searchValue);
    });
  }, [products, search]);

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Deseja excluir o produto "${product.name}"?`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      toast.success("Produto removido");
      await fetchProducts();
    } catch (error) {
      toast.error("Erro ao excluir produto");
      console.error(error);
    }
  };

  const activeProductsCount = products.filter((product) => product.is_active).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Produtos
            </h1>
            <p className="text-muted-foreground mt-1">
              Cadastre ofertas para enriquecer o contexto do agente de IA.
            </p>
          </div>
          <Button onClick={() => navigate("/products/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{products.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-500">{activeProductsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-500">
                {products.length - activeProductsCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Catálogo de produtos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, categoria ou tag"
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground">
                Nenhum produto encontrado.
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {product.description || "Sem descrição"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{product.category || "-"}</TableCell>
                        <TableCell>
                          {product.price
                            ? `${product.currency} ${Number(product.price).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {product.tags?.length ? (
                              product.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/products/${product.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Products;
