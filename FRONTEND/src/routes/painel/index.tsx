import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, Handshake, Plane } from "lucide-react";
import { getDashboard } from "../../lib/painel";
import { useAuth } from "../../lib/auth";
import { podeVerVisaoGeral } from "../../lib/permissoes";

export const Route = createFileRoute("/painel/")({
  component: DashboardPage,
});

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  Clientes: Users,
  Pacotes: Package,
  Parceiros: Handshake,
  Viagens: Plane,
};

function DashboardPage() {
  const { usuario } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["painel-dashboard"],
    queryFn: getDashboard,
    enabled: podeVerVisaoGeral(usuario),
  });

  if (!podeVerVisaoGeral(usuario)) {
    return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">Visão geral</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data?.escopo === "operacional"
          ? "Catálogo e viagens — o que depende da operação."
          : "Como está o funil comercial agora."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
          ))}
        {data &&
          Object.entries(data.metricas).map(([rotulo, total]) => {
            const Icon = ICONES[rotulo] ?? Package;
            return (
              <div key={rotulo} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-navy/10 text-navy">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 font-display text-4xl text-foreground">{total}</p>
                <p className="text-sm text-muted-foreground">{rotulo}</p>
              </div>
            );
          })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {data?.escopo === "operacional" ? (
          <PainelBarras titulo="Pacotes por status" dados={data.pacotes_status ?? []} />
        ) : (
          <>
            <PainelBarras titulo="Funil de oportunidades" dados={data?.funil ?? []} />
            <PainelBarras titulo="Propostas por status" dados={data?.propostas_status ?? []} />
          </>
        )}
        <PainelBarras titulo="Viagens por status" dados={data?.viagens_status ?? []} />
      </div>
    </div>
  );
}

function PainelBarras({
  titulo,
  dados,
}: {
  titulo: string;
  dados: { rotulo: string; total: number }[];
}) {
  const max = Math.max(1, ...dados.map((d) => d.total));
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl text-foreground">{titulo}</h2>
      {dados.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Sem dados ainda.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {dados.map((d) => (
            <div key={d.rotulo}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{d.rotulo}</span>
                <span className="text-muted-foreground">{d.total}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-gold"
                  style={{ width: `${(d.total / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
