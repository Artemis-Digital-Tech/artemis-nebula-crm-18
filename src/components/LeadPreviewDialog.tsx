import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  Mail,
  Map,
  Star,
  Tag,
  ExternalLink,
  CheckCircle2,
  Hash,
  Calendar,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { cleanPhoneNumber, formatPhoneDisplay } from "@/lib/utils";

interface BusinessResult {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  category: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
  cnpj?: string;
  razaoSocial?: string;
  porte?: string;
  matrizFilial?: string;
  dataAbertura?: string;
  capitalSocial?: number;
  naturezaJuridica?: string;
}

interface LeadPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: BusinessResult | null;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export const LeadPreviewDialog = ({
  open,
  onOpenChange,
  business,
  isSelected = false,
  onToggleSelection,
}: LeadPreviewDialogProps) => {
  if (!business) return null;

  const handleOpenGoogleMaps = () => {
    if (business.latitude && business.longitude) {
      const url = `https://www.google.com/maps?q=${business.latitude},${business.longitude}`;
      window.open(url, "_blank");
    }
  };

  const handleCallPhone = () => {
    if (business.phone) {
      const phoneForCall = cleanPhoneNumber(business.phone);
      window.location.href = `tel:${phoneForCall || business.phone}`;
    }
  };

  const handleSendEmail = () => {
    if (business.email) {
      window.location.href = `mailto:${business.email}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex-1">
              <h2 className="text-xl font-bold">{business.name}</h2>
            </div>
            {onToggleSelection && (
              <Button
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection();
                }}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSelected ? "Selecionado" : "Selecionar"}
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Visualize todas as informações disponíveis deste lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm">
              <Tag className="w-3 h-3 mr-1" />
              {business.category}
            </Badge>
            {business.rating && (
              <Badge variant="outline" className="text-sm">
                <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                {business.rating.toFixed(1)} estrelas
              </Badge>
            )}
            {business.porte && (
              <Badge variant="outline" className="text-sm">
                {business.porte}
              </Badge>
            )}
            {business.matrizFilial && (
              <Badge variant="outline" className="text-sm">
                {business.matrizFilial}
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            {business.cnpj && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Hash className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    CNPJ
                  </h3>
                  <p className="text-base font-mono">
                    {business.cnpj.replace(
                      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                      "$1.$2.$3/$4-$5",
                    )}
                  </p>
                </div>
              </div>
            )}

            {business.razaoSocial && business.razaoSocial !== business.name && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Briefcase className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Razão Social
                  </h3>
                  <p className="text-base">{business.razaoSocial}</p>
                </div>
              </div>
            )}

            {business.dataAbertura && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Data de Abertura
                  </h3>
                  <p className="text-base">
                    {new Date(business.dataAbertura).toLocaleDateString(
                      "pt-BR",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>
            )}

            {business.capitalSocial !== undefined &&
              business.capitalSocial > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <DollarSign className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Capital Social
                    </h3>
                    <p className="text-base">
                      R${" "}
                      {business.capitalSocial.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              )}

            {business.naturezaJuridica && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Briefcase className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Natureza Jurídica
                  </h3>
                  <p className="text-base">{business.naturezaJuridica}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Endereço
                </h3>
                <p className="text-base">{business.address}</p>
                {business.latitude && business.longitude && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 gap-2"
                    onClick={handleOpenGoogleMaps}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir no Google Maps
                  </Button>
                )}
              </div>
            </div>

            {business.phone && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Telefone
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-base">{formatPhoneDisplay(business.phone)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCallPhone}
                      className="gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      Ligar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {business.email && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    E-mail
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-base break-all">{business.email}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSendEmail}
                      className="gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Enviar E-mail
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {business.latitude && business.longitude && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Map className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Coordenadas
                  </h3>
                  <p className="text-sm font-mono">
                    {business.latitude.toFixed(6)}, {business.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {business.cnpj
                  ? "Informações da Casa dos Dados"
                  : "Informações do Google Places"}
              </span>
              {business.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {business.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

