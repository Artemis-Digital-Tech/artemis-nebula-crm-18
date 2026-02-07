import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Trash2,
  DollarSign,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  CheckCircle,
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Linkedin,
  Briefcase,
  TrendingUp,
  Users,
  FileText,
  Sparkles,
  Plus,
  X,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import {
  cleanPhoneNumber,
  formatPhoneDisplay,
  formatWhatsAppNumber,
  cn,
} from "@/lib/utils";
import { LeadStatusService } from "@/services/LeadStatusService";
import {
  LeadValueTypeRepository,
  type LeadValueType,
} from "@/services/leadValueTypes";
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

const valueTypeRepository = new LeadValueTypeRepository();

const LeadForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== "new";
  const { organization } = useOrganization();
  const statusService = new LeadStatusService();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [aiInteractions, setAiInteractions] = useState<any[]>([]);
  const [defaultAIInteractionId, setDefaultAIInteractionId] = useState<
    string | null
  >(null);
  const [invalidWhatsAppConfirmed, setInvalidWhatsAppConfirmed] =
    useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [isValidatingWhatsApp, setIsValidatingWhatsApp] = useState(false);
  const [leadRemoteJid, setLeadRemoteJid] = useState<string | null>(null);
  const [leadWhatsappVerified, setLeadWhatsappVerified] =
    useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [statusOptions, setStatusOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    status: "",
    contact_email: "",
    contact_whatsapp: "",
    phone: "",
    source: "",
    integration_start_time: "09:00",
    payment_amount: "",
    ai_interaction_id: "",
    company_name: "",
    job_title: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "Brasil",
    website: "",
    linkedin_url: "",
    notes: "",
    industry: "",
    annual_revenue: "",
    number_of_employees: "",
  });
  const [paymentData, setPaymentData] = useState({
    payment_link_url: "",
    payment_stripe_id: "",
    payment_status: "nao_criado",
  });
  const [customValues, setCustomValues] = useState<
    Array<{ value: string; description: string }>
  >([]);
  const [valueTypes, setValueTypes] = useState<LeadValueType[]>([]);
  const [valueEntries, setValueEntries] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCategories();
    fetchAIInteractions();
    fetchDefaultAIInteraction();
  }, []);

  useEffect(() => {
    if (!organization?.id) return;
    valueTypeRepository
      .findAllByOrganization(organization.id)
      .then(setValueTypes)
      .catch(() => setValueTypes([]));
  }, [organization?.id]);

  useEffect(() => {
    if (!organization?.id) return;

    const loadData = async () => {
      try {
        const statuses = await statusService.getAll(organization.id);
        const options = statuses.map((s) => ({
          id: s.status_key,
          label: s.label,
        }));
        setStatusOptions(options);

        if (!isEdit && !formData.status) {
          const newStatus = statuses.find((s) => s.status_key === "new");
          const initialStatus =
            newStatus?.status_key || statuses[0]?.status_key || "";
          if (initialStatus) {
            setFormData((prev) => ({ ...prev, status: initialStatus }));
          }
        }
      } catch (error: any) {
        console.error("Error fetching lead statuses:", error);
        toast.error("Erro ao carregar status de lead");
      }

      if (isEdit) {
        await fetchLead();
      }
    };

    loadData();
  }, [organization?.id, isEdit, id]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("lead_categories").select("*");
    setCategories(data || []);
  };

  const fetchAIInteractions = async () => {
    const { data } = await supabase
      .from("ai_interaction_settings")
      .select("*")
      .order("name");
    setAiInteractions(data || []);
  };

  const fetchDefaultAIInteraction = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("default_ai_interaction_id")
        .maybeSingle();

      if (error) {
        console.error("Error fetching default AI interaction:", error);
        return;
      }

      if (data?.default_ai_interaction_id) {
        setDefaultAIInteractionId(data.default_ai_interaction_id);
        if (!isEdit && !formData.ai_interaction_id) {
          setFormData((prev) => ({
            ...prev,
            ai_interaction_id: data.default_ai_interaction_id,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching default AI interaction:", error);
    }
  };

  const getSelectedAIInteractionId = () => {
    return formData.ai_interaction_id || defaultAIInteractionId || undefined;
  };

  const fetchLead = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Fetch lead error:", error);
        throw error;
      }

      if (data) {
        setFormData({
          name: data.name || "",
          description: data.description || "",
          category: data.category || "",
          status: data.status,
          contact_email: data.contact_email || "",
          contact_whatsapp: data.contact_whatsapp || "",
          phone: data.phone || "",
          source: data.source || "",
          integration_start_time:
            data.integration_start_time?.slice(0, 5) || "09:00",
          payment_amount: data.payment_amount
            ? data.payment_amount.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "",
          ai_interaction_id: data.ai_interaction_id || "",
          company_name: data.company_name || "",
          job_title: data.job_title || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          zip_code: data.zip_code || "",
          country: data.country || "Brasil",
          website: data.website || "",
          linkedin_url: data.linkedin_url || "",
          notes: data.notes || "",
          industry: data.industry || "",
          annual_revenue: data.annual_revenue
            ? data.annual_revenue.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "",
          number_of_employees: data.number_of_employees?.toString() || "",
        });
        setPaymentData({
          payment_link_url: data.payment_link_url || "",
          payment_stripe_id: data.payment_stripe_id || "",
          payment_status: data.payment_status,
        });
        setLeadRemoteJid(data.remote_jid);
        setLeadWhatsappVerified(data.whatsapp_verified || false);

        if (data.custom_values && Array.isArray(data.custom_values)) {
          const formattedValues = data.custom_values.map((item: any) => ({
            value:
              typeof item.value === "number"
                ? item.value.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : item.value || "",
            description: item.description || "",
          }));
          setCustomValues(formattedValues);
        } else {
          setCustomValues([]);
        }
        valueTypeRepository
          .getEntriesByLeadId(id)
          .then((entries) => {
            const map: Record<string, string> = {};
            entries.forEach((e) => {
              map[e.value_type_id] = e.value.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
            });
            setValueEntries(map);
          })
          .catch(() => setValueEntries({}));
      }
    } catch (error: any) {
      toast.error("Erro ao carregar lead");
      console.error("Fetch error:", error);
    }
  };

  const calculateFormProgress = () => {
    const fields = [
      formData.name,
      formData.contact_email,
      formData.contact_whatsapp,
      formData.company_name,
      formData.city,
      formData.state,
    ];
    const filledFields = fields.filter((f) => f && f.trim() !== "").length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const formatCustomValuesForSave = () => {
    return customValues
      .filter((item) => item.value && item.value.trim() !== "")
      .map((item) => {
        const numericValue = item.value.replace(/\./g, "").replace(",", ".");
        const parsedValue = parseFloat(numericValue);
        return {
          value: isNaN(parsedValue) ? item.value : parsedValue,
          description: item.description || "",
        };
      });
  };

  const addCustomValue = () => {
    setCustomValues([...customValues, { value: "", description: "" }]);
  };

  const removeCustomValue = (index: number) => {
    setCustomValues(customValues.filter((_, i) => i !== index));
  };

  const updateCustomValue = (
    index: number,
    field: "value" | "description",
    newValue: string
  ) => {
    const updated = [...customValues];
    if (field === "value") {
      const cleaned = newValue.replace(/\D/g, "");
      if (cleaned === "") {
        updated[index] = { ...updated[index], value: "" };
      } else {
        const amount = parseFloat(cleaned) / 100;
        const formatted = amount.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        updated[index] = { ...updated[index], value: formatted };
      }
    } else {
      updated[index] = { ...updated[index], description: newValue };
    }
    setCustomValues(updated);
  };

  const updateValueEntry = (valueTypeId: string, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned === "") {
      setValueEntries((prev) => ({ ...prev, [valueTypeId]: "" }));
      return;
    }
    const amount = parseFloat(cleaned) / 100;
    const formatted = amount.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setValueEntries((prev) => ({ ...prev, [valueTypeId]: formatted }));
  };

  const buildValueEntriesForSave = (): Array<{
    value_type_id: string;
    value: number;
  }> => {
    return valueTypes
      .filter((vt) => valueEntries[vt.id] && valueEntries[vt.id].trim() !== "")
      .map((vt) => {
        const raw = valueEntries[vt.id].replace(/\./g, "").replace(",", ".");
        const num = parseFloat(raw);
        return { value_type_id: vt.id, value: isNaN(num) ? 0 : num };
      })
      .filter((e) => e.value > 0);
  };

  const handleSubmitWithoutValidation = async () => {
    setLoading(true);
    try {
      const cleanedPhone = formData.contact_whatsapp
        ? formatWhatsAppNumber(formData.contact_whatsapp)
        : null;
      const remoteJid = null;
      const whatsappVerified = false;

      const paymentAmount = formData.payment_amount
        ? parseFloat(
            formData.payment_amount.replace(/\./g, "").replace(",", ".")
          )
        : null;

      const annualRevenue = formData.annual_revenue
        ? parseFloat(
            formData.annual_revenue.replace(/\./g, "").replace(",", ".")
          )
        : null;

      const aiInteractionIdToSave =
        formData.ai_interaction_id === defaultAIInteractionId
          ? null
          : formData.ai_interaction_id || null;

      const leadData = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        status: formData.status,
        contact_email: formData.contact_email || null,
        contact_whatsapp: cleanedPhone,
        phone: formData.phone || null,
        remote_jid: remoteJid,
        whatsapp_verified: whatsappVerified,
        source: formData.source || null,
        integration_start_time: formData.integration_start_time
          ? `${formData.integration_start_time}:00+00`
          : null,
        payment_amount: paymentAmount,
        ai_interaction_id: aiInteractionIdToSave,
        payment_link_url: paymentData.payment_link_url || null,
        payment_stripe_id: paymentData.payment_stripe_id || null,
        payment_status: paymentData.payment_status,
        company_name: formData.company_name || null,
        job_title: formData.job_title || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        country: formData.country || null,
        website: formData.website || null,
        linkedin_url: formData.linkedin_url || null,
        notes: formData.notes || null,
        industry: formData.industry || null,
        annual_revenue: annualRevenue,
        number_of_employees: formData.number_of_employees
          ? parseInt(formData.number_of_employees)
          : null,
        custom_values: formatCustomValuesForSave(),
        ...(isEdit ? {} : { organization_id: organization?.id }),
      };

      if (isEdit) {
        const { error } = await supabase
          .from("leads")
          .update(leadData)
          .eq("id", id);
        if (error) throw error;
        await valueTypeRepository.replaceEntriesForLead(
          id,
          buildValueEntriesForSave()
        );
        toast.success(
          "Lead atualizado! ⚠️ WhatsApp não verificado - mensagens automáticas desabilitadas."
        );
      } else {
        const { data: inserted, error } = await supabase
          .from("leads")
          .insert([leadData])
          .select("id")
          .single();
        if (error) throw error;
        const leadId = inserted?.id;
        if (leadId) {
          await valueTypeRepository.replaceEntriesForLead(
            leadId,
            buildValueEntriesForSave()
          );
        }
        toast.success(
          "Lead criado! ⚠️ WhatsApp não verificado - mensagens automáticas desabilitadas."
        );
      }

      setInvalidWhatsAppConfirmed(false);
      navigate("/");
    } catch (error: any) {
      const errorMessage = error?.message || "Erro ao salvar lead";
      toast.error(errorMessage);
      console.error("Save lead error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.contact_whatsapp) {
        const cleanedPhone = cleanPhoneNumber(formData.contact_whatsapp);
        if (cleanedPhone.length < 10 || cleanedPhone.length > 13) {
          toast.error(
            "Número de WhatsApp inválido. Use formato: (11) 99999-9999"
          );
          setLoading(false);
          return;
        }
      }

      const paymentAmount = formData.payment_amount
        ? parseFloat(
            formData.payment_amount.replace(/\./g, "").replace(",", ".")
          )
        : null;

      const annualRevenue = formData.annual_revenue
        ? parseFloat(
            formData.annual_revenue.replace(/\./g, "").replace(",", ".")
          )
        : null;

      const cleanedPhone = formData.contact_whatsapp
        ? formatWhatsAppNumber(formData.contact_whatsapp)
        : null;

      let remoteJid = null;
      let whatsappVerified = false;
      let hasInstance = false;

      const { data: instancesData } = await supabase
        .from("whatsapp_instances")
        .select("id, instance_name, status")
        .eq("organization_id", organization?.id)
        .eq("status", "connected")
        .limit(1);

      hasInstance = instancesData && instancesData.length > 0;

      if (cleanedPhone && !invalidWhatsAppConfirmed) {
        try {
          if (hasInstance) {
            const { data: checkData, error: checkError } =
              await supabase.functions.invoke("evolution-check-whatsapp", {
                body: { numbers: [cleanedPhone] },
              });

            if (checkError) {
              console.error("Error checking WhatsApp:", checkError);
              toast.warning(
                "Não foi possível validar o WhatsApp automaticamente. O lead será criado sem validação."
              );
              remoteJid = null;
              whatsappVerified = false;
            } else if (
              checkData?.results?.[0]?.exists &&
              checkData.results[0].jid
            ) {
              remoteJid = checkData.results[0].jid;
              whatsappVerified = true;
              console.log("WhatsApp verified, jid:", remoteJid);
            } else {
              toast.warning(
                "Este número não está registrado no WhatsApp. O lead será criado sem validação."
              );
              remoteJid = null;
              whatsappVerified = false;
            }
          } else {
            toast.info(
              "⚠️ Nenhuma instância WhatsApp conectada na organização. O lead será criado, mas será necessário validar o WhatsApp posteriormente para agendar interações."
            );
            remoteJid = null;
            whatsappVerified = false;
          }
        } catch (error) {
          console.error("Error validating WhatsApp:", error);
          toast.warning(
            "Erro ao validar WhatsApp. O lead será criado sem validação."
          );
          remoteJid = null;
          whatsappVerified = false;
        }
      } else if (cleanedPhone && invalidWhatsAppConfirmed) {
        remoteJid = null;
        whatsappVerified = false;
      }

      const leadData = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        status: formData.status,
        contact_email: formData.contact_email || null,
        contact_whatsapp: cleanedPhone,
        phone: formData.phone || null,
        remote_jid: remoteJid,
        whatsapp_verified: whatsappVerified,
        source: formData.source || null,
        integration_start_time: formData.integration_start_time
          ? `${formData.integration_start_time}:00+00`
          : null,
        payment_amount: paymentAmount,
        ai_interaction_id: formData.ai_interaction_id || null,
        payment_link_url: paymentData.payment_link_url || null,
        payment_stripe_id: paymentData.payment_stripe_id || null,
        payment_status: paymentData.payment_status,
        company_name: formData.company_name || null,
        job_title: formData.job_title || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        country: formData.country || null,
        website: formData.website || null,
        linkedin_url: formData.linkedin_url || null,
        notes: formData.notes || null,
        industry: formData.industry || null,
        annual_revenue: annualRevenue,
        number_of_employees: formData.number_of_employees
          ? parseInt(formData.number_of_employees)
          : null,
        custom_values: formatCustomValuesForSave(),
        ...(isEdit ? {} : { organization_id: organization?.id }),
      };

      if (isEdit) {
        const { error } = await supabase
          .from("leads")
          .update(leadData)
          .eq("id", id);
        if (error) {
          console.error("Update error:", error);
          throw error;
        }
        await valueTypeRepository.replaceEntriesForLead(
          id,
          buildValueEntriesForSave()
        );

        if (whatsappVerified) {
          toast.success(
            "Lead atualizado com sucesso! ✅ WhatsApp verificado - pronto para agendar interações."
          );
        } else if (cleanedPhone && !hasInstance) {
          toast.success(
            "Lead atualizado com sucesso! ⚠️ Para validar o WhatsApp e agendar interações, configure uma instância WhatsApp conectada na organização."
          );
        } else if (cleanedPhone) {
          toast.success(
            "Lead atualizado com sucesso! ⚠️ WhatsApp não verificado. Você pode validar posteriormente na lista de leads."
          );
        } else {
          toast.success(
            "Lead atualizado com sucesso! ⚠️ Para agendar interações, adicione um WhatsApp válido."
          );
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("leads")
          .insert([leadData])
          .select("id")
          .single();
        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
        const leadId = inserted?.id;
        if (leadId) {
          await valueTypeRepository.replaceEntriesForLead(
            leadId,
            buildValueEntriesForSave()
          );
        }

        if (whatsappVerified) {
          toast.success(
            "Lead criado com sucesso! ✅ WhatsApp verificado - pronto para agendar interações."
          );
        } else if (cleanedPhone && !hasInstance) {
          toast.success(
            "Lead criado com sucesso! ⚠️ Para validar o WhatsApp e agendar interações, configure uma instância WhatsApp conectada na organização."
          );
        } else if (cleanedPhone) {
          toast.success(
            "Lead criado com sucesso! ⚠️ WhatsApp não verificado. Você pode validar posteriormente na lista de leads."
          );
        } else {
          toast.success(
            "Lead criado com sucesso! ⚠️ Para agendar interações, adicione um WhatsApp válido."
          );
        }
      }

      setInvalidWhatsAppConfirmed(false);
      navigate("/");
    } catch (error: any) {
      const errorMessage = error?.message || "Erro ao salvar lead";
      toast.error(errorMessage);
      console.error("Save lead error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este lead?")) return;

    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lead excluído com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao excluir lead");
      console.error(error);
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!isEdit) {
      toast.error("Salve o lead primeiro antes de gerar um link de pagamento");
      return;
    }

    const amount = formData.payment_amount
      ? parseFloat(formData.payment_amount.replace(/\./g, "").replace(",", "."))
      : 0;

    if (!amount || amount <= 0) {
      toast.error(
        "Defina um valor válido para a proposta antes de gerar o link"
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-payment-link",
        {
          body: {
            leadId: id,
            paymentAmount: amount,
          },
        }
      );

      if (error) throw error;

      setPaymentData({
        payment_link_url: data.url,
        payment_stripe_id: data.stripe_id,
        payment_status: "link_gerado",
      });

      await fetchLead();

      window.open(data.url, "_blank");
      toast.success("Checkout aberto! Complete o pagamento na nova aba.");
    } catch (error: any) {
      toast.error("Erro ao gerar checkout de pagamento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateWhatsApp = async () => {
    if (!formData.contact_whatsapp) {
      toast.error("Adicione um número de WhatsApp primeiro");
      return;
    }

    setIsValidatingWhatsApp(true);

    try {
      const cleanedPhone = cleanPhoneNumber(formData.contact_whatsapp);

      if (cleanedPhone.length < 10 || cleanedPhone.length > 13) {
        toast.error(
          "Número de WhatsApp inválido. Use formato: (11) 99999-9999"
        );
        setIsValidatingWhatsApp(false);
        return;
      }

      const { data: checkData, error: checkError } =
        await supabase.functions.invoke("evolution-check-whatsapp", {
          body: { numbers: [cleanedPhone] },
        });

      if (checkError) {
        console.error("Error checking WhatsApp:", checkError);

        const isNoInstanceError =
          checkError.message?.includes("No connected WhatsApp instance") ||
          checkError.message?.includes("connected WhatsApp instance");

        if (isNoInstanceError) {
          setShowWhatsAppDialog(true);
          setIsValidatingWhatsApp(false);
          return;
        }

        toast.error(
          "Erro ao validar WhatsApp: " +
            (checkError.message || "Erro desconhecido")
        );
        setIsValidatingWhatsApp(false);
        return;
      }

      if (checkData?.results?.[0]?.exists && checkData.results[0].jid) {
        const remoteJid = checkData.results[0].jid;

        if (isEdit && id) {
          const { error: updateError } = await supabase
            .from("leads")
            .update({
              remote_jid: remoteJid,
              whatsapp_verified: true,
            })
            .eq("id", id);

          if (updateError) {
            console.error("Error updating lead:", updateError);
            toast.error("Erro ao atualizar lead");
            setIsValidatingWhatsApp(false);
            return;
          }

          setLeadRemoteJid(remoteJid);
          setLeadWhatsappVerified(true);
          toast.success(
            "WhatsApp validado com sucesso! ✅ Agora é possível agendar interações."
          );
        } else {
          setLeadRemoteJid(remoteJid);
          setLeadWhatsappVerified(true);
          toast.success(
            "WhatsApp validado! ✅ O remote_jid será salvo quando você salvar o lead."
          );
        }
      } else {
        toast.warning(
          "Este número não está registrado no WhatsApp. Verifique se o número está correto."
        );
      }
    } catch (error: any) {
      console.error("Error validating WhatsApp:", error);
      toast.error(
        "Erro ao validar WhatsApp: " + (error.message || "Erro desconhecido")
      );
    } finally {
      setIsValidatingWhatsApp(false);
    }
  };

  const formProgress = calculateFormProgress();
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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {isEdit ? "Editar Lead" : "Novo Lead"}
                {leadWhatsappVerified && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    WhatsApp Verificado
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground">
                {isEdit
                  ? "Atualize as informações do lead"
                  : "Adicione um novo lead ao sistema"}
              </p>
            </div>
          </div>
        </div>

        <Card className="p-6 space-y-4 border-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Progresso do Formulário
              </Label>
              <span className="text-sm text-muted-foreground">
                {formProgress}%
              </span>
            </div>
            <Progress value={formProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Complete os campos principais para melhorar o progresso
            </p>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic" className="gap-2">
                <User className="w-4 h-4" />
                Básico
              </TabsTrigger>
              <TabsTrigger value="company" className="gap-2">
                <Building2 className="w-4 h-4" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="contact" className="gap-2">
                <Phone className="w-4 h-4" />
                Contato
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-2">
                <MapPin className="w-4 h-4" />
                Localização
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Avançado
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="basic"
              className="space-y-6 mt-6 animate-fade-in"
            >
              <Card className="p-6 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Informações Básicas</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder="Nome do lead"
                      className="transition-all focus:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Cargo</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) =>
                        setFormData({ ...formData, job_title: e.target.value })
                      }
                      placeholder="Ex: Gerente de Vendas"
                      className="transition-all focus:scale-[1.02]"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category || "none"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          category: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="transition-all focus:scale-[1.02]">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma categoria</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger className="transition-all focus:scale-[1.02]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.label}
                          </SelectItem>
                        ))}
                        {!statusOptions.find(
                          (option) => option.id === formData.status
                        ) &&
                          formData.status && (
                            <SelectItem value={formData.status}>
                              {formData.status}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descreva o lead..."
                    rows={4}
                    className="transition-all focus:scale-[1.01]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Origem do Lead</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                    placeholder="Ex: Google Ads, Indicação, LinkedIn..."
                    className="transition-all focus:scale-[1.02]"
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent
              value="company"
              className="space-y-6 mt-6 animate-fade-in"
            >
              <Card className="p-6 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">
                    Informações da Empresa
                  </h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Nome da Empresa</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    placeholder="Nome da empresa do lead"
                    className="transition-all focus:scale-[1.02]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Setor/Indústria</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) =>
                        setFormData({ ...formData, industry: e.target.value })
                      }
                      placeholder="Ex: Tecnologia, Varejo, Serviços..."
                      className="transition-all focus:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) =>
                          setFormData({ ...formData, website: e.target.value })
                        }
                        placeholder="https://exemplo.com"
                        className="pl-10 transition-all focus:scale-[1.02]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="annual_revenue">Receita Anual (R$)</Label>
                    <div className="relative">
                      <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="annual_revenue"
                        type="text"
                        value={formData.annual_revenue}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (value === "") {
                            setFormData({ ...formData, annual_revenue: "" });
                            return;
                          }
                          const amount = parseFloat(value) / 100;
                          const formatted = amount.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          });
                          setFormData({
                            ...formData,
                            annual_revenue: formatted,
                          });
                        }}
                        placeholder="0,00"
                        className="pl-10 transition-all focus:scale-[1.02]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number_of_employees">
                      Número de Funcionários
                    </Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="number_of_employees"
                        type="number"
                        value={formData.number_of_employees}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            number_of_employees: e.target.value,
                          })
                        }
                        placeholder="Ex: 50"
                        min="0"
                        className="pl-10 transition-all focus:scale-[1.02]"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent
              value="contact"
              className="space-y-6 mt-6 animate-fade-in"
            >
              <Card className="p-6 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Phone className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">
                    Informações de Contato
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact_email: e.target.value,
                          })
                        }
                        placeholder="email@exemplo.com"
                        className="pl-10 transition-all focus:scale-[1.02]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone Fixo</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={
                          formData.phone
                            ? formatPhoneDisplay(formData.phone)
                            : ""
                        }
                        onChange={(e) => {
                          const cleaned = cleanPhoneNumber(e.target.value);
                          setFormData({ ...formData, phone: cleaned });
                        }}
                        placeholder="(11) 3333-4444"
                        maxLength={20}
                        className="pl-10 transition-all focus:scale-[1.02]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_whatsapp">WhatsApp</Label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="contact_whatsapp"
                      value={
                        formData.contact_whatsapp
                          ? formatPhoneDisplay(formData.contact_whatsapp)
                          : ""
                      }
                      onChange={(e) => {
                        const cleaned = cleanPhoneNumber(e.target.value);
                        setFormData({ ...formData, contact_whatsapp: cleaned });
                      }}
                      placeholder="(11) 99999-9999"
                      maxLength={20}
                      className="pl-10 transition-all focus:scale-[1.02]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digite apenas números. Exemplo: 11999998888 ou 5511999998888
                  </p>
                  <Alert className="border-amber-500/50 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      Importante para Agendar Interações
                    </AlertTitle>
                    <AlertDescription className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-1">
                      Para poder agendar interações com IA e iniciar conversas
                      automáticas, este lead precisa ter:
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>WhatsApp válido e verificado</li>
                        <li>
                          Remote JID configurado (gerado automaticamente quando
                          o número é verificado)
                        </li>
                      </ul>
                      {isEdit &&
                        formData.contact_whatsapp &&
                        (!leadRemoteJid || !leadWhatsappVerified) && (
                          <div className="mt-2 pt-2 border-t border-amber-500/30">
                            <p className="mb-2 font-medium">
                              WhatsApp não verificado
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleValidateWhatsApp}
                              disabled={isValidatingWhatsApp}
                              className="w-full gap-2 border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                            >
                              <RefreshCw
                                className={cn(
                                  "w-4 h-4",
                                  isValidatingWhatsApp && "animate-spin"
                                )}
                              />
                              {isValidatingWhatsApp
                                ? "Validando..."
                                : "Validar WhatsApp Agora"}
                            </Button>
                          </div>
                        )}
                      {isEdit && leadRemoteJid && leadWhatsappVerified && (
                        <div className="mt-2 pt-2 border-t border-amber-500/30">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">
                              WhatsApp verificado e pronto para agendar
                              interações
                            </span>
                          </div>
                        </div>
                      )}
                      {!isEdit && (
                        <p className="mt-2">
                          O sistema tentará validar o número automaticamente ao
                          salvar. Se a validação falhar, o lead poderá ser
                          salvo, mas não será possível agendar interações até
                          que o WhatsApp seja verificado.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="linkedin_url"
                      type="url"
                      value={formData.linkedin_url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          linkedin_url: e.target.value,
                        })
                      }
                      placeholder="https://linkedin.com/in/usuario"
                      className="pl-10 transition-all focus:scale-[1.02]"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent
              value="location"
              className="space-y-6 mt-6 animate-fade-in"
            >
              <Card className="p-6 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Localização</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço Completo</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Rua, número, complemento"
                    className="transition-all focus:scale-[1.02]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="São Paulo"
                      className="transition-all focus:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select
                      value={formData.state || undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, state: value })
                      }
                    >
                      <SelectTrigger className="transition-all focus:scale-[1.02]">
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {brazilianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">CEP</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        const formatted =
                          value.length > 5
                            ? `${value.slice(0, 5)}-${value.slice(5, 8)}`
                            : value;
                        setFormData({ ...formData, zip_code: formatted });
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                      className="transition-all focus:scale-[1.02]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    placeholder="Brasil"
                    className="transition-all focus:scale-[1.02]"
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent
              value="advanced"
              className="space-y-6 mt-6 animate-fade-in"
            >
              <Card className="p-6 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">
                    Configurações Avançadas
                  </h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_interaction">
                    <div className="flex items-center gap-2">
                      Configuração de IA para este Lead
                    </div>
                  </Label>
                  <Select
                    value={getSelectedAIInteractionId()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, ai_interaction_id: value })
                    }
                  >
                    <SelectTrigger className="transition-all focus:scale-[1.02]">
                      <SelectValue placeholder="Selecione uma configuração" />
                    </SelectTrigger>
                    <SelectContent>
                      {aiInteractions.map((ai) => (
                        <SelectItem key={ai.id} value={ai.id}>
                          {ai.name}
                          {ai.id === defaultAIInteractionId && " (Padrão)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {defaultAIInteractionId
                      ? "A configuração padrão será usada se nenhuma for selecionada"
                      : "Configure uma configuração padrão em Settings > Configuração de IA"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="integration_start_time">
                    Horário de Integração (n8n)
                  </Label>
                  <Input
                    id="integration_start_time"
                    type="time"
                    value={formData.integration_start_time}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration_start_time: e.target.value,
                      })
                    }
                    className="transition-all focus:scale-[1.02]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Horário diário para iniciar o fluxo de automação
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Valor da Proposta (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium" />
                    <Input
                      id="payment_amount"
                      type="text"
                      value={formData.payment_amount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value === "") {
                          setFormData({ ...formData, payment_amount: "" });
                          return;
                        }
                        const numbers = value;
                        const amount = parseFloat(numbers) / 100;
                        const formatted = amount.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });
                        setFormData({ ...formData, payment_amount: formatted });
                      }}
                      placeholder="0,00"
                      className="pl-12 transition-all focus:scale-[1.02]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor individual desta proposta em Reais
                  </p>
                </div>

                {valueTypes.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">
                        Valores para métricas financeiras
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Preencha os valores cadastrados em Tipos de Valor. Eles
                        serão usados no dashboard.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {valueTypes.map((vt) => (
                          <div key={vt.id} className="space-y-2">
                            <Label htmlFor={`value-entry-${vt.id}`}>
                              {vt.name}
                            </Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id={`value-entry-${vt.id}`}
                                type="text"
                                value={valueEntries[vt.id] ?? ""}
                                onChange={(e) =>
                                  updateValueEntry(vt.id, e.target.value)
                                }
                                placeholder="0,00"
                                className="pl-10"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      Valores Personalizados
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomValue}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Valor
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Defina valores personalizados com descrições para este lead
                    (ex: valor inicial, desconto, adicional, etc.)
                  </p>

                  {customValues.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        Nenhum valor personalizado adicionado
                      </p>
                      <p className="text-xs mt-1">
                        Clique em "Adicionar Valor" para começar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customValues.map((item, index) => (
                        <Card key={index} className="p-4 border-2">
                          <div className="grid gap-4 md:grid-cols-[1fr_2fr_auto] items-end">
                            <div className="space-y-2">
                              <Label htmlFor={`custom-value-${index}`}>
                                Valor (R$)
                              </Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  id={`custom-value-${index}`}
                                  type="text"
                                  value={item.value}
                                  onChange={(e) =>
                                    updateCustomValue(
                                      index,
                                      "value",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0,00"
                                  className="pl-10 transition-all focus:scale-[1.02]"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`custom-description-${index}`}>
                                Descrição
                              </Label>
                              <Input
                                id={`custom-description-${index}`}
                                type="text"
                                value={item.description}
                                onChange={(e) =>
                                  updateCustomValue(
                                    index,
                                    "description",
                                    e.target.value
                                  )
                                }
                                placeholder="Ex: Valor inicial, Desconto, Adicional..."
                                className="transition-all focus:scale-[1.02]"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCustomValue(index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Adicionais</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Anotações importantes sobre este lead..."
                    rows={5}
                    className="transition-all focus:scale-[1.01]"
                  />
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {isEdit && (
            <Card className="p-6 space-y-4 border-accent/30">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold">Pagamento Stripe</h3>
              </div>

              {paymentData.payment_status === "nao_criado" ? (
                <Button
                  type="button"
                  onClick={handleGeneratePaymentLink}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Gerar Link de Pagamento
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">Status:</span>
                    <span className="text-sm capitalize">
                      {paymentData.payment_status.replace("_", " ")}
                    </span>
                  </div>
                  {paymentData.payment_link_url && (
                    <a
                      href={paymentData.payment_link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir Link de Pagamento
                    </a>
                  )}
                  <Button
                    type="button"
                    onClick={handleGeneratePaymentLink}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    Regerar Link
                  </Button>
                </div>
              )}
            </Card>
          )}

          <div className="flex items-center gap-3 pb-6">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? "Salvar Alterações" : "Criar Lead"}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                size="lg"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        </form>
      </div>

      <AlertDialog
        open={showWhatsAppDialog}
        onOpenChange={setShowWhatsAppDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-warning" />
              WhatsApp Não Configurado
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Não há nenhuma instância WhatsApp conectada no momento.</p>
              <p>
                Para validar números de WhatsApp e enviar mensagens automáticas,
                você precisa:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Criar uma instância WhatsApp</li>
                <li>Conectar a instância escaneando o QR Code</li>
                <li>Aguardar a conexão ser estabelecida</li>
              </ul>
              <p className="mt-3 font-medium">
                Deseja configurar o WhatsApp agora ou cadastrar o lead sem
                validação?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowWhatsAppDialog(false);
                setLoading(false);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowWhatsAppDialog(false);
                navigate("/whatsapp");
              }}
              className="bg-primary"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Configurar WhatsApp
            </AlertDialogAction>
            <AlertDialogAction
              onClick={async () => {
                setShowWhatsAppDialog(false);
                setInvalidWhatsAppConfirmed(true);
                await handleSubmitWithoutValidation();
              }}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Continuar Sem Validação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default LeadForm;
