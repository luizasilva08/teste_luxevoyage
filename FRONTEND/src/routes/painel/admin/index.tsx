import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ChevronRight, Loader2, Table2 } from "lucide-react";
import { getRegistro } from "../../../lib/admin";
import { useAuth } from "../../../lib/auth";
import { podeAdministrarTudo } from "../../../lib/permissoes";

export const Route = createFileRoute("/painel/admin/")({
  component: AdminIndexPage,
});

function AdminIndexPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const podeAcessar = podeAdministrarTudo(usuario);

  useEffect(() => {
    if (usuario && !podeAcessar) navigate({ to: "/painel" });
  }, [usuario, podeAcessar, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-registro"],
    queryFn: getRegistro,
    enabled: podeAcessar,
  });

  if (!podeAcessar) {
    return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">Administração</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Acesso direto às {data ? Object.values(data).reduce((n, t) => n + Object.keys(t).length, 0) : "..."} tabelas
        do banco, domínio por domínio — o mesmo cadastro que alimenta o menu de terminal
        (<code className="text-xs">main.py</code>). Só o Admin vê essa área.
      </p>

      {isLoading && <div className="mt-8 h-64 animate-pulse rounded-2xl bg-card" />}

      {data && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {Object.entries(data).map(([dominio, tabelas]) => (
            <div key={dominio} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl text-foreground">{dominio}</h2>
              <ul className="mt-4 divide-y divide-border">
                {Object.keys(tabelas).map((tabela) => (
                  <li key={tabela}>
                    <Link
                      to="/painel/admin/$dominio/$tabela"
                      params={{ dominio, tabela }}
                      className="flex items-center justify-between py-2.5 text-sm text-foreground hover:text-navy"
                    >
                      <span className="flex items-center gap-2">
                        <Table2 className="h-3.5 w-3.5 text-muted-foreground" /> {tabela}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando estrutura...
        </div>
      )}
    </div>
  );
}
