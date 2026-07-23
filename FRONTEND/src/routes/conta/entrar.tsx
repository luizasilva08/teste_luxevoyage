import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Sparkles,
  Loader2,
} from "lucide-react";
import concierge from "../../assets/login-concierge.jpg";
import { clienteLogin, clienteRegistrar } from "../../lib/cliente";
import { ApiError } from "../../lib/api";
import { maskTelefone, maskCEP } from "../../lib/mascaras";

export const Route = createFileRoute("/conta/entrar")({
  head: () => ({
    meta: [
      { title: "Minha conta · Luxe Voyage Brasil" },
      {
        name: "description",
        content: "Acesse sua conta Luxe Voyage e acompanhe cotações, viagens e pagamentos.",
      },
    ],
  }),
  component: ContaEntrarPage,
});

function ContaEntrarPage() {
  const [aba, setAba] = useState<"entrar" | "criar">("entrar");
  const [showPw, setShowPw] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [cep, setCep] = useState("");
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
        telefone: telefone || undefined,
        cep: cep || undefined,
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
    <main className="min-h-screen bg-muted/50 px-4 py-10 md:py-16">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-40px_rgba(15,27,61,0.4)] md:grid-cols-2">
        {/* Left visual */}
        <div className="relative hidden min-h-[600px] md:block">
          <img
            src={concierge}
            alt="Consultora de viagens Luxe Voyage"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-8 text-navy-foreground">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/70 font-display text-xl text-gold">
                L
              </span>
              <span className="font-display text-2xl">Luxe Voyage</span>
            </div>
            <div className="flex gap-3 text-white/85">
              <Facebook className="h-4 w-4" />
              <Instagram className="h-4 w-4" />
              <Twitter className="h-4 w-4" />
              <Linkedin className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="relative bg-navy p-10 text-navy-foreground md:p-14">
          <span className="absolute right-6 top-6 text-gold/70">
            <Sparkles className="h-5 w-5" />
          </span>

          <h1 className="font-display text-4xl md:text-5xl">Minha conta</h1>
          <p className="mt-2 text-sm text-navy-foreground/70">
            Acompanhe suas cotações, viagens e pagamentos num só lugar.
          </p>

          <div className="mt-8 flex rounded-full border border-navy-foreground/15 bg-navy-foreground/5 p-1 text-sm">
            <button
              type="button"
              onClick={() => setAba("entrar")}
              className={`flex-1 rounded-full py-2 font-semibold transition ${aba === "entrar" ? "bg-gold text-gold-foreground" : "text-navy-foreground/70"}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setAba("criar")}
              className={`flex-1 rounded-full py-2 font-semibold transition ${aba === "criar" ? "bg-gold text-gold-foreground" : "text-navy-foreground/70"}`}
            >
              Criar conta
            </button>
          </div>

          {aba === "entrar" ? (
            <form className="mt-8 space-y-5" onSubmit={handleEntrar}>
              <CampoNavy label="E-mail" name="email" type="email" required placeholder="nome@email.com" />

              <div>
                <label className="text-sm font-medium text-navy-foreground/85">Senha</label>
                <div className="relative mt-2">
                  <input
                    name="senha"
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-navy-foreground/15 bg-navy-foreground/5 px-4 py-3 pr-11 text-sm text-navy-foreground placeholder:text-navy-foreground/40 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-foreground/60 hover:text-gold"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-3.5 text-sm font-semibold text-gold-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                {enviando ? "Entrando..." : "Entrar"}
              </button>

              <p className="text-center text-xs text-navy-foreground/60">
                Já pediu uma cotação antes? Use o mesmo e-mail — se ainda não tiver senha, crie sua
                conta na aba "Criar conta".
              </p>
            </form>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleCriarConta}>
              <CampoNavy label="Nome completo" name="nome" required placeholder="Seu nome" />
              <CampoNavy label="E-mail" name="email" type="email" required placeholder="nome@email.com" />

              <div>
                <label className="text-sm font-medium text-navy-foreground/85">Senha</label>
                <div className="relative mt-2">
                  <input
                    name="senha"
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-lg border border-navy-foreground/15 bg-navy-foreground/5 px-4 py-3 pr-11 text-sm text-navy-foreground placeholder:text-navy-foreground/40 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-foreground/60 hover:text-gold"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-navy-foreground/85">Telefone</label>
                  <input
                    name="telefone"
                    type="tel"
                    inputMode="numeric"
                    value={telefone}
                    onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    className="mt-2 w-full rounded-lg border border-navy-foreground/15 bg-navy-foreground/5 px-4 py-3 text-sm text-navy-foreground placeholder:text-navy-foreground/40 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-navy-foreground/85">CEP</label>
                  <input
                    name="cep"
                    inputMode="numeric"
                    value={cep}
                    onChange={(e) => setCep(maskCEP(e.target.value))}
                    maxLength={9}
                    placeholder="00000-000"
                    className="mt-2 w-full rounded-lg border border-navy-foreground/15 bg-navy-foreground/5 px-4 py-3 text-sm text-navy-foreground placeholder:text-navy-foreground/40 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-3.5 text-sm font-semibold text-gold-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                {enviando ? "Criando..." : "Criar conta"}
              </button>
            </form>
          )}

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-navy-foreground/60">
            <a href="#" className="hover:text-gold">
              Termos de uso
            </a>
            <span>·</span>
            <a href="#" className="hover:text-gold">
              Política de privacidade
            </a>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-6xl text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-navy">
          ← Voltar para o site
        </Link>
      </p>
    </main>
  );
}

function CampoNavy({
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
      <label className="text-sm font-medium text-navy-foreground/85">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-navy-foreground/15 bg-navy-foreground/5 px-4 py-3 text-sm text-navy-foreground placeholder:text-navy-foreground/40 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
    </div>
  );
}
