import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Facebook, Instagram, Twitter, Linkedin, Sparkles, Loader2 } from "lucide-react";
import concierge from "../assets/login-concierge.jpg";
import { ApiError } from "../lib/api";
import { login } from "../lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Luxe Voyage Brasil" },
      { name: "description", content: "Acesse sua conta Luxe Voyage e continue planejando sua próxima viagem." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;

    setEnviando(true);
    try {
      const usuario = await login(email, senha);
      toast.success(`Bem-vindo(a), ${usuario.nome}!`);
      navigate({ to: "/" });
    } catch (error) {
      const mensagem =
        error instanceof ApiError
          ? error.status === 401
            ? "E-mail ou senha inválidos."
            : error.message
          : "Não foi possível conectar à API. Verifique se ela está no ar.";
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/50 px-4 py-10 md:py-16">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_-40px_rgba(15,27,61,0.4)] md:grid-cols-2">
        {/* Left visual */}
        <div className="relative hidden min-h-[600px] md:block">
          <img src={concierge} alt="Consultora de viagens Luxe Voyage" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-8 text-navy-foreground">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/70 font-display text-xl text-gold">L</span>
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
          <span className="absolute right-6 top-6 text-gold/70"><Sparkles className="h-5 w-5" /></span>

          <h1 className="font-display text-4xl md:text-5xl">Bem-vindo(a) à LX</h1>
          <p className="mt-2 text-sm text-navy-foreground/70">Entre com suas credenciais para acessar o sistema</p>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-navy-foreground/85">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@luxevoyage.com"
                className="mt-2 w-full rounded-lg border border-navy-foreground/15 bg-navy-foreground/5 px-4 py-3 text-sm text-navy-foreground placeholder:text-navy-foreground/40 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-navy-foreground/85">Senha</label>
              <div className="relative mt-2">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-navy-foreground/15 bg-navy-foreground/5 px-4 py-3 pr-11 text-sm text-navy-foreground placeholder:text-navy-foreground/40 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-foreground/60 hover:text-gold">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-navy-foreground/80">
                <input type="checkbox" className="h-4 w-4 rounded border-navy-foreground/30 bg-transparent accent-gold" />
                Manter-me conectado
              </label>
              <a href="#" className="text-gold hover:underline">Esqueceu sua senha?</a>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-3.5 text-sm font-semibold text-gold-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              {enviando ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-navy-foreground/60">
            <a href="#" className="hover:text-gold">Termos de uso</a>
            <span>·</span>
            <a href="#" className="hover:text-gold">Política de privacidade</a>
          </div>

          <p className="mt-6 text-center text-sm text-navy-foreground/70">
            Ainda não tem conta?{" "}
            <Link to="/" className="font-semibold text-gold hover:underline">Cadastre-se</Link>
          </p>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-6xl text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-navy">← Voltar para o site</Link>
      </p>
    </main>
  );
}
