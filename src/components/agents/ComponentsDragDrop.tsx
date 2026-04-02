import React, { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  TrendingUp,
  MessageCircle,
  BarChart2,
  Lock,
  X,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Target,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { IComponentData } from "@/services/components/ComponentDomain";
import { ComponentConfigService } from "@/services/components/ComponentConfig";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface ComponentsDragDropProps {
  components: IComponentData[];
  selectedComponentIds: string[];
  availableComponentIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

interface SortableComponentProps {
  component: IComponentData;
  onRemove: () => void;
  onRemoveWithConfirmation?: (componentId: string, identifier: string) => void;
}

interface ComponentVisualInfo {
  icon: React.ReactNode;
  hint: string;
  color: string;
}

const getComponentVisualInfo = (identifier: string): ComponentVisualInfo => {
  switch (identifier) {
    case "email_sender":
      return {
        icon: <Mail className="w-5 h-5" />,
        hint: "Envio automático de emails e follow-ups.",
        color: "text-blue-500",
      };
    case "meeting_scheduler":
      return {
        icon: <Calendar className="w-5 h-5" />,
        hint: "Agendamento de reuniões e compromissos.",
        color: "text-green-500",
      };
    case "crm_query":
      return {
        icon: <FileText className="w-5 h-5" />,
        hint: "Consulta de informações no CRM.",
        color: "text-purple-500",
      };
    case "proposal_creator":
      return {
        icon: <MessageSquare className="w-5 h-5" />,
        hint: "Criação e envio de propostas comerciais.",
        color: "text-orange-500",
      };
    case "auto_followup":
      return {
        icon: <TrendingUp className="w-5 h-5" />,
        hint: "Follow-ups automáticos com leads e clientes.",
        color: "text-cyan-500",
      };
    case "whatsapp_integration":
      return {
        icon: <MessageCircle className="w-5 h-5" />,
        hint: "WhatsApp: após ativar, selecione na mesma etapa qual instância conectada pertence a este agente (cada instância só pode estar em um agente).",
        color: "text-emerald-500",
      };
    case "sentiment_analysis":
      return {
        icon: <BarChart2 className="w-5 h-5" />,
        hint: "Análise de sentimento das mensagens.",
        color: "text-pink-500",
      };
    case "report_generator":
      return {
        icon: <BarChart2 className="w-5 h-5" />,
        hint: "Geração de relatórios de desempenho.",
        color: "text-indigo-500",
      };
    case "bant_analysis":
      return {
        icon: <Target className="w-5 h-5" />,
        hint: "Análise BANT para qualificação de leads (Budget, Authority, Need, Timeline).",
        color: "text-amber-500",
      };
    case "auto_lead_status_update":
      return {
        icon: <RefreshCw className="w-5 h-5" />,
        hint: "Atualização automática de status do lead baseada no contexto da conversa.",
        color: "text-violet-500",
      };
    default:
      return {
        icon: <BarChart2 className="w-5 h-5" />,
        hint: "Habilidade adicional para o agente.",
        color: "text-gray-500",
      };
  }
};

const SortableComponent = ({
  component,
  onRemove,
  onRemoveWithConfirmation,
}: SortableComponentProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const visualInfo = getComponentVisualInfo(component.identifier);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveWithConfirmation) {
      onRemoveWithConfirmation(component.id, component.identifier);
    } else {
      onRemove();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-secondary/80 hover:border-primary/60 hover:bg-secondary transition-all shadow-sm",
        isDragging && "shadow-lg scale-105 z-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className={cn("flex items-center gap-2", visualInfo.color)}>
        {visualInfo.icon}
      </div>
      <div className="flex flex-col min-w-0">
        <Label className="font-medium text-xs cursor-pointer truncate">
          {component.name}
        </Label>
        <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
          {visualInfo.hint}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 ml-1"
        onClick={handleRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};

const COMPONENTS_PER_PAGE = 9;

export const ComponentsDragDrop = ({
  components,
  selectedComponentIds,
  availableComponentIds,
  onSelectionChange,
}: ComponentsDragDropProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [componentToRemove, setComponentToRemove] = useState<{
    id: string;
    identifier: string;
  } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const selectedComponents = selectedComponentIds
    .map((id) => components.find((c) => c.id === id))
    .filter((c): c is IComponentData => Boolean(c));

  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) {
      return components;
    }
    const query = searchQuery.toLowerCase();
    return components.filter(
      (component) =>
        component.name.toLowerCase().includes(query) ||
        component.description.toLowerCase().includes(query) ||
        component.identifier.toLowerCase().includes(query)
    );
  }, [components, searchQuery]);

  const componentsWithMeta = filteredComponents.map((component) => {
    const isAvailable = availableComponentIds.includes(component.id);
    const isSelected = selectedComponentIds.includes(component.id);
    return {
      component,
      isAvailable,
      isSelected,
      visualInfo: getComponentVisualInfo(component.identifier),
    };
  });

  const totalPages = Math.ceil(componentsWithMeta.length / COMPONENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * COMPONENTS_PER_PAGE;
  const endIndex = startIndex + COMPONENTS_PER_PAGE;
  const paginatedComponents = componentsWithMeta.slice(startIndex, endIndex);

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = selectedComponentIds.indexOf(active.id as string);
    const newIndex = selectedComponentIds.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onSelectionChange(arrayMove(selectedComponentIds, oldIndex, newIndex));
  };

  const handleAddComponent = (componentId: string) => {
    if (!availableComponentIds.includes(componentId)) {
      return;
    }

    if (selectedComponentIds.includes(componentId)) {
      handleRemoveComponent(componentId);
      return;
    }

    onSelectionChange([...selectedComponentIds, componentId]);
  };

  const handleRemoveComponent = useCallback(
    (componentId: string, identifier?: string) => {
      if (identifier === "whatsapp_integration") {
        setComponentToRemove({ id: componentId, identifier });
        setConfirmRemoveOpen(true);
      } else {
        onSelectionChange(
          selectedComponentIds.filter((id) => id !== componentId)
        );
      }
    },
    [selectedComponentIds, onSelectionChange]
  );

  const handleConfirmRemove = useCallback(() => {
    if (componentToRemove) {
      onSelectionChange(
        selectedComponentIds.filter((id) => id !== componentToRemove.id)
      );
      toast.success("WhatsApp removido com sucesso");
      setComponentToRemove(null);
      setConfirmRemoveOpen(false);
    }
  }, [componentToRemove, selectedComponentIds, onSelectionChange]);

  const handleConfigureComponent = (
    componentId: string,
    identifier: string
  ) => {
    navigate(`/components/${componentId}/configure`, {
      state: { componentId, identifier },
    });
  };

  return (
    <>
      <ConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        onConfirm={handleConfirmRemove}
        title="Remover WhatsApp?"
        description="O WhatsApp é o componente padrão. Tem certeza que deseja removê-lo?"
        confirmText="Remover"
        cancelText="Cancelar"
        variant="destructive"
      />
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <p className="text-base font-semibold tracking-tight">
                Habilidades selecionadas
              </p>
              <p className="text-xs text-muted-foreground">
                Arraste para ordenar da mais importante para a menos importante.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedComponents.length} habilidade(s)
            </Badge>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedComponentIds}
              strategy={rectSortingStrategy}
            >
              <div className="min-h-[100px] p-4 border-2 border-dashed border-muted rounded-lg bg-muted/30 flex flex-wrap gap-3">
                {selectedComponents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center w-full">
                    <p className="text-sm font-medium text-muted-foreground">
                      Nenhuma habilidade selecionada ainda
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Use a biblioteca de componentes abaixo para adicionar
                      habilidades ao agente.
                    </p>
                  </div>
                ) : (
                  selectedComponents.map((component) => (
                    <SortableComponent
                      key={component.id}
                      component={component}
                      onRemove={() => handleRemoveComponent(component.id)}
                      onRemoveWithConfirmation={handleRemoveComponent}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-base font-semibold tracking-tight">
                Biblioteca de componentes
              </p>
              <p className="text-xs text-muted-foreground">
                Clique para ativar ou desativar habilidades. Itens bloqueados
                ficam esmaecidos, mas ainda visíveis.
              </p>
            </div>
            <Badge variant="secondary" className="text-xs w-fit">
              {componentsWithMeta.length} componente(s)
            </Badge>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar componentes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <div className="min-h-[400px]">
            {paginatedComponents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhum componente encontrado
                </p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery
                    ? "Tente buscar com outros termos"
                    : "Nenhum componente disponível"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedComponents.map(
                  ({ component, isAvailable, isSelected, visualInfo }) => {
                    const statusVariant = isSelected
                      ? "default"
                      : isAvailable
                      ? "outline"
                      : "outline";

                    return (
                      <div
                        key={component.id}
                        className={cn(
                          "relative flex flex-col rounded-lg border bg-background/60 transition-all",
                          "hover:border-primary/50 hover:bg-primary/5 hover:shadow-md",
                          !isAvailable &&
                            "opacity-60 cursor-not-allowed hover:border-border hover:bg-background/60 hover:shadow-none"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            isAvailable && handleAddComponent(component.id)
                          }
                          disabled={!isAvailable}
                          className={cn(
                            "flex-1 flex flex-col items-stretch gap-3 px-4 py-4 text-left min-w-0 w-full",
                            !isAvailable && "cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div
                                className={cn(
                                  "flex-shrink-0",
                                  visualInfo.color
                                )}
                              >
                                {visualInfo.icon}
                              </div>
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground break-words overflow-hidden">
                                {component.identifier.replace(/_/g, " ")}
                              </span>
                            </div>
                            <Badge
                              variant={statusVariant}
                              className={cn(
                                "text-[10px] px-2 py-0 flex-shrink-0",
                                isSelected &&
                                  "bg-primary text-primary-foreground",
                                !isAvailable && "border-dashed"
                              )}
                            >
                              {isSelected
                                ? "Selecionado"
                                : isAvailable
                                ? "Disponível"
                                : "Bloqueado"}
                            </Badge>
                          </div>

                          <div className="space-y-1.5 min-w-0">
                            <p className="text-sm font-semibold leading-tight break-words">
                              {component.name}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                              {component.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 break-words">
                              {visualInfo.hint}
                            </p>
                          </div>

                          {!isAvailable && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Lock className="w-3 h-3" />
                              <span>Não liberado</span>
                            </div>
                          )}
                        </button>

                        {isSelected &&
                          ComponentConfigService.requiresConfiguration(
                            component.identifier
                          ) &&
                          ComponentConfigService.getConfigType(
                            component.identifier
                          ) !== "custom" && (
                            <div className="px-4 pb-3 pt-0 border-t border-border/50">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfigureComponent(
                                    component.id,
                                    component.identifier
                                  );
                                }}
                              >
                                <Settings className="w-3 h-3 mr-2" />
                                Configurar Componente
                              </Button>
                            </div>
                          )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {startIndex + 1}-
                {Math.min(endIndex, componentsWithMeta.length)} de{" "}
                {componentsWithMeta.length} componente(s)
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNum);
                          }}
                          isActive={currentPage === pageNum}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages)
                          setCurrentPage(currentPage + 1);
                      }}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};
