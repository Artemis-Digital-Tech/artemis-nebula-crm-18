import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  MessageCircle,
  Calendar,
  Mail,
  ChevronRight,
  ChevronLeft,
  Building2,
  Phone,
  FileText,
  Send,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatPhoneMask } from "@/lib/utils";
import logo from "@/assets/logo.png";
import TextType from "@/components/reactbits/TextType/TextType";
import {
  ygdrasilSignupService,
  type SignupContactPreference,
} from "@/services/YgdrasilSignupService";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const SIGNUP_STEPS = [
  { id: 1, title: "Dados da empresa", short: "Dados" },
  { id: 2, title: "Como deseja ser contactado?", short: "Contato" },
] as const;

const CONTACT_OPTIONS: {
  value: SignupContactPreference;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "whatsapp",
    label: "Chamar no WhatsApp",
    description: "Fale com a Artemis pelo WhatsApp padrão",
    icon: <MessageCircle className="h-6 w-6" />,
  },
  {
    value: "schedule_meeting",
    label: "Agendar uma reunião",
    description: "Reserve um horário para conversarmos",
    icon: <Calendar className="h-6 w-6" />,
  },
  {
    value: "email_only",
    label: "Apenas por e-mail",
    description: "Enviaremos as informações por e-mail",
    icon: <Mail className="h-6 w-6" />,
  },
];

const signupStep1Schema = z.object({
  companyName: z.string().min(1, "Nome da empresa é obrigatório"),
  phone: z.string().optional(),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  companyDescription: z.string().optional(),
});

