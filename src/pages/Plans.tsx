import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import logo from "@/assets/logo.png";
import { Check, X, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type PlanKey = "basic" | "regular" | "pro";

type Plan = {
  key: PlanKey;
  name: string;
  priceMonthly: string;
  implementationLabel: string;
  highlight?: string;
  users: string;
  featuresIncluded: string[];
  featuresExcluded?: string[];
  notes?: string[];
};

const Plans = () => {
  const plans: Plan[] = [
    {
      key: "basic",
      name: "Basic",
      priceMonthly: "R$249,00",
      implementationLabel: "Sem implementação",
      users: "1 user",
      featuresIncluded: ["Busca de leads por categoria", "Funil de venda", "CRM (Leads)"],
      featuresExcluded: [
        "BOT",
        "Agendamento de reuniões",
        "Integração com WhatsApp",
        "Disparo Automático (MSG)",
        "Envio de propostas",
        "Atualização de Status",
        "Envio de Mídia",
        "Análise de BANT",
        "Documentação de Contexto",
      ],
    },
    {
      key: "regular",
      name: "Regular",
      priceMonthly: "R$449,00",
      implementationLabel: "+implementação",
      highlight: "Mais vendido",
      users: "2 user",
      featuresIncluded: [
        "Busca de leads por categoria",
        "Funil de venda",
        "CRM (Leads)",
        "1 BOT",
        "Agendamento de reuniões",
        "Integração com WhatsApp (1 und)",
        "Disparo Automático (MSG)",
        "Envio de propostas",
        "Atualização de Status",
        "Envio de Mídia",
        "Análise de BANT",
        "Documentação de Contexto",
      ],
      notes: ["Obs: BOT + Wpp adicional R$109,90"],
    },
    {
      key: "pro",
      name: "Pro",
      priceMonthly: "R$599,00",
      implementationLabel: "+implementação",
      users: "3 user",
      featuresIncluded: [
        "Busca de leads por categoria",
        "Funil de venda",
        "CRM (Leads)",
        "3 BOT",
        "Agendamento de reuniões",
        "Integração com WhatsApp (3 und)",
        "Disparo Automático (MSG)",
        "Envio de propostas",
        "Atualização de Status",
        "Envio de Mídia",
        "Análise de BANT",
        "Documentação de Contexto",
      ],
      notes: ["Obs: BOT + Wpp adicional R$109,90"],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cosmic-glow/10 via-background to-cosmic-accent/10" />
        <div className="absolute inset-0 opacity-[0.35] [background:radial-gradient(70%_60%_at_20%_0%,hsl(var(--cosmic-glow)/0.2),transparent_65%),radial-gradient(60%_55%_at_90%_20%,hsl(var(--cosmic-accent)/0.14),transparent_60%)]" />
        <div className="container mx-auto px-6 py-8 relative z-10">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-3 hover:opacity-90 transition-opacity">
              <img src={logo} alt="Artemis Nebula" className="h-10 md:h-12" />
              <div className="hidden sm:block">
                <div className="text-sm text-muted-foreground">Nebula</div>
                <div className="font-semibold leading-tight">Planos e preços</div>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
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

          <div className="mt-10 max-w-3xl">
            <Badge className="bg-primary/15 text-foreground border border-primary/25 hover:bg-primary/15">Mensal</Badge>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold leading-tight">
              Escolha o plano ideal para o seu time{" "}
              <span className="bg-gradient-to-r from-primary via-cosmic-glow to-cosmic-accent bg-clip-text text-transparent">
                e escale com automações
              </span>
              .
            </h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Valores mensais por plano. Implementação é negociada conforme escopo e pode ter condições promocionais.
            </p>
          </div>

          <div className="mt-8 grid lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8">
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((p) => (
                  <Card
                    key={p.key}
                    className={[
                      "bg-card/40 border-border/60 overflow-hidden h-full",
                      p.highlight ? "ring-1 ring-primary/35 shadow-lg shadow-primary/10" : "",
                    ].join(" ")}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-lg font-semibold">{p.name}</div>
                          <div className="text-sm text-muted-foreground">{p.users}</div>
                        </div>
                        {p.highlight ? (
                          <Badge variant="secondary" className="bg-secondary/60 border border-border/60">
                            {p.highlight}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-5">
                        <div className="text-3xl font-bold">{p.priceMonthly}</div>
                        <div className="mt-1 text-sm text-muted-foreground">por mês • {p.implementationLabel}</div>
                      </div>

                      <Separator className="my-5 bg-border/60" />

                      <div className="space-y-2 text-sm flex-1">
                        {p.featuresIncluded.map((f) => (
                          <div key={`${p.key}-in-${f}`} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-0.5" />
                            <span className="text-muted-foreground">{f}</span>
                          </div>
                        ))}
                        {p.featuresExcluded?.length ? (
                          <div className="pt-2 space-y-2">
                            {p.featuresExcluded.map((f) => (
                              <div key={`${p.key}-out-${f}`} className="flex items-start gap-2">
                                <X className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                                <span className="text-muted-foreground/70">{f}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {p.notes?.length ? (
                        <div className="mt-5 rounded-xl border border-border/60 bg-background/30 p-3 text-xs text-muted-foreground leading-relaxed">
                          {p.notes.map((n) => (
                            <div key={`${p.key}-note-${n}`}>{n}</div>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4">
              <Card className="bg-card/40 border-border/60 overflow-hidden h-full">
                <CardContent className="p-6">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Implementação</div>
                    <div className="text-xl font-semibold">R$4.500,00 — R$3.000,00</div>
                  </div>

                  <Separator className="my-6 bg-border/60" />

                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                      <div className="font-semibold text-foreground">Condições</div>
                      <div className="mt-2">10% off na implementação.</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                      <div className="font-semibold text-foreground">O que inclui</div>
                      <div className="mt-2">
                        Setup do funil, configurações do agente, integrações necessárias e validação do fluxo para colocar o time em
                        produção.
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                      <div className="font-semibold text-foreground">Próximo passo</div>
                      <div className="mt-2">Crie sua conta e comece a estruturar o funil. Ajustamos o restante no onboarding.</div>
                      <div className="mt-4">
                        <Link to="/signup">
                          <Button variant="outline" className="w-full border-primary/35 bg-background/40 hover:bg-primary/10">
                            Criar conta
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-12 text-xs text-muted-foreground">
            Valores sujeitos a alteração. Itens e limites podem variar conforme a configuração e integrações necessárias.
          </div>
        </div>
      </section>
    </div>
  );
};

export default Plans;

