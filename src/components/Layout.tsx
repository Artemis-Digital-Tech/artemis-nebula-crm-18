import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Settings,
  List,
  LogOut,
  FolderKanban,
  SearchCheck,
  Bot,
  Smartphone,
  CreditCard,
  Sparkles,
  FileText,
  MessageSquare,
  ChevronRight,
  Calendar,
  MessageCircle,
  Brain,
  Play,
  TrendingUp,
  Clock,
  CalendarDays,
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast, useToast } from "@/hooks/use-toast";
import { NavLink } from "@/components/NavLink";
import { useOrganization } from "@/hooks/useOrganization";
import { PlanModal } from "@/components/PlanModal";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import logo from "@/assets/logo.png";

interface SubMenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
  subItems?: SubMenuItem[];
}

interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubMenuItem[];
}

interface MenuItemWithSubItemsProps {
  item: MenuItem;
  location: { pathname: string };
  isCollapsed: boolean;
}

const NestedSubMenuItem = ({
  subItem,
  location,
  isCollapsed,
}: {
  subItem: SubMenuItem;
  location: { pathname: string };
  isCollapsed: boolean;
}) => {
  const { setOpen } = useSidebar();
  const hasNestedSubItems = subItem.subItems && subItem.subItems.length > 0;
  const isNestedActive = hasNestedSubItems
    ? subItem.subItems?.some((nested) => location.pathname === nested.url)
    : false;
  const [isNestedOpen, setIsNestedOpen] = useState(isNestedActive || false);

  if (hasNestedSubItems) {
    return (
      <Collapsible asChild open={isNestedOpen} onOpenChange={setIsNestedOpen}>
        <SidebarMenuSubItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuSubButton isActive={isNestedActive} className="w-full">
              <subItem.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{subItem.title}</span>
              <ChevronRight
                className={`ml-auto w-3 h-3 transition-transform duration-200 ${
                  isNestedOpen ? "rotate-90" : ""
                }`}
              />
            </SidebarMenuSubButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="ml-4 mt-1">
              {subItem.subItems?.map((nestedItem) => (
                <SidebarMenuSubItem key={nestedItem.title}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={location.pathname === nestedItem.url}
                    className={
                      nestedItem.comingSoon
                        ? "opacity-60 cursor-not-allowed"
                        : undefined
                    }
                  >
                    <NavLink
                      to={nestedItem.comingSoon ? "#" : nestedItem.url || "#"}
                      onClick={(e) => {
                        if (isCollapsed) {
                          setOpen(true);
                        }
                        if (nestedItem.comingSoon) {
                          e.preventDefault();
                          toast({
                            title: "Em breve",
                            description:
                              "Funcionalidade será liberada em breve.",
                          });
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <nestedItem.icon className="w-4 h-4 shrink-0" />
                      <span>{nestedItem.title}</span>
                      {nestedItem.comingSoon && (
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Em breve
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuSubItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        isActive={location.pathname === subItem.url}
        className={
          subItem.comingSoon ? "opacity-60 cursor-not-allowed" : undefined
        }
      >
        <NavLink
          to={subItem.comingSoon ? "#" : subItem.url || "#"}
          onClick={(e) => {
            if (isCollapsed) {
              setOpen(true);
            }
            if (subItem.comingSoon) {
              e.preventDefault();
              toast({
                title: "Em breve",
                description: "O chat será liberado em breve.",
              });
            }
          }}
          className="flex items-center gap-2"
        >
          <subItem.icon className="w-4 h-4 shrink-0" />
          <span>{subItem.title}</span>
          {subItem.comingSoon && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Em breve
            </span>
          )}
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
};

const MenuItemWithSubItems = ({
  item,
  location,
  isCollapsed,
}: MenuItemWithSubItemsProps) => {
  const { setOpen } = useSidebar();
  const isCategoryActive =
    item.subItems?.some(
      (subItem) =>
        location.pathname === subItem.url ||
        subItem.subItems?.some((nested) => location.pathname === nested.url)
    ) || false;
  const [isOpen, setIsOpen] = useState(isCategoryActive);

  const handleClick = () => {
    if (isCollapsed) {
      setOpen(true);
    }
  };

  return (
    <Collapsible
      asChild
      defaultOpen={isCategoryActive}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={isCategoryActive}
            tooltip={isCollapsed ? item.title : undefined}
            onClick={handleClick}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium">{item.title}</span>}
            {!isCollapsed && (
              <ChevronRight
                className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.subItems?.map((subItem) => (
              <NestedSubMenuItem
                key={subItem.title}
                subItem={subItem}
                location={location}
                isCollapsed={isCollapsed}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

const menuItems: MenuItem[] = [
  { title: "Painel", url: "/dashboard", icon: Home },
  {
    title: "Leads",
    icon: Users,
    subItems: [
      { title: "Todos os Leads", url: "/leads", icon: List },
      { title: "Buscar Leads", url: "/lead-search", icon: SearchCheck },
      { title: "Categorias", url: "/categories", icon: FolderKanban },
      {
        title: "Gerenciar Categorias",
        url: "/category-manager",
        icon: FolderKanban,
      },
      {
        title: "Tipos de Valor",
        url: "/value-types",
        icon: CircleDollarSign,
      },
    ],
  },
  { title: "Funil de Vendas", url: "/status-manager", icon: TrendingUp },
  { title: "Calendário", url: "/calendar", icon: Calendar },
  {
    title: "WhatsApp",
    icon: MessageCircle,
    subItems: [
      { title: "Conectar WhatsApp", url: "/whatsapp", icon: Smartphone },
      {
        title: "Mensagens Agendadas",
        url: "/schedule-messages",
        icon: Clock,
      },
      {
        title: "Mensagem Padrão",
        url: "/message-configuration",
        icon: MessageSquare,
      },
      { title: "Chat", url: "/chat", icon: MessageCircle, comingSoon: true },
    ],
  },
  {
    title: "Agendamentos",
    icon: CalendarDays,
    subItems: [
      {
        title: "Agendar Interações",
        url: "/schedule-interactions",
        icon: Calendar,
      },
      {
        title: "Agendar Mensagens",
        url: "/schedule-messages",
        icon: MessageSquare,
      },
    ],
  },
  {
    title: "Inteligência Artificial",
    icon: Bot,
    subItems: [
      { title: "Agentes de IA", url: "/ai-interaction", icon: Bot },
      {
        title: "Roteiros de Conversação",
        url: "/agent-scripts",
        icon: FileText,
      },
      { title: "Habilidades e Integrações", url: "/abilities", icon: Bot },
      {
        title: "Documentação e Contexto",
        url: "/ai-context-documents",
        icon: Brain,
      },
      {
        title: "Playground",
        url: "/playground",
        icon: Play,
      },
    ],
  },
  { title: "Configurações", url: "/settings", icon: Settings },
];

function AppSidebar() {
  const { state, open, setOpen } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const { organization, loading: organizationLoading } = useOrganization();
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isCollapsed = state === "collapsed";
  const displayLogo = organization?.logo_url || logo;
  const displayCompanyName = organization?.company_name;
  const displayPlan = organization?.plan;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div
          className={`border-b border-border bg-gradient-to-br from-primary/5 to-accent/5 transition-all ${
            isCollapsed ? "p-2" : "p-8"
          }`}
        >
          <NavLink to="/dashboard" className="block group">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img
                src={displayLogo}
                alt={displayCompanyName || "Logo"}
                className={`relative z-10 transition-all duration-500 group-hover:scale-105 drop-shadow-2xl object-contain ${
                  isCollapsed ? "w-10 h-10" : "w-[200px] h-[200px]"
                }`}
              />
            </div>
          </NavLink>
          {!isCollapsed && !organizationLoading && displayCompanyName && (
            <div className="mt-4 text-center">
              <p className="text-sm font-semibold text-foreground">
                {displayCompanyName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {displayPlan}
              </p>
            </div>
          )}
          {!isCollapsed && organizationLoading && (
            <div className="mt-4 text-center space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-24 mx-auto"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-16 mx-auto"></div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                if (item.subItems) {
                  return (
                    <MenuItemWithSubItems
                      key={item.title}
                      item={item}
                      location={location}
                      isCollapsed={isCollapsed}
                    />
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url || "#"}
                        onClick={() => {
                          if (isCollapsed) {
                            setOpen(true);
                          }
                        }}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!isCollapsed && (
                          <span className="font-medium">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Plan Section */}
        <div className="mt-auto p-4 border-t border-border space-y-3">
          {!isCollapsed &&
            !organizationLoading &&
            organization?.plan === "free" && (
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-3 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Plano Atual
                  </span>
                </div>
                <p className="text-sm font-bold text-foreground capitalize mb-3">
                  {displayPlan}
                </p>
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  onClick={() => setIsPlanModalOpen(true)}
                >
                  Upgrade para Premium
                </Button>
              </div>
            )}

          {/* Logout Button */}
          <Button
            variant="ghost"
            className={`w-full gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ${
              isCollapsed ? "justify-center px-2" : "justify-start"
            }`}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="font-medium">Sair</span>}
          </Button>
        </div>
      </SidebarContent>

      <PlanModal open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen} />
    </Sidebar>
  );
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { organization, loading: organizationLoading } = useOrganization();
  const appVersion =
    (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "1.0.0";

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <SidebarInset className="flex flex-col relative !bg-transparent">
          {/* Animated background elements */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-cosmic-glow/25 via-primary/12 via-background via-60% to-cosmic-accent/25"
            style={{ zIndex: 1 }}
          />

          {/* Gradient waves */}
          <div
            className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-cosmic-glow/15 to-transparent blur-2xl pointer-events-none"
            style={{ zIndex: 1 }}
          />
          <div
            className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-cosmic-accent/15 to-transparent blur-2xl pointer-events-none"
            style={{ zIndex: 1 }}
          />

          {/* Diagonal gradient accents */}
          <div
            className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-primary/10 via-transparent to-transparent blur-xl pointer-events-none animate-pulse"
            style={{ zIndex: 1 }}
          />
          <div
            className="absolute bottom-0 right-0 w-1/3 h-full bg-gradient-to-l from-cosmic-accent/10 via-transparent to-transparent blur-xl pointer-events-none animate-pulse"
            style={{ zIndex: 1, animationDelay: "1.5s" }}
          />

          {/* Subtle corner accents */}
          <div
            className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-bl from-cosmic-glow/8 via-transparent to-transparent rounded-bl-[100px] blur-3xl pointer-events-none"
            style={{ zIndex: 1 }}
          />
          <div
            className="absolute bottom-0 left-0 w-[500px] h-[350px] bg-gradient-to-tr from-cosmic-accent/8 via-transparent to-transparent rounded-tr-[100px] blur-3xl pointer-events-none animate-glow-pulse"
            style={{ zIndex: 1 }}
          />

          {/* Header with trigger */}
          <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-4">
            <SidebarTrigger />
          </header>

          {/* Main Content */}
          <main
            className="flex-1 p-8 overflow-auto relative"
            style={{ zIndex: 10 }}
          >
            {children}
          </main>

          <div
            className="absolute bottom-2 right-4 text-[10px] text-muted-foreground/60 select-none"
            style={{ zIndex: 10 }}
          >
            v{appVersion}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