const signupSchema = signupStep1Schema.extend({
  contactPreference: z.enum(["whatsapp", "schedule_meeting", "email_only"], {
    required_error: "Escolha uma opção",
  }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const defaultValues: SignupFormValues = {
  companyName: "",
  phone: "",
  email: "",
  companyDescription: "",
  contactPreference: "whatsapp",
};

const Signup = () => {
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues,
    mode: "onBlur",
  });

  const contactPreference = form.watch("contactPreference");

  const handleStep1Next = () => {
    form.trigger(["companyName", "email"]).then((ok) => {
      if (ok) setSignupStep(2);
    });
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const activationLink = `${window.location.origin}/activate?email=${encodeURIComponent(data.email)}`;
      await ygdrasilSignupService.sendLead({
        companyName: data.companyName,
        phone: data.phone ?? "",
        email: data.email,
        companyDescription: data.companyDescription ?? "",
        contactPreference: data.contactPreference,
        activationLink,
      });
      toast({
        title: "Solicitação enviada!",
        description: "Recebemos seus dados. Entraremos em contato em breve.",
      });
      form.reset(defaultValues);
      setSignupStep(1);
      navigate("/login");
    } catch {
      toast({
        title: "Erro",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cosmic-glow/25 via-primary/12 via-background via-60% to-cosmic-accent/25" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/12 via-cosmic-glow/8 to-cosmic-accent/12 rounded-full blur-3xl animate-glow-pulse" />
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-cosmic-glow/20 rounded-full blur-2xl animate-pulse" />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cosmic-accent/20 rounded-full blur-2xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />
      <div className="relative z-10 w-full flex justify-center items-start pt-6">
        <Link
          to="/"
          className="absolute left-4 top-4 sm:left-6 sm:top-6 z-20 opacity-90 hover:opacity-100 flex items-center gap-3"
        >
          <img
            src={logo}
            alt="Artemis Nebula"
            className="h-14 sm:h-16 transition-transform duration-300 hover:scale-105"
          />
          <TextType
            text={[
              "Cadastre sua empresa",
              "Escolha como ser contactado",
              "Gestão inteligente de leads",
            ]}
            className="text-sm text-muted-foreground font-medium hidden sm:inline-block max-w-[180px]"
            typingSpeed={60}
            pauseDuration={2500}
            cursorCharacter="|"
            cursorClassName="text-primary animate-pulse"
          />
        </Link>
        <div className="w-full max-w-4xl pt-14 sm:pt-16 flex flex-col max-h-[calc(100vh-4rem)] animate-fade-in">
          <div className="flex items-center gap-2 mb-6">
            {SIGNUP_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    signupStep >= step.id
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-xs font-bold">
                    {step.id}
                  </span>
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{step.short}</span>
                </div>
                {index < SIGNUP_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
          <Progress
            value={signupStep === 1 ? 50 : 100}
            className="h-1.5 mb-8"
          />

          <Card className="flex flex-col bg-card/50 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl flex items-center gap-2">
                {signupStep === 1 ? (
                  <>
                    <Building2 className="h-7 w-7 text-primary" />
                    Dados da empresa
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-7 w-7 text-primary" />
                    Como deseja ser contactado?
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {signupStep === 1
                  ? "Preencha os dados abaixo. Entraremos em contato para concluir seu cadastro."
                  : "Escolha a melhor forma de entrarmos em contato."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 overflow-auto pb-6 pt-0">
              <Form {...form}>
                {signupStep === 1 ? (
                  <form
                    id="signup-step1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleStep1Next();
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    autoComplete="off"
                  >
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="flex items-center gap-2 text-foreground">
                            <Building2 className="h-4 w-4 text-primary" />
                            Nome da empresa *
                          </FormLabel>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <FormControl>
                              <Input
                                placeholder="Minha Empresa Ltda"
                                disabled={isLoading}
                                className="h-11 pl-10 rounded-xl border-2 bg-muted/30 focus:bg-background transition-colors"
                                {...field}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="flex items-center gap-2 text-foreground">
                            <Phone className="h-4 w-4 text-primary" />
                            Telefone
                          </FormLabel>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="(00) 00000-0000"
                                disabled={isLoading}
                                className="h-11 pl-10 rounded-xl border-2 bg-muted/30 focus:bg-background transition-colors"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(formatPhoneMask(e))
                                }
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-2 md:col-span-2">
                          <FormLabel className="flex items-center gap-2 text-foreground">
                            <Mail className="h-4 w-4 text-primary" />
                            E-mail *
                          </FormLabel>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="seu@email.com"
                                disabled={isLoading}
                                className="h-11 pl-10 rounded-xl border-2 bg-muted/30 focus:bg-background transition-colors"
                                {...field}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="companyDescription"
                      render={({ field }) => (
                        <FormItem className="space-y-2 md:col-span-2">
                          <FormLabel className="flex items-center gap-2 text-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Conte um pouco sobre sua empresa
                          </FormLabel>
                          <div className="relative">
                            <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <FormControl>
                              <Textarea
                                placeholder="Segmento, tamanho da equipe, principais desafios ou como acreditamos que podemos ajudar..."
                                disabled={isLoading}
                                rows={4}
                                className="pl-10 pt-3 rounded-xl border-2 bg-muted/30 focus:bg-background transition-colors resize-none min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                ) : (
                  <form
                    id="signup-step2"
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-6"
                  >
                    <FormField
                      control={form.control}
                      name="contactPreference"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="grid gap-3"
                            >
                              {CONTACT_OPTIONS.map((option) => (
                                <label
                                  key={option.value}
                                  className={cn(
                                    "flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all hover:border-primary/40 hover:bg-muted/30",
                                    contactPreference === option.value
                                      ? "border-primary bg-primary/5 shadow-sm"
                                      : "border-border"
                                  )}
                                >
                                  <RadioGroupItem
                                    value={option.value}
                                    className="mt-0.5 shrink-0"
                                  />
                                  <div className="flex gap-4 flex-1 min-w-0">
                                    <div
                                      className={cn(
                                        "flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-colors",
                                        contactPreference === option.value
                                          ? "bg-primary/20 text-primary"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {option.icon}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-foreground">
                                        {option.label}
                                      </p>
                                      <p className="text-sm text-muted-foreground mt-0.5">
                                        {option.description}
                                      </p>
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                )}
              </Form>
            </CardContent>
            <div className="p-6 pt-0 flex flex-col sm:flex-row gap-3 justify-between border-t border-border/50">
              {signupStep === 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSignupStep(1)}
                  disabled={isLoading}
                  className="order-2 sm:order-1"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
              ) : (
                <div />
              )}
              <div className="flex-1 flex justify-end">
                {signupStep === 1 ? (
                  <Button
                    type="submit"
                    form="signup-step1"
                    className="min-w-[140px]"
                  >
                    Continuar
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    form="signup-step2"
                    disabled={isLoading}
                    className="min-w-[160px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar solicitação
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-primary hover:underline font-medium"
            >
              Já tem uma conta? Faça login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
