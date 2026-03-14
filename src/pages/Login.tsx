import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, Bot } from "lucide-react";
import logo from "@/assets/logo.png";
import TextType from "@/components/reactbits/TextType/TextType";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const defaultValues: LoginFormValues = {
  email: "",
  password: "",
};

const Login = () => {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues,
    mode: "onBlur",
  });

  const isLoading = form.formState.isSubmitting;

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) navigate("/dashboard");
    };
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = form.handleSubmit(async (data) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Login realizado!",
      description: "Bem-vindo de volta.",
    });
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

      <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col bg-card/95 backdrop-blur-xl border-l border-border/50"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Assistente virtual
            </SheetTitle>
            <SheetDescription>
              Tire suas dúvidas sobre o cadastro ou o Artemis Nebula.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 flex flex-col gap-4 py-6">
            <p className="text-sm text-muted-foreground">
              Em breve você poderá conversar aqui com nosso agente de IA.
              Enquanto isso, conclua seu cadastro e escolha &quot;Chamar no
              WhatsApp&quot; ou &quot;Agendar uma reunião&quot; para falar com
              nossa equipe.
            </p>
            <Button
              variant="outline"
              onClick={() => setAssistantOpen(false)}
              className="mt-auto"
            >
              Fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label="Abrir assistente virtual"
      >
        <Bot className="h-7 w-7" />
      </button>

      <div className="relative z-10 w-full flex justify-center items-start pt-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center space-y-4 mb-8 animate-scale-in">
            <Link to="/" className="inline-block group">
              <img
                src={logo}
                alt="Artemis Nebula"
                className="h-24 sm:h-28 mx-auto transition-transform duration-300 group-hover:scale-110"
              />
            </Link>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Bem-vindo de volta
              </h1>
              <div className="text-muted-foreground text-lg min-h-[2rem] flex items-center justify-center">
                <TextType
                  as="span"
                  text={[
                    "Continue de onde parou",
                    "Gestão inteligente de leads",
                    "CRM que conecta sua equipe",
                    "Faça login para acessar o painel",
                  ]}
                  typingSpeed={50}
                  pauseDuration={3000}
                  cursorCharacter="|"
                  cursorClassName="text-primary"
                  className="text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <Form {...form}>
            <form
              onSubmit={handleSubmit}
              className="space-y-6 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        disabled={isLoading}
                        className="h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Senha *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        className="h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/signup"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Não tem uma conta? Cadastre-se
                </Link>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
