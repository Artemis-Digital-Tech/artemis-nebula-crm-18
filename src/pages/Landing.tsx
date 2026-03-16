import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { ComponentConfigService, type ComponentDetailedInfo } from "@/services/components/ComponentConfig";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  Check,
  CreditCard,
  FileText,
  Image,
  Instagram,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessagesSquare,
  Plug,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  BarChart2,
  RefreshCw,
  Search,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

type LandingFeature = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "accent";
};

const AGENT_ABILITY_IDENTIFIERS = [
  "whatsapp_integration",
  "instagram_integration",
  "media_sender",
  "proposal_creator",
  "meeting_scheduler",
  "email_sender",
  "auto_followup",
  "auto_lead_status_update",
  "crm_query",
  "bant_analysis",
  "sentiment_analysis",
  "report_generator",
] as const;

const getAbilityIcon = (identifier: string) => {
  if (identifier === "whatsapp_integration") return MessageCircle;
  if (identifier === "instagram_integration") return Instagram;
  if (identifier === "media_sender") return Image;
  if (identifier === "proposal_creator") return MessagesSquare;
  if (identifier === "meeting_scheduler") return Calendar;
  if (identifier === "email_sender") return Mail;
  if (identifier === "auto_followup") return TrendingUp;
  if (identifier === "auto_lead_status_update") return RefreshCw;
  if (identifier === "crm_query") return FileText;
  if (identifier === "bant_analysis") return Target;
  if (identifier === "sentiment_analysis") return BarChart2;
  if (identifier === "report_generator") return BarChart3;
  return Bot;
};

