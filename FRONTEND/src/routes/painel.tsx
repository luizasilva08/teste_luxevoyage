import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard, Users, Workflow, Package, FileSignature, Plane, Database, BarChart3, LogOut, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, logout } from "../lib/auth";
import { podeVerVisaoGeral, podeGerenciarPropostas, podeAdministrarTudo } from "../lib/permissoes";

export const Route = createFileRoute("/painel")({
  component: PainelLayout,
});

const NAV = [
  { to: "/painel", label: "Visão geral", icon: LayoutDashboard, exact: true, visivel: podeVerVisaoGeral },
  { to: "/painel/leads", label: "Atendimentos", icon: Workflow, visivel: () => true },
  { to: "/painel/propostas", label: "Propostas", icon: FileSignature, visivel: podeGerenciarPropostas },
  { to: "/painel/viagens", label: "Viagens", icon: Plane, visivel: () => true },
  { to: "/painel/clientes", label: "Clientes", icon: Users, visivel: () => true },
  { to: "/painel/pacotes", label: "Catálogo", icon: Package, visivel: () => true },
  { to: "/painel/relatorios", label: "Relatórios", icon: BarChart3, visivel: () => true },
  { to: "/painel/admin", label: "Administração", icon: Database, visivel: podeAdministrarTudo },
] as const;

function PainelLayout() {
  const { usuario, carregando } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!carregando && !usuario) {
      navigate({ to: "/auth" });
      return;
    }
    if (usuario && pathname === "/painel" && !podeVerVisaoGeral(usuario)) {
      navigate({ to: "/painel/leads" });
    }
  }, [carregando, usuario, navigate, pathname]);

  if (carregando || !usuario) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/40">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  function handleLogout() {
    logout();
    toast.success("Sessão encerrada.");
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-navy text-navy-foreground md:flex">
        <Link
          to="/"
          className="flex items-center gap-3 border-b border-navy-foreground/10 px-6 py-6"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/60 font-display text-lg text-gold">
            L
          </span>
          <span>
            <span className="block font-display text-lg">Luxe Voyage</span>
            <span className="block text-[10px] font-semibold tracking-[0.25em] text-navy-foreground/60">
              PAINEL
            </span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {NAV.filter((item) => item.visivel(usuario)).map((item) => {
            const ativo =
              "exact" in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${ativo ? "bg-gold text-gold-foreground" : "text-navy-foreground/75 hover:bg-navy-foreground/10"}`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-navy-foreground/10 px-4 py-5">
          <p className="px-4 text-sm font-semibold">{usuario.nome}</p>
          <p className="px-4 text-xs text-navy-foreground/60">
            {usuario.cargo || usuario.nivel_acesso}
          </p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-navy-foreground/75 hover:bg-navy-foreground/10"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4 md:hidden">
          <span className="font-display text-lg">Luxe Voyage · Painel</span>
          <button onClick={handleLogout} className="text-sm text-muted-foreground">
            Sair
          </button>
        </header>
        <div className="p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
