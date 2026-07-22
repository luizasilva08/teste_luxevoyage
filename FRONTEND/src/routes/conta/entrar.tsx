import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { SiteHeader } from "../../components/site/SiteHeader";
import { SiteFooter } from "../../components/site/SiteFooter";
import { clienteLogin, clienteRegistrar } from "../../lib/cliente";
import { ApiError } from "../../lib/api";

export const Route = createFileRoute("/conta/entrar")({
  head: () => ({
    meta: [{ title: "Minha conta · Luxe Voyage Brasil" }],
  }),
  component: ContaEntrarPage,
});

function ContaEntrarPage() {
  const [aba, setAba] = useState<"entrar" | "criar">("entrar");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  async function handleEntrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    const form = new FormData(e.currentTarget);
    setEnviando(true);
    try {
      const cliente = await clienteLogin(String(form.get("email") || ""), String(form.get("senha") || ""));
      toast.success(`Bem-vindo(a) de volta, ${cliente.nome.split(" ")[0]}!`);
      navigate({ to: "/conta" });
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.status === 401
            ? "E-mail ou senha inválidos."
            : error.message
          : "Não foi possível conectar à API.",
      );
    } finally {
      setEnviando(false);
    }
  }

  async function handleCriarConta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    const form = new FormData(e.currentTarget);
    setEnviando(true);
    try {
      const cliente = await clienteRegistrar({
        nome: String(form.get("nome") || ""),
        email: String(form.get("email") || ""),
        senha: String(form.get("senha") || ""),
        telefone: String(form.get("telefone") || "") || undefined,
        cep: String(form.get("cep") || "") || undefined,
      });
      toast.success(`Conta criada! Bem-vindo(a), ${cliente.nome.split(" ")[0]}.`);
      navigate({ to: "/conta" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível conectar à API.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-[0_20px_60px_-25px_rgba(15,27,61,0.25)]">
          <h1 className="font-display text-3xl text-foreground">Minha conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe suas cotações, viagens e pagamentos num só lugar.
          </p>

          <div className="mt-6 flex rounded-full border border-border bg-muted/50 p-1 text-sm">
            <button
              onClick={() => setAba("entrar")}
              className={`flex-1 rounded-full py-2 font-semibold transition ${aba === "entrar" ? "bg-navy text-navy-foreground" : "text-muted-foreground"}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setAba("criar")}
              className={`flex-1 rounded-full py-2 font-semibold transition ${aba === "criar" ? "bg-navy text-navy-foreground" : "text-muted-foreground"}`}
            >
              Criar conta
            </button>
          </div>

          {aba === "entrar" ? (
            <form className="mt-6 space-y-4" onSubmit={handleEntrar}>
              <Campo label="E-mail" name="email" type="email" required placeholder="voce@email.com" />
              <Campo label="Senha" name="senha" type="password" required placeholder="••••••••" />
              <BotaoEnviar enviando={enviando} icone={<LogIn className="h-4 w-4" />} rotulo="Entrar" />
              <p className="text-center text-xs text-muted-foreground">
                Já pediu uma cotação antes? Use o mesmo e-mail — se ainda não tiver senha, crie sua
                conta na aba ao lado com esse e-mail.
              </p>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleCriarConta}>
              <Campo label="Nome completo" name="nome" required placeholder="Seu nome" />
              <Campo label="E-mail" name="email" type="email" required placeholder="voce@email.com" />
              <Campo label="Senha" name="senha" type="password" required placeholder="Mínimo 6 caracteres" />
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Telefone" name="telefone" placeholder="(00) 00000-0000" />
                <Campo label="CEP" name="cep" placeholder="00000-000" />
              </div>
              <BotaoEnviar enviando={enviando} icone={<UserPlus className="h-4 w-4" />} rotulo="Criar conta" />
            </form>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Campo({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
    </div>
  );
}

function BotaoEnviar({
  enviando,
  icone,
  rotulo,
}: {
  enviando: boolean;
  icone: React.ReactNode;
  rotulo: string;
}) {
  return (
    <button
      type="submit"
      disabled={enviando}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-3 text-sm font-semibold text-gold-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : icone}
      {enviando ? "Enviando..." : rotulo}
    </button>
  );
}