const AbilityDetails = ({ identifier, info }: { identifier: string; info: ComponentDetailedInfo }) => (
  <div className="space-y-5">
    <div className="text-sm text-muted-foreground leading-relaxed">{info.description}</div>

    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="text-sm font-semibold">Funcionalidades</div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {info.features.map((f, idx) => (
            <li key={`${identifier}-feature-${idx}`} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <div className="text-sm font-semibold">Casos de uso</div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {info.useCases.map((u, idx) => (
            <li key={`${identifier}-usecase-${idx}`} className="flex items-start gap-2">
              <span className="text-primary mt-1.5">•</span>
              <span>{u}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {Array.isArray(info.requirements) && info.requirements.length > 0 ? (
      <div className="space-y-3">
        <div className="text-sm font-semibold">Requisitos</div>
        <div className="flex flex-wrap gap-2">
          {info.requirements.map((r, idx) => (
            <Badge
              key={`${identifier}-req-${idx}`}
              variant="outline"
              className="border-border/60 bg-background/30 text-muted-foreground"
            >
              {r}
            </Badge>
          ))}
        </div>
      </div>
    ) : null}
  </div>
);

const NebulaBars = () => (
  <div className="relative">
    <div className="absolute -inset-6 bg-gradient-to-br from-primary/15 via-transparent to-cosmic-accent/15 blur-2xl rounded-[2rem]" />
    <div className="relative rounded-[2rem] border border-border/50 bg-gradient-to-br from-card/80 via-card/40 to-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 overflow-hidden">
      <div className="absolute inset-0 [background:radial-gradient(60%_55%_at_20%_25%,hsl(var(--cosmic-glow)/0.25),transparent_60%),radial-gradient(55%_55%_at_85%_35%,hsl(var(--cosmic-accent)/0.18),transparent_60%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Painel • Visão geral</div>
            <div className="text-lg font-semibold">Sinais de crescimento</div>
          </div>
          <Badge variant="secondary" className="bg-secondary/60 border border-border/60">
            em tempo real
          </Badge>
        </div>

        <div className="mt-6 grid grid-cols-12 gap-4 items-end">
          <div className="col-span-7">
            <svg
              viewBox="0 0 520 360"
              className="w-full h-[220px] md:h-[260px]"
              role="img"
              aria-label="Ilustração de barras com brilho"
            >
              <defs>
                <linearGradient id="nebula-a" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
                  <stop offset="0.55" stopColor="hsl(var(--cosmic-glow))" stopOpacity="0.55" />
                  <stop offset="1" stopColor="hsl(var(--cosmic-accent))" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="nebula-b" x1="0" x2="0.9" y1="0" y2="1">
                  <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
                  <stop offset="1" stopColor="hsl(var(--cosmic-accent))" stopOpacity="0.35" />
                </linearGradient>
                <filter id="nebula-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="10" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 0.9 0"
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g transform="translate(35,22) skewX(-12)">
                {[
                  { x: 0, h: 170, w: 56, o: 0.9 },
                  { x: 70, h: 235, w: 62, o: 0.85 },
                  { x: 150, h: 280, w: 70, o: 0.9 },
                  { x: 245, h: 220, w: 58, o: 0.75 },
                  { x: 325, h: 255, w: 62, o: 0.8 },
                ].map((b, i) => (
                  <g key={i} filter="url(#nebula-glow)">
                    <rect
                      x={b.x}
                      y={300 - b.h}
                      width={b.w}
                      height={b.h}
                      rx="14"
                      fill="url(#nebula-a)"
                      opacity={b.o}
                    />
                    <rect
                      x={b.x + b.w * 0.6}
                      y={300 - b.h}
                      width={b.w * 0.45}
                      height={b.h}
                      rx="14"
                      fill="url(#nebula-b)"
                      opacity="0.9"
                    />
                  </g>
                ))}
              </g>

              <g opacity="0.35">
                <path
                  d="M40 305 C140 235, 210 280, 315 210 C390 160, 430 165, 485 135"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                />
                <path
                  d="M45 310 C145 245, 210 295, 325 230 C390 185, 440 185, 490 155"
                  fill="none"
                  stroke="hsl(var(--cosmic-accent))"
                  strokeWidth="2"
                />
              </g>
            </svg>
          </div>

          <div className="col-span-5 space-y-3">
            <Card className="bg-card/40 border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Eficiência do funil</div>
                  <div className="text-sm font-semibold">68%</div>
                </div>
                <div className="mt-3">
                  <Progress value={68} className="h-2 bg-secondary/60" />
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Menos atrito, mais previsibilidade.</div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-card/35 border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-sm font-semibold">+28%</div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Conversões</div>
                </CardContent>
              </Card>
              <Card className="bg-card/35 border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-cosmic-accent/10 flex items-center justify-center">
                      <MessagesSquare className="h-4 w-4 text-cosmic-accent" />
                    </div>
                    <div className="text-sm font-semibold">-42%</div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Tempo de resposta</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Separator className="my-6 bg-border/60" />

        <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Pipeline com visão de receita
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cosmic-accent" />
            Automação sem complexidade
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/70" />
            Integrações prontas
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LandingFeatureCard = ({ feature }: { feature: LandingFeature }) => {
  const Icon = feature.icon;
  const tone = feature.tone ?? "primary";
  const iconWrap =
    tone === "accent" ? "bg-cosmic-accent/10 text-cosmic-accent" : "bg-primary/10 text-primary";

  return (
    <Card className="bg-card/40 border-border/60 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
      <CardContent className="p-6">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${iconWrap}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="mt-5 space-y-2">
          <div className="text-lg font-semibold">{feature.title}</div>
          <div className="text-sm text-muted-foreground leading-relaxed">{feature.description}</div>
        </div>
      </CardContent>
    </Card>
  );
};

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) navigate("/dashboard");
    };

    void run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const features: LandingFeature[] = [
    {
      title: "Leads, etapas e categorias",
      description: "Organize o funil com categorias, histórico completo e um fluxo que o time realmente usa.",
      icon: LayoutDashboard,
      tone: "primary",
    },
    {
      title: "Busca inteligente de leads",
      description: "Encontre oportunidades rápido com busca e filtros para achar o lead certo no momento certo.",
      icon: BarChart3,
      tone: "primary",
    },
    {
      title: "Treino do chatbot da empresa",
      description: "Use informações do seu negócio para treinar o agente e manter respostas consistentes e alinhadas.",
      icon: Bot,
      tone: "accent",
    },
    {
      title: "Agente conectado no WhatsApp",
      description: "Atenda, tire dúvidas e faça prospecção com o bot atuando como agente, com tom e objetivos definidos.",
      icon: MessagesSquare,
      tone: "accent",
    },
    {
      title: "Habilidades e automações",
      description:
        "Envio automático de proposta e mídia, agendamento de reuniões e atualização de etapa — tudo registrado no CRM.",
      icon: Workflow,
      tone: "primary",
    },
    {
      title: "Propostas e pagamentos",
      description: "Acelere o fechamento com envio de proposta e cobrança no fluxo, com acompanhamento de status.",
      icon: CreditCard,
      tone: "accent",
    },
  ];

  const steps = [
    { title: "Organize leads e categorias", description: "Centralize contatos, categorize e mantenha histórico do lead." },
    { title: "Modele seu funil", description: "Defina etapas, status e campos para refletir seu processo real." },
    { title: "Treine o agente com seu contexto", description: "Alimente o chatbot com informações da empresa e padrões de atendimento." },
    { title: "Defina personalidade e função", description: "Prospecção, atendimento, dúvidas — com valores, tom e objetivos claros." },
    { title: "Ative habilidades e agendamentos", description: "Propostas, mídia, reuniões, atualização de etapas e disparos programados." },
  ];

  const navLinks = [
    { label: "Recursos", href: "#recursos" },
    { label: "Habilidades", href: "#habilidades" },
    { label: "Como funciona", href: "#como-funciona" },
    { label: "Segurança", href: "#seguranca" },
  ];

  const [abilityView, setAbilityView] = useState<"compacto" | "detalhado">("compacto");
  const [abilityQuery, setAbilityQuery] = useState("");

  const abilities = useMemo(() => {
    return AGENT_ABILITY_IDENTIFIERS.map((identifier) => {
      const info = ComponentConfigService.getDetailedInfo(identifier);
      if (!info) return null;
      const Icon = getAbilityIcon(identifier);
      const searchable = [
        info.title,
        info.description,
        identifier.replace(/_/g, " "),
        info.features.join(" "),
        info.useCases.join(" "),
        Array.isArray(info.requirements) ? info.requirements.join(" ") : "",
      ]
        .join(" ")
        .toLowerCase();

      return { identifier, info, Icon, searchable };
    }).filter((ability): ability is NonNullable<typeof ability> => Boolean(ability));
  }, []);

  const filteredAbilities = useMemo(() => {
    const query = abilityQuery.trim().toLowerCase();
    if (!query) return abilities;
    return abilities.filter((ability) => ability.searchable.includes(query));
  }, [abilities, abilityQuery]);

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cosmic-glow/10 via-background to-cosmic-accent/10" />
        <div className="absolute inset-0 opacity-[0.35] [background:radial-gradient(70%_60%_at_20%_0%,hsl(var(--cosmic-glow)/0.2),transparent_65%),radial-gradient(60%_55%_at_90%_20%,hsl(var(--cosmic-accent)/0.14),transparent_60%)]" />
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl animate-glow-pulse" />

        <nav className="relative z-10">
          <div className="container mx-auto px-6 py-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Artemis Nebula" className="h-12 md:h-14 hover-scale" />
              <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} className="story-link hover:text-foreground">
                    {l.label}
                  </a>
                ))}
                <Link to="/planos" className="story-link hover:text-foreground">
                  Planos
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
                  Entrar
                </Button>
              </Link>
              <Link to="/login">
                <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all">
                  Começar agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 pb-16 pt-10 md:pt-16 md:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/15 text-foreground border border-primary/25 hover:bg-primary/15">
                  <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                  Nebula • CRM com IA + WhatsApp
                </Badge>
                <Badge variant="secondary" className="bg-secondary/60 border border-border/60 hidden sm:inline-flex">
                  agente treinável
                </Badge>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold leading-tight animate-fade-in">
                O CRM com IA que{" "}
                <span className="bg-gradient-to-r from-primary via-cosmic-glow to-cosmic-accent bg-clip-text text-transparent">
                  treina seu agente e conecta no WhatsApp
                </span>
                .
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl animate-slide-up opacity-0 [animation-delay:150ms] [animation-fill-mode:forwards]">
                Gerencie leads, categorias e etapas, use busca inteligente, treine um chatbot com as informações da sua empresa e
                conecte ele como agente no WhatsApp. Defina personalidade, valores, função e habilite ações como proposta, mídia,
                reuniões, atualização automática de etapas e disparos agendados.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center animate-slide-up opacity-0 [animation-delay:250ms] [animation-fill-mode:forwards]">
                <Link to="/login">
                  <Button size="lg" className="text-base px-7 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover-scale">
                    Começar agora
                    <Rocket className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/planos">
                  <Button size="lg" variant="outline" className="border-primary/35 bg-background/40 hover:bg-primary/10">
                    Ver planos
                    <CreditCard className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#como-funciona">
                  <Button size="lg" variant="ghost" className="text-muted-foreground hover:text-foreground">
                    Ver como funciona
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>

              <div className="pt-2 grid sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Treino interno do agente
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Habilidades configuráveis
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Disparos e interações agendadas
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <NebulaBars />
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 bg-cosmic-surface/30" id="recursos">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl">
            <div className="text-sm text-muted-foreground">CRM + IA integrada</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold">
              O núcleo do seu comercial{" "}
              <span className="bg-gradient-to-r from-primary to-cosmic-accent bg-clip-text text-transparent">com um agente de IA</span>.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              O Nebula centraliza o funil e adiciona um agente treinável que opera no WhatsApp com personalidade e habilidades.
              Você ganha consistência no atendimento, velocidade na prospecção e automações que mantêm o pipeline sempre atualizado.
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <LandingFeatureCard key={f.title} feature={f} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20" id="habilidades">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-cosmic-accent" />
                Habilidades do agente
              </div>
              <h3 className="text-3xl md:text-4xl font-bold leading-tight">
                Cada habilidade é uma{" "}
                <span className="bg-gradient-to-r from-primary via-cosmic-glow to-cosmic-accent bg-clip-text text-transparent">
                  peça de execução
                </span>{" "}
                no seu processo.
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Ative integrações como WhatsApp, e-mail e agenda. Depois, combine com habilidades de análise e automação para o
                agente prospectar, atender, qualificar e mover o lead no funil com consistência.
              </p>

              <div className="pt-2 grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Integrações e ações
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Análise e qualificação
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Automação no funil
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Relatórios e insights
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <Card className="bg-card/40 border-border/60 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Biblioteca</div>
                      <div className="text-xl font-semibold">Habilidades e integrações do Nebula</div>
                    </div>
                    <Badge variant="secondary" className="bg-secondary/60 border border-border/60">
                      {AGENT_ABILITY_IDENTIFIERS.length} habilidades
                    </Badge>
                  </div>

                  <Separator className="my-6 bg-border/60" />

                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={abilityQuery}
                          onChange={(e) => setAbilityQuery(e.target.value)}
                          placeholder="Buscar habilidade, integração ou caso de uso…"
                          className="pl-9 bg-background/40 border-border/60"
                        />
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3">
                        <Tabs value={abilityView} onValueChange={(v) => setAbilityView(v as typeof abilityView)}>
                          <TabsList className="bg-background/30 border border-border/60">
                            <TabsTrigger value="compacto">Compacto</TabsTrigger>
                            <TabsTrigger value="detalhado">Detalhado</TabsTrigger>
                          </TabsList>
                        </Tabs>

                        <Badge variant="outline" className="border-border/60 bg-background/30 text-muted-foreground">
                          {filteredAbilities.length} de {abilities.length}
                        </Badge>
                      </div>
                    </div>

                    {filteredAbilities.length === 0 ? (
                      <div className="rounded-xl border border-border/60 bg-background/30 p-5 text-sm text-muted-foreground">
                        Nenhuma habilidade encontrada para “{abilityQuery.trim()}”.
                      </div>
                    ) : (
                      <Tabs value={abilityView} onValueChange={(v) => setAbilityView(v as typeof abilityView)}>
                        <TabsContent value="compacto" className="mt-0">
                          <div className="grid sm:grid-cols-2 gap-3">
                            {filteredAbilities.map(({ identifier, info, Icon }) => (
                              <Dialog key={identifier}>
                                <DialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="group w-full rounded-xl border border-border/60 bg-background/25 hover:bg-background/40 hover:border-primary/50 transition-all p-4 text-left"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Icon className="h-5 w-5" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-semibold leading-tight">{info.title}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                          {identifier.replace(/_/g, " ")}
                                        </div>
                                        <div className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                          {info.description}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <div className="flex items-start gap-3">
                                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Icon className="h-5 w-5" />
                                      </div>
                                      <div className="min-w-0">
                                        <DialogTitle className="leading-tight">{info.title}</DialogTitle>
                                        <DialogDescription className="mt-1">
                                          {identifier.replace(/_/g, " ")}
                                        </DialogDescription>
                                      </div>
                                    </div>
                                  </DialogHeader>
                                  <ScrollArea className="h-[70vh]">
                                    <div className="pr-4">
                                      <AbilityDetails identifier={identifier} info={info} />
                                    </div>
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="detalhado" className="mt-0">
                          <ScrollArea className="h-[560px]">
                            <div className="pr-4">
                              <Accordion type="single" collapsible className="w-full">
                                {filteredAbilities.map(({ identifier, info, Icon }) => (
                                  <AccordionItem
                                    key={identifier}
                                    value={identifier}
                                    className="border-border/60 first:border-t-0"
                                  >
                                    <AccordionTrigger className="hover:no-underline py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                          <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="text-left">
                                          <div className="font-semibold">{info.title}</div>
                                          <div className="text-xs text-muted-foreground mt-0.5">
                                            {identifier.replace(/_/g, " ")}
                                          </div>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-6">
                                      <AbilityDetails identifier={identifier} info={info} />
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </div>
                          </ScrollArea>
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20" id="como-funciona">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Como a Nebula funciona
              </div>
              <h3 className="text-3xl md:text-4xl font-bold leading-tight">
                Um fluxo que guia o time do{" "}
                <span className="bg-gradient-to-r from-primary via-cosmic-glow to-cosmic-accent bg-clip-text text-transparent">
                  contato ao pagamento
                </span>
                .
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Um fluxo simples: organizar o funil, treinar o agente, conectar no WhatsApp e ativar habilidades que executam tarefas
                reais (proposta, mídia, reuniões e atualizações automáticas).
              </p>

              <div className="pt-2 space-y-4">
                {steps.map((s, idx) => (
                  <div key={s.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-9 w-9 rounded-xl border border-border/60 bg-card/50 flex items-center justify-center">
                        <span className="text-sm font-semibold">{idx + 1}</span>
                      </div>
                      {idx !== steps.length - 1 ? <div className="w-px flex-1 bg-border/60 my-2" /> : null}
                    </div>
                    <div className="pt-1">
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-sm text-muted-foreground leading-relaxed mt-1">{s.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <Link to="/login">
                  <Button size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all">
                    Ver o dashboard
                    <LayoutDashboard className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-card/40 border-border/60 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Qualidade do pipeline</div>
                        <div className="text-2xl font-semibold">68%</div>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Progress value={68} className="h-2 bg-secondary/60" />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground leading-relaxed">
                      Indicadores visuais e acionáveis para agir antes do funil “morrer”.
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/40 border-border/60 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Automação</div>
                        <div className="text-2xl font-semibold">Orquestração</div>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-cosmic-accent/10 flex items-center justify-center">
                        <Workflow className="h-6 w-6 text-cosmic-accent" />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Envio automático de proposta e mídia
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Agendamento de reuniões
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Atualização automática de etapas
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Disparos e interações agendadas
                      </div>
                    </div>
                    <div className="mt-4">
                      <Badge variant="secondary" className="bg-secondary/60 border border-border/60">
                        pronto para escalar
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 bg-card/40 border-border/60 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Do lead ao WhatsApp (e ao fechamento)</div>
                        <div className="text-xl font-semibold">Agente treinado + habilidades no seu fluxo</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-cosmic-accent/10 flex items-center justify-center">
                          <MessagesSquare className="h-5 w-5 text-cosmic-accent" />
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6 bg-border/60" />

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                        <div className="text-sm font-semibold">1. Base de conhecimento</div>
                        <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          Treine o agente com as informações da sua empresa e padronize respostas.
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                        <div className="text-sm font-semibold">2. Personalidade e função</div>
                        <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          Prospecção, atendimento, dúvidas — com valores, tom e objetivos definidos.
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                        <div className="text-sm font-semibold">3. Habilidades executáveis</div>
                        <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          Proposta, mídia, reuniões e atualizações automáticas — com registro no CRM e visão do funil.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 bg-cosmic-surface/30" id="seguranca">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-cosmic-accent" />
                Segurança e confiabilidade
              </div>
              <h3 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">
                Profissional por padrão,{" "}
                <span className="bg-gradient-to-r from-primary to-cosmic-accent bg-clip-text text-transparent">
                  robusto por design
                </span>
                .
              </h3>
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">
                Autenticação, permissões e auditoria são parte do produto. Seus dados ficam consistentes e o time trabalha com
                confiança.
              </p>

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                {[
                  { title: "Acesso protegido", desc: "Rotas seguras e sessão controlada." },
                  { title: "Integridade de dados", desc: "Estados e cadastros com governança." },
                  { title: "Pronto para integrações", desc: "Webhooks e automações sem gambiarra." },
                  { title: "Observabilidade", desc: "Sinais claros do que está funcionando." },
                ].map((x) => (
                  <div key={x.title} className="flex gap-3 rounded-xl border border-border/60 bg-card/35 p-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{x.title}</div>
                      <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{x.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <Card className="bg-card/40 border-border/60 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="text-xl font-semibold">Saúde do sistema</div>
                    </div>
                    <Badge variant="secondary" className="bg-secondary/60 border border-border/60">
                      estável
                    </Badge>
                  </div>

                  <Separator className="my-6 bg-border/60" />

                  <div className="space-y-3 text-sm">
                    {[
                      { label: "Autenticação", value: 100 },
                      { label: "Automação", value: 88 },
                      { label: "Pagamentos", value: 92 },
                    ].map((k) => (
                      <div key={k.label} className="space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>{k.label}</span>
                          <span className="text-foreground font-medium">{k.value}%</span>
                        </div>
                        <Progress value={k.value} className="h-2 bg-secondary/60" />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-xl border border-border/60 bg-background/30 p-4 text-sm text-muted-foreground leading-relaxed">
                    Quer ver esse nível de clareza no seu processo comercial? A Nebula foi desenhada para isso.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-cosmic-glow/10 to-cosmic-accent/10 p-10 md:p-14">
            <div className="absolute inset-0 [background:radial-gradient(70%_60%_at_20%_25%,hsl(var(--primary)/0.22),transparent_62%),radial-gradient(60%_55%_at_85%_40%,hsl(var(--cosmic-accent)/0.18),transparent_60%)]" />
            <div className="relative text-center max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold">Pronto para colocar um agente no WhatsApp?</h2>
              <p className="text-lg md:text-xl text-muted-foreground">
                Crie seu funil, treine o agente com o contexto da sua empresa e ative habilidades para prospectar, atender e avançar
                leads automaticamente.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/login">
                  <Button size="lg" className="text-base px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover-scale">
                    Treinar meu agente
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="lg" variant="outline" className="border-primary/35 bg-background/40 hover:bg-primary/10">
                    Criar conta
                  </Button>
                </Link>
              </div>
              <div className="text-sm text-muted-foreground">
                Acesso imediato • Treino interno • Habilidades configuráveis
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-10 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-10">
            <div className="md:col-span-5 space-y-4">
              <img src={logo} alt="Artemis Nebula" className="h-12" />
              <div className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                CRM com IA integrada para gerenciar leads e operar um agente treinável no WhatsApp com habilidades e automações.
              </div>
            </div>
            <div className="md:col-span-7 grid sm:grid-cols-3 gap-8 text-sm">
              <div className="space-y-3">
                <div className="font-semibold">Produto</div>
                <div className="space-y-2 text-muted-foreground">
                  <a className="story-link hover:text-foreground" href="#recursos">
                    Recursos
                  </a>
                  <a className="story-link hover:text-foreground" href="#como-funciona">
                    Como funciona
                  </a>
                  <Link className="story-link hover:text-foreground" to="/planos">
                    Planos
                  </Link>
                  <a className="story-link hover:text-foreground" href="#seguranca">
                    Segurança
                  </a>
                </div>
              </div>
              <div className="space-y-3">
                <div className="font-semibold">Acesso</div>
                <div className="space-y-2 text-muted-foreground">
                  <Link className="story-link hover:text-foreground" to="/login">
                    Entrar
                  </Link>
                  <Link className="story-link hover:text-foreground" to="/signup">
                    Criar conta
                  </Link>
                  <Link className="story-link hover:text-foreground" to="/dashboard">
                    Dashboard
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                <div className="font-semibold">Stack</div>
                <div className="space-y-2 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Plug className="h-4 w-4 text-primary" />
                    Integrações
                  </div>
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" />
                    Automação
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Stripe
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-8 bg-border/60" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <div>&copy; {new Date().getFullYear()} Artemis Nebula. Todos os direitos reservados.</div>
            <div className="flex items-center gap-4">
              <a className="story-link hover:text-foreground" href="#recursos">
                Voltar ao topo
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
