import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import logo from "@/assets/logo.png";

type ActivateStatus = "loading" | "success" | "error";

const Activate = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const [status, setStatus] = useState<ActivateStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!email) {
      setStatus("error");
      setErrorMessage("E-mail não informado na URL.");
      return;
    }

    const activate = async () => {
      const { data, error } = await supabase.functions.invoke("activate-user", {
        body: { email },
      });

      if (error) {
        setStatus("error");
        setErrorMessage(error.message || "Erro ao ativar usuário.");
        return;
      }

      const result = data as { success?: boolean; error?: string };
      if (!result?.success) {
        setStatus("error");
        setErrorMessage(result?.error || "Não foi possível ativar o usuário.");
        return;
      }

      setStatus("success");
    };

    activate();
  }, [email]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Link to="/" className="mb-8">
        <img src={logo} alt="Logo" className="h-10" />
      </Link>

      <div className="w-full max-w-md text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">
              Ativando sua conta...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold">Conta ativada!</h1>
            <p className="text-muted-foreground">
              Seu e-mail foi confirmado. Você já pode fazer login.
            </p>
            <Button asChild>
              <Link to="/login">Ir para o login</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Erro na ativação</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <div className="flex gap-2 justify-center">
              <Button asChild variant="outline">
                <Link to="/">Voltar ao início</Link>
              </Button>
              <Button asChild>
                <Link to="/login">Ir para o login</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Activate;
