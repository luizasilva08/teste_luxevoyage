import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth, logout } from "../../lib/auth";

const NAV_ITEMS = [
  { label: "Home", to: "/" as const },
  { label: "Pacotes", to: "/pacotes" as const },
];

export function SiteHeader() {
  const { usuario, carregando } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    toast.success("Sessão encerrada.");
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-navy-foreground font-display text-xl">
            L
          </span>
          <span className="leading-tight">
            <span className="block font-display text-xl text-foreground">Luxe Voyage</span>
            <span className="block text-[10px] font-semibold tracking-[0.3em] text-muted-foreground">
              BRASIL
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-border bg-card/70 p-1.5 text-sm md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-5 py-2 text-foreground/70 transition hover:text-foreground data-[status=active]:bg-navy data-[status=active]:text-navy-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {carregando ? null : usuario ? (
            <>
              <Link
                to="/painel"
                className="hidden text-sm font-medium text-foreground/80 hover:text-foreground md:inline"
              >
                Olá, {usuario.nome.split(" ")[0]} · Painel
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-navy-foreground transition hover:opacity-90"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground md:inline-flex"
              >
                <LogIn className="h-4 w-4" /> Entrar
              </Link>
              <Link
                to="/pacotes"
                className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-navy-foreground transition hover:opacity-90"
              >
                Ver pacotes
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
