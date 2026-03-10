import { useState, useEffect, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  Plus,
  Loader2,
  X,
  Star,
  Phone,
  Mail,
  Map as MapIcon,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Tag,
  Menu,
  Settings2,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { cleanPhoneNumber, formatWhatsAppNumber } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { InteractiveMap } from "@/components/InteractiveMap";
import { CategoriesDragDrop } from "@/components/CategoriesDragDrop";
import { LeadPreviewDialog } from "@/components/LeadPreviewDialog";
import { AnimatedLoading } from "@/components/AnimatedLoading";

interface BusinessResult {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  category: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  cnae_codes?: string[] | null;
}

const brazilianStates = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const LeadSearch = () => {
  const { organization } = useOrganization();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchSource, setSearchSource] = useState<"google" | "casa-dados">(
    "google",
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    -23.5505, -46.6333,
  ]);
  const [searchParams, setSearchParams] = useState({
    location: "",
    radius: 5000,
    latitude: -23.5505,
    longitude: -46.6333,
  });
  const [currentAddress, setCurrentAddress] = useState<string>("");
  const [casaDosDadosParams, setCasaDosDadosParams] = useState({
    uf: "SP",
    municipio: "",
    limit: 50,
  });
  const [searchResults, setSearchResults] = useState<BusinessResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusinesses, setSelectedBusinesses] = useState<number[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [allowUnverifiedWhatsapp, setAllowUnverifiedWhatsapp] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "category">("name");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [categoriesSheetOpen, setCategoriesSheetOpen] = useState(false);
  const [previewBusiness, setPreviewBusiness] = useState<BusinessResult | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] =
    useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: "",
    description: "",
    cnaeCodesText: "",
  });
  const [newCategoryCnaeQuery, setNewCategoryCnaeQuery] = useState("");
  const [newCategoryCnaeSuggestions, setNewCategoryCnaeSuggestions] = useState<
    { code: string; description: string; label: string }[]
  >([]);
  const [newCategoryIsSearchingCnae, setNewCategoryIsSearchingCnae] =
    useState(false);
  const [newCategorySelectedCnaes, setNewCategorySelectedCnaes] = useState<
    { code: string; description: string; label: string }[]
  >([]);
  const [newCategoryCnaeInputMode, setNewCategoryCnaeInputMode] = useState<
    "search" | "manual"
  >("search");
  const [freeTextSearch, setFreeTextSearch] = useState("");
  const [freeTextExpanded, setFreeTextExpanded] = useState(false);

  const formatCnaeCode = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 7) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5)}`;
    }
    return digits;
  };

  const syncNewCategorySelectedCnaesToText = (
    list: { code: string; description: string; label: string }[],
  ) => {
    const nextText = Array.from(new Set(list.map((item) => item.code))).join(
      ", ",
    );
    setNewCategoryForm((prev) =>
      prev.cnaeCodesText === nextText
        ? prev
        : { ...prev, cnaeCodesText: nextText },
    );
  };

  const addNewCategorySelectedCnae = (item: {
    code: string;
    description: string;
    label: string;
  }) => {
    if (
      newCategorySelectedCnaes.some((selected) => selected.code === item.code)
    ) {
      return;
    }

    const nextList = [...newCategorySelectedCnaes, item];
    setNewCategorySelectedCnaes(nextList);
    syncNewCategorySelectedCnaesToText(nextList);
  };

  const removeNewCategorySelectedCnae = (code: string) => {
    const nextList = newCategorySelectedCnaes.filter(
      (item) => item.code !== code,
    );
    setNewCategorySelectedCnaes(nextList);
    syncNewCategorySelectedCnaesToText(nextList);
  };

  const normalizedNewCategoryCnaeCodes = useMemo(() => {
    const fromSelection = newCategorySelectedCnaes.map((item) => item.code);
    const fromText = newCategoryForm.cnaeCodesText
      .split(",")
      .map((item) => item.replace(/\D/g, "").trim())
      .filter(Boolean);
    return Array.from(new Set([...fromSelection, ...fromText]));
  }, [newCategoryForm.cnaeCodesText, newCategorySelectedCnaes]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!createCategoryDialogOpen) {
      return;
    }

    const query = newCategoryCnaeQuery.trim();
    if (query.length < 2) {
      setNewCategoryCnaeSuggestions([]);
      setNewCategoryIsSearchingCnae(false);
      return;
    }

    let active = true;
    setNewCategoryIsSearchingCnae(true);

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "search-cnae-codes",
          {
            body: { query, limit: 15 },
          },
        );

        if (!active) return;
        if (error) throw error;

        const items = Array.isArray(data?.items) ? data.items : [];
        setNewCategoryCnaeSuggestions(
          items.filter(
            (item: { code: string }) =>
              !newCategorySelectedCnaes.some(
                (selected) => selected.code === item.code,
              ),
          ),
        );
      } catch {
        if (!active) return;
        setNewCategoryCnaeSuggestions([]);
        toast.error("Erro ao buscar CNAEs");
      } finally {
        if (active) {
          setNewCategoryIsSearchingCnae(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    createCategoryDialogOpen,
    newCategoryCnaeQuery,
    newCategorySelectedCnaes,
  ]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("lead_categories")
      .select("*")
      .order("name");
    setCategories(data || []);
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categoryFilter.toLowerCase()),
  );

  const handleCategoryToggle = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName],
    );
  };

  const handleSelectAll = () => {
    setSelectedCategories(filteredCategories.map((cat) => cat.name));
  };

  const handleClearSelection = () => {
    setSelectedCategories([]);
  };

  const inferUfAndMunicipioFromAddress = useCallback((address: string) => {
    if (!address) return;

    const parts = address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const ufMatch = address.toUpperCase().match(/\b([A-Z]{2})\b/);
    const inferredUf = ufMatch?.[1];

    if (!inferredUf || !brazilianStates.includes(inferredUf)) {
      return;
    }

    let municipio = "";
    const ufPartIndex = parts.findIndex((part) =>
      new RegExp(`\\b${inferredUf}\\b`, "i").test(part),
    );

    if (ufPartIndex > 0) {
      municipio = parts[ufPartIndex - 1];
    } else if (parts.length >= 2) {
      municipio = parts[parts.length - 2];
    }

    setCasaDosDadosParams((prev) => ({
      ...prev,
      uf: inferredUf,
      municipio: municipio || prev.municipio,
    }));
  }, []);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "reverse-geocode",
          {
            body: { lat, lng },
          },
        );

        if (!error && data?.formattedAddress) {
          setCurrentAddress(data.formattedAddress);
          inferUfAndMunicipioFromAddress(data.formattedAddress);
          setSearchParams((prev) => ({
            ...prev,
            location: data.formattedAddress,
            latitude: lat,
            longitude: lng,
          }));
        } else {
          setCurrentAddress("");
          setSearchParams((prev) => ({
            ...prev,
            location: "",
            latitude: lat,
            longitude: lng,
          }));
        }
      } catch (error) {
        console.error("Erro ao fazer geocodificação reversa:", error);
        setCurrentAddress("");
        setSearchParams((prev) => ({
          ...prev,
          location: "",
          latitude: lat,
          longitude: lng,
        }));
      }
    },
    [inferUfAndMunicipioFromAddress],
  );

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapCenter([lat, lng]);
        reverseGeocode(lat, lng);
      },
      () => {
        toast.info(
          "Permita a localização para preencher automaticamente a busca.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000,
      },
    );
  }, [reverseGeocode]);

  const handleLocationSelect = async (placeId: string, description: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("place-details", {
        body: { placeId },
      });

      if (error) throw error;

      if (data?.latitude && data?.longitude) {
        const newCenter: [number, number] = [data.latitude, data.longitude];
        const inferredAddress = data.formattedAddress || description;
        setMapCenter(newCenter);
        setCurrentAddress(inferredAddress);
        inferUfAndMunicipioFromAddress(inferredAddress);
        setSearchParams((prev) => ({
          ...prev,
          location: inferredAddress,
          latitude: data.latitude,
          longitude: data.longitude,
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes da localização:", error);
      toast.error("Erro ao carregar localização selecionada");
    }
  };

  const handleMapLocationChange = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    reverseGeocode(lat, lng);
  };

  const handleMapRadiusChange = (radius: number) => {
    setSearchParams((prev) => ({ ...prev, radius }));
  };

  const handleCreateCategory = async () => {
    const name = newCategoryForm.name.trim();

    if (!name) {
      toast.error("Informe o nome da categoria");
      return;
    }

    if (!organization?.id) {
      toast.error("Aguarde o carregamento da organização");
      return;
    }

    setCreatingCategory(true);
    try {
      const payload = {
        name,
        description: newCategoryForm.description.trim(),
        cnae_codes: normalizedNewCategoryCnaeCodes,
        organization_id: organization.id,
      };

      const { error } = await supabase
        .from("lead_categories")
        .insert([payload]);
      if (error) throw error;

      await fetchCategories();
      setSelectedCategories((prev) =>
        prev.includes(name) ? prev : [...prev, name],
      );
      setNewCategoryForm({
        name: "",
        description: "",
        cnaeCodesText: "",
      });
      setNewCategorySelectedCnaes([]);
      setNewCategoryCnaeQuery("");
      setNewCategoryCnaeSuggestions([]);
      setNewCategoryCnaeInputMode("search");
      setCreateCategoryDialogOpen(false);
      toast.success("Categoria criada e selecionada com sucesso!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao criar categoria";
      toast.error(errorMessage);
      console.error("Erro ao criar categoria:", error);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSearch = async () => {
    const normalizedFreeTextSearch = freeTextSearch.trim();

    if (selectedCategories.length === 0 && !normalizedFreeTextSearch) {
      toast.error(
        "Selecione ao menos uma categoria ou informe uma busca textual",
      );
      return;
    }

    if (!searchParams.location.trim()) {
      toast.error("Selecione uma localização no mapa");
      return;
    }

    if (searchSource === "casa-dados" && !casaDosDadosParams.uf.trim()) {
      toast.error("Selecione uma UF para a busca");
      return;
    }

    setLoading(true);
    setSearchResults([]);
    setSelectedBusinesses([]);

    try {
      const selectedCategoryObjects = categories.filter((category) =>
        selectedCategories.includes(category.name),
      );
      const cnaeCodes = Array.from(
        new Set(
          selectedCategoryObjects.flatMap(
            (category) => category.cnae_codes || [],
          ),
        ),
      );

      const functionName =
        searchSource === "google"
          ? "search-nearby-businesses"
          : "search-casa-dados-businesses";
      const body =
        searchSource === "google"
          ? {
              location: searchParams.location,
              categories: selectedCategories,
              textQuery: normalizedFreeTextSearch || undefined,
              radius: searchParams.radius,
            }
          : {
              uf: casaDosDadosParams.uf,
              municipio: casaDosDadosParams.municipio.trim() || undefined,
              categories: selectedCategories,
              cnaeCodes,
              textQuery: normalizedFreeTextSearch || undefined,
              limit: casaDosDadosParams.limit,
            };

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });

      if (error) throw error;

      const uniqueBusinesses = Array.from(
        new globalThis.Map(
          (data.businesses || [])
            .filter((business: BusinessResult) => business.phone)
            .map((business: BusinessResult) => {
              const normalizedPhone = cleanPhoneNumber(business.phone || "");
              const fallbackKey = `${business.name}-${business.address}`
                .trim()
                .toLowerCase();
              const key = normalizedPhone || fallbackKey;
              return [key, business];
            }),
        ).values(),
      );

      setSearchResults(uniqueBusinesses);

      if (uniqueBusinesses.length === 0) {
        toast.info("Nenhum negócio com WhatsApp encontrado");
      } else {
        const usedSources =
          searchSource === "google" ? "Google Places" : "Casa dos Dados";
        toast.success(
          `${uniqueBusinesses.length} negócio(s) com WhatsApp encontrado(s) via ${usedSources}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao buscar negócios: " + errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessToggle = (index: number) => {
    setSelectedBusinesses((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handleBusinessPreview = (business: BusinessResult, index: number) => {
    setPreviewBusiness(business);
    setPreviewOpen(true);
  };

  const handlePreviewToggleSelection = () => {
    if (previewBusiness) {
      const index = searchResults.findIndex(
        (b) =>
          b.name === previewBusiness.name &&
          b.address === previewBusiness.address,
      );
      if (index !== -1) {
        handleBusinessToggle(index);
      }
    }
  };

  const handleConfirmAddLeads = () => {
    setShowConfirmDialog(false);
    processAddToLeads();
  };

  const handleAddToLeads = () => {
    if (selectedBusinesses.length === 0) {
      toast.error("Selecione pelo menos um negócio para adicionar");
      return;
    }
    setAllowUnverifiedWhatsapp(false);
    setShowConfirmDialog(true);
  };

  const parseAddress = (address: string) => {
    const addressParts = {
      address: address,
      city: "",
      state: "",
      zip_code: "",
      country: "Brasil",
    };

    if (!address) return addressParts;

    const brazilianStates = [
      "AC",
      "AL",
      "AP",
      "AM",
      "BA",
      "CE",
      "DF",
      "ES",
      "GO",
      "MA",
      "MT",
      "MS",
      "MG",
      "PA",
      "PB",
      "PR",
      "PE",
      "PI",
      "RJ",
      "RN",
      "RS",
      "RO",
      "RR",
      "SC",
      "SP",
      "SE",
      "TO",
    ];

    const parts = address.split(",").map((p) => p.trim());

    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      const secondLastPart = parts[parts.length - 2];

      if (lastPart === "Brasil" || lastPart === "Brazil") {
        addressParts.country = "Brasil";

        if (parts.length >= 3) {
          const stateCityPart = secondLastPart;
          const stateMatch = stateCityPart.match(/\b([A-Z]{2})\b/);

          if (stateMatch) {
            const state = stateMatch[1];
            if (brazilianStates.includes(state)) {
              addressParts.state = state;
              addressParts.city = stateCityPart
                .replace(/\b[A-Z]{2}\b/, "")
                .trim()
                .replace(/^-\s*/, "")
                .trim();
            } else {
              addressParts.city = stateCityPart;
            }
          } else {
            addressParts.city = stateCityPart;
          }

          const zipCodeMatch = address.match(/\b(\d{5}-?\d{3})\b/);
          if (zipCodeMatch) {
            addressParts.zip_code = zipCodeMatch[1]
              .replace("-", "")
              .replace(/(\d{5})(\d{3})/, "$1-$2");
          }
        }
      } else {
        const stateMatch = lastPart.match(/\b([A-Z]{2})\b/);
        if (stateMatch && brazilianStates.includes(stateMatch[1])) {
          addressParts.state = stateMatch[1];
          if (parts.length >= 2) {
            addressParts.city = secondLastPart;
          }
        } else if (parts.length >= 1) {
          addressParts.city = lastPart;
        }

        const zipCodeMatch = address.match(/\b(\d{5}-?\d{3})\b/);
        if (zipCodeMatch) {
          addressParts.zip_code = zipCodeMatch[1]
            .replace("-", "")
            .replace(/(\d{5})(\d{3})/, "$1-$2");
        }
      }
    } else if (parts.length === 1) {
      addressParts.city = parts[0];
    }

    return addressParts;
  };

  const processAddToLeads = async () => {
    const businessesToAdd = selectedBusinesses.map(
      (index) => searchResults[index],
    );
    setLoading(true);
    setLoadingMessage("Validando números no WhatsApp...");

    try {
      // Coletar todos os números para validação
      const phonesToCheck = businessesToAdd
        .map((business) =>
          business.phone ? cleanPhoneNumber(business.phone) : null,
        )
        .filter((phone): phone is string => phone !== null);

      if (phonesToCheck.length === 0) {
        toast.error("Nenhum número de telefone válido encontrado");
        setLoading(false);
        return;
      }

      // Validar todos os números via Evolution API
      setLoadingMessage("Validando números no WhatsApp...");
      const { data: checkData, error: checkError } =
        await supabase.functions.invoke("evolution-check-whatsapp", {
          body: { numbers: phonesToCheck },
        });

      if (checkError) {
        console.error("Error checking WhatsApp:", checkError);
        toast.error("Erro ao validar números no WhatsApp");
        setLoading(false);
        setLoadingMessage("");
        return;
      }

      // Criar mapa de número para jid
      interface WhatsAppCheckResult {
        exists: boolean;
        jid?: string;
        number: string;
      }
      const phoneToJidMap: Record<string, string> = {};
      (checkData?.results || []).forEach((result: WhatsAppCheckResult) => {
        if (result.exists && result.jid) {
          phoneToJidMap[result.number] = result.jid;
        }
      });

      // Criar leads para números válidos e, opcionalmente, pendentes de validação
      const leadsToInsert = businessesToAdd
        .map((business) => {
          const cleanedPhone = business.phone
            ? cleanPhoneNumber(business.phone)
            : null;
          if (!cleanedPhone) {
            return null;
          }

          const normalizedPhone = formatWhatsAppNumber(cleanedPhone);
          const remoteJid = phoneToJidMap[cleanedPhone] || null;
          const whatsappVerified = Boolean(remoteJid);
          if (!whatsappVerified && !allowUnverifiedWhatsapp) {
            return null;
          }
          const parsedAddress = parseAddress(business.address);

          return {
            name: business.name,
            description: `Negócio encontrado via busca - ${business.address}`,
            category: business.category,
            status: "novo",
            contact_email: business.email || null,
            contact_whatsapp: normalizedPhone,
            phone: business.phone || null,
            remote_jid: remoteJid,
            source: "Busca Automática",
            whatsapp_verified: whatsappVerified,
            organization_id: organization?.id,
            address: parsedAddress.address || null,
            city: parsedAddress.city || null,
            state: parsedAddress.state || null,
            zip_code: parsedAddress.zip_code || null,
            country: parsedAddress.country || "Brasil",
          };
        })
        .filter((lead): lead is NonNullable<typeof lead> => lead !== null);

      if (leadsToInsert.length === 0) {
        toast.error(
          allowUnverifiedWhatsapp
            ? "Nenhum número válido encontrado para cadastro"
            : "Nenhum número válido no WhatsApp encontrado",
        );
        setLoading(false);
        setLoadingMessage("");
        return;
      }

      setLoadingMessage("Adicionando leads ao sistema...");
      const { error } = await supabase.from("leads").insert(leadsToInsert);

      if (error) throw error;

      const verifiedCount = leadsToInsert.filter(
        (lead) => lead.whatsapp_verified,
      ).length;
      const pendingValidationCount = leadsToInsert.length - verifiedCount;
      const skippedCount = businessesToAdd.length - leadsToInsert.length;
      const successMessageParts = [
        `${leadsToInsert.length} lead(s) adicionado(s).`,
        verifiedCount > 0
          ? `${verifiedCount} com WhatsApp validado.`
          : undefined,
        pendingValidationCount > 0
          ? `${pendingValidationCount} pendente(s) de validação.`
          : undefined,
        skippedCount > 0 ? `${skippedCount} não adicionado(s).` : undefined,
      ].filter(Boolean);
      toast.success(successMessageParts.join(" "));

      setSelectedBusinesses([]);
    } catch (error) {
      toast.error("Erro ao adicionar leads");
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...searchResults];

    if (filterRating !== null) {
      filtered = filtered.filter(
        (business) => business.rating && business.rating >= filterRating,
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchResults, sortBy, filterRating]);

  const formatRadius = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const freeTextPlaceholder =
    searchSource === "google"
      ? "Ex: contabilidade, pet shop, clinica odontologica"
      : "Ex: comercio varejista, construtora, servicos juridicos";

  return (
    <Layout>
      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmAddLeads}
        title="Confirmar Adição de Leads"
        description={`Você está prestes a adicionar ${selectedBusinesses.length} negócio(s) como leads. Deseja continuar?`}
        confirmText="Sim, Adicionar"
        cancelText="Cancelar"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border p-3">
            <Checkbox
              id="allow-unverified-whatsapp"
              checked={allowUnverifiedWhatsapp}
              onCheckedChange={(checked) =>
                setAllowUnverifiedWhatsapp(checked === true)
              }
            />
            <Label
              htmlFor="allow-unverified-whatsapp"
              className="text-sm cursor-pointer"
            >
              Cadastrar números sem WhatsApp e validar depois
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Se desmarcado, apenas números já validados no WhatsApp serão
            adicionados.
          </p>
        </div>
      </ConfirmDialog>

      <div className="h-[calc(100vh-4rem)] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div>
            <h1 className="text-2xl font-bold">Buscar Novos Leads</h1>
            <p className="text-sm text-muted-foreground">
              {searchSource === "google"
                ? "Marque a localização no mapa e selecione as categorias"
                : "Busque na Casa dos Dados usando UF e município inferidos do mapa"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs
              value={searchSource}
              onValueChange={(value) =>
                setSearchSource(value as "google" | "casa-dados")
              }
            >
              <TabsList>
                <TabsTrigger value="google">Google Places</TabsTrigger>
                <TabsTrigger value="casa-dados">Casa dos Dados</TabsTrigger>
              </TabsList>
            </Tabs>
            <Sheet
              open={categoriesSheetOpen}
              onOpenChange={setCategoriesSheetOpen}
            >
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  Categorias
                  {selectedCategories.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedCategories.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:max-w-lg overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle>Selecionar Categorias</SheetTitle>
                  <SheetDescription>
                    Selecione as categorias de negócios que deseja buscar. Você
                    pode arrastar as categorias selecionadas para reordená-las.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <Dialog
                    open={createCategoryDialogOpen}
                    onOpenChange={(open) => {
                      setCreateCategoryDialogOpen(open);
                      if (!open) {
                        setNewCategoryCnaeQuery("");
                        setNewCategoryCnaeSuggestions([]);
                        setNewCategoryIsSearchingCnae(false);
                        setNewCategoryCnaeInputMode("search");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Nova categoria
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar nova categoria</DialogTitle>
                        <DialogDescription>
                          Adicione uma categoria para aparecer na seleção de
                          busca.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="new-category-name">Nome *</Label>
                          <Input
                            id="new-category-name"
                            value={newCategoryForm.name}
                            onChange={(event) =>
                              setNewCategoryForm((prev) => ({
                                ...prev,
                                name: event.target.value,
                              }))
                            }
                            placeholder="Ex: Academia"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-category-description">
                            Descrição
                          </Label>
                          <Textarea
                            id="new-category-description"
                            value={newCategoryForm.description}
                            onChange={(event) =>
                              setNewCategoryForm((prev) => ({
                                ...prev,
                                description: event.target.value,
                              }))
                            }
                            placeholder="Descrição da categoria..."
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-category-cnae">
                            Códigos CNAE (opcional)
                          </Label>
                          <Tabs
                            value={newCategoryCnaeInputMode}
                            onValueChange={(value) =>
                              setNewCategoryCnaeInputMode(
                                value as "search" | "manual",
                              )
                            }
                          >
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="search">
                                Buscar CNAE
                              </TabsTrigger>
                              <TabsTrigger value="manual">Manual</TabsTrigger>
                            </TabsList>
                            <TabsContent
                              value="search"
                              className="space-y-2 mt-3"
                            >
                              <Input
                                id="new-category-cnae"
                                value={newCategoryCnaeQuery}
                                onChange={(event) =>
                                  setNewCategoryCnaeQuery(event.target.value)
                                }
                                placeholder="Buscar por descrição ou código CNAE"
                              />

                              {newCategoryIsSearchingCnae && (
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Buscando CNAEs...
                                </div>
                              )}

                              {!newCategoryIsSearchingCnae &&
                                newCategoryCnaeQuery.trim().length >= 2 &&
                                newCategoryCnaeSuggestions.length === 0 && (
                                  <div className="text-sm text-muted-foreground">
                                    Nenhum CNAE encontrado para a busca
                                  </div>
                                )}

                              {newCategoryCnaeSuggestions.length > 0 && (
                                <div className="border rounded-md max-h-48 overflow-y-auto">
                                  {newCategoryCnaeSuggestions.map((item) => (
                                    <button
                                      key={item.code}
                                      type="button"
                                      className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm"
                                      onClick={() => {
                                        addNewCategorySelectedCnae(item);
                                        setNewCategoryCnaeQuery("");
                                        setNewCategoryCnaeSuggestions([]);
                                      }}
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {newCategorySelectedCnaes.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {newCategorySelectedCnaes.map((item) => (
                                    <Button
                                      key={item.code}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        removeNewCategorySelectedCnae(item.code)
                                      }
                                    >
                                      {item.description
                                        ? item.label
                                        : formatCnaeCode(item.code)}
                                      <X className="w-3 h-3 ml-2" />
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </TabsContent>
                            <TabsContent
                              value="manual"
                              className="space-y-2 mt-3"
                            >
                              <Input
                                value={newCategoryForm.cnaeCodesText}
                                onChange={(event) =>
                                  setNewCategoryForm((prev) => ({
                                    ...prev,
                                    cnaeCodesText: event.target.value,
                                  }))
                                }
                                placeholder="Ex: 6201501, 6202300"
                              />
                              <p className="text-xs text-muted-foreground">
                                Informe os códigos CNAE separados por vírgula.
                              </p>
                            </TabsContent>
                          </Tabs>
                        </div>
                        <Button
                          type="button"
                          onClick={handleCreateCategory}
                          disabled={creatingCategory}
                          className="w-full"
                        >
                          {creatingCategory ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Criando categoria...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Criar categoria
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <CategoriesDragDrop
                    categories={categories}
                    selectedCategories={selectedCategories}
                    onSelectionChange={setSelectedCategories}
                    filter={categoryFilter}
                    onFilterChange={setCategoryFilter}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Button
              onClick={handleSearch}
              disabled={
                loading ||
                (selectedCategories.length === 0 && !freeTextSearch.trim())
              }
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar Negócios
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 overflow-hidden">
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
            <Card className="flex-1 min-h-0 overflow-hidden">
              <CardContent className="p-0 h-full">
                <InteractiveMap
                  center={mapCenter}
                  radius={searchParams.radius}
                  onLocationChange={handleMapLocationChange}
                  onRadiusChange={handleMapRadiusChange}
                  address={currentAddress}
                  className="h-full"
                />
              </CardContent>
            </Card>

            <Card className="p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buscar Localização</Label>
                  <LocationAutocomplete
                    value={searchParams.location}
                    onChange={(value) => {
                      setSearchParams((prev) => ({ ...prev, location: value }));
                      inferUfAndMunicipioFromAddress(value);
                    }}
                    onLocationSelect={handleLocationSelect}
                    placeholder="Digite uma cidade, endereço ou localização..."
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Busca textual livre</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFreeTextExpanded((prev) => !prev)}
                        className="h-7 w-7 p-0"
                        title={
                          freeTextExpanded ? "Recolher campo" : "Expandir campo"
                        }
                        aria-label={
                          freeTextExpanded ? "Recolher campo" : "Expandir campo"
                        }
                      >
                        {freeTextExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFreeTextSearch("")}
                        disabled={!freeTextSearch.trim()}
                        className="h-7 px-2"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Limpar
                      </Button>
                    </div>
                  </div>
                  {freeTextExpanded && (
                    <>
                      <Input
                        value={freeTextSearch}
                        onChange={(event) =>
                          setFreeTextSearch(event.target.value)
                        }
                        placeholder={freeTextPlaceholder}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use este campo quando não quiser selecionar categorias.
                      </p>
                    </>
                  )}
                </div>

                {searchSource === "google" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>
                        Raio de Busca: {formatRadius(searchParams.radius)}
                      </Label>
                      <Badge variant="secondary">
                        {formatRadius(searchParams.radius)}
                      </Badge>
                    </div>
                    <Slider
                      min={1000}
                      max={50000}
                      step={1000}
                      value={[searchParams.radius]}
                      onValueChange={(value) => {
                        setSearchParams((prev) => ({
                          ...prev,
                          radius: value[0],
                        }));
                        handleMapRadiusChange(value[0]);
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 km</span>
                      <span>50 km</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      UF e município inferidos automaticamente pelo campo de
                      localização.
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        UF: {casaDosDadosParams.uf || "-"}
                      </Badge>
                      <Badge variant="outline">
                        Município: {casaDosDadosParams.municipio || "-"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                {loading && (
                  <Card className="p-0">
                    <AnimatedLoading />
                  </Card>
                )}

                {!loading && searchResults.length > 0 && (
                  <>
                    <Card className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">
                            Resultados ({filteredAndSortedResults.length})
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedBusinesses.length > 0 &&
                              `${selectedBusinesses.length} selecionado(s)`}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          {selectedBusinesses.length > 0 && (
                            <Button onClick={handleAddToLeads} size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar {selectedBusinesses.length} Lead(s)
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-muted-foreground" />
                          <Label className="text-sm">Ordenar por:</Label>
                          <Select
                            value={sortBy}
                            onValueChange={(
                              value: "name" | "rating" | "category",
                            ) => setSortBy(value)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="name">
                                <div className="flex items-center gap-2">
                                  <ArrowUpDown className="w-4 h-4" />
                                  Nome
                                </div>
                              </SelectItem>
                              <SelectItem value="rating">
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4" />
                                  Avaliação
                                </div>
                              </SelectItem>
                              <SelectItem value="category">
                                <div className="flex items-center gap-2">
                                  <Filter className="w-4 h-4" />
                                  Categoria
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">
                            Filtrar por avaliação:
                          </Label>
                          <Select
                            value={filterRating?.toString() || "all"}
                            onValueChange={(value) =>
                              setFilterRating(
                                value === "all" ? null : Number(value),
                              )
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              <SelectItem value="4">4+ estrelas</SelectItem>
                              <SelectItem value="3">3+ estrelas</SelectItem>
                              <SelectItem value="2">2+ estrelas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredAndSortedResults.map((business) => {
                        const originalIndex = searchResults.findIndex(
                          (b) =>
                            b.name === business.name &&
                            b.address === business.address,
                        );
                        const isSelected =
                          originalIndex !== -1 &&
                          selectedBusinesses.includes(originalIndex);

                        return (
                          <Card
                            key={`${business.name}-${business.address}-${originalIndex}`}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md"
                                : "hover:border-accent"
                            }`}
                            onClick={() =>
                              originalIndex !== -1 &&
                              handleBusinessPreview(business, originalIndex)
                            }
                          >
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-base mb-1 line-clamp-1">
                                    {business.name}
                                  </h4>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <p className="line-clamp-2">
                                      {business.address}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBusinessPreview(
                                        business,
                                        originalIndex,
                                      );
                                    }}
                                    className="h-8 w-8 p-0"
                                    title="Ver detalhes"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {originalIndex !== -1 && (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() =>
                                        handleBusinessToggle(originalIndex)
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      className="shrink-0"
                                    />
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {business.category}
                                </Badge>
                                {business.rating && (
                                  <Badge variant="outline" className="text-xs">
                                    <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                                    {business.rating.toFixed(1)}
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-1.5 pt-2 border-t">
                                {business.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground">
                                      {business.phone}
                                    </span>
                                  </div>
                                )}
                                {business.email && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground truncate">
                                      {business.email}
                                    </span>
                                  </div>
                                )}
                                {business.latitude && business.longitude && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground text-xs">
                                      {business.latitude.toFixed(4)},{" "}
                                      {business.longitude.toFixed(4)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {filteredAndSortedResults.length === 0 &&
                      searchResults.length > 0 && (
                        <Card className="p-8 text-center">
                          <p className="text-muted-foreground">
                            Nenhum resultado encontrado com os filtros
                            aplicados.
                          </p>
                        </Card>
                      )}
                  </>
                )}

                {!loading && searchResults.length === 0 && (
                  <Card className="p-8 text-center">
                    <MapIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Nenhum resultado ainda
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Selecione as categorias e clique em "Buscar Negócios" para
                      começar
                    </p>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <LeadPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        business={previewBusiness}
        isSelected={
          previewBusiness
            ? (() => {
                const index = searchResults.findIndex(
                  (b) =>
                    b.name === previewBusiness.name &&
                    b.address === previewBusiness.address,
                );
                return index !== -1 && selectedBusinesses.includes(index);
              })()
            : false
        }
        onToggleSelection={handlePreviewToggleSelection}
      />
    </Layout>
  );
};

export default LeadSearch;
