import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Users,
  Package,
  Handshake,
  Plane,
  FileSignature,
  UserPlus,
  BarChart3,
  Clock,
} from "lucide-react";
import { getDashboard } from "../../lib/painel";
import { useAuth } from "../../lib/auth";
import { podeVerVisaoGeral } from "../../lib/permissoes";
import { formatarPreco } from "../../lib/format";
import { imagemDestino, heroNoronha } from "../../lib/imagens";
import { MapaViagensPainel } from "../../components/painel/MapaViagensPainel";

export const Route = createFileRoute("/painel/")({
  component: DashboardPage,
});

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  Clientes: Users,
  Pacotes: Package,
  Parceiros: Handshake,
  Viagens: Plane,
  Propostas: FileSignature,
};

const CORES_DONUT = ["#0f1b3d", "#d4a24c", "#7c8bb3", "#e7c07a", "#b3bdd6", "#f0dcae"];

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function dataDeHoje() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

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

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-card" />
        <div className="h-64 animate-pulse rounded-2xl bg-card" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      </div>
    );
  }

  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "";
  const totalPropostas = (data.propostas_status ?? []).reduce((s, p) => s + p.total, 0);
  const oportunidadesAtivas = (data.funil ?? [])
    .filter((f) => !/perdid|ganh/i.test(f.rotulo))
    .reduce((s, f) => s + f.total, 0);
  const viagensConfirmadas = data.viagens_status
    .filter((v) => /confirmad|andamento/i.test(v.rotulo))
    .reduce((s, v) => s + v.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl text-foreground">
            {saudacao()}, {primeiroNome}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.escopo === "operacional"
              ? "Catálogo e viagens — o que depende da operação."
              : "Aqui está o resumo do funil comercial e das viagens."}
          </p>
        </div>
        <p className="text-sm capitalize text-muted-foreground">{dataDeHoje()}</p>
      </div>

      {data.escopo === "comercial" && (
        <div className="relative overflow-hidden rounded-2xl">
          <img src={heroNoronha} alt="" className="h-56 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy/85 via-navy/55 to-navy/10" />
          <div className="absolute inset-0 flex flex-col justify-between p-6">
            <div className="flex flex-wrap gap-6 text-navy-foreground">
              <div>
                <p className="font-display text-3xl">{oportunidadesAtivas}</p>
                <p className="text-sm text-navy-foreground/75">oportunidades ativas</p>
              </div>
              <div>
                <p className="font-display text-3xl">{viagensConfirmadas}</p>
                <p className="text-sm text-navy-foreground/75">viagens confirmadas ou em andamento</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/painel/leads"
                className="flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground hover:brightness-95"
              >
                <UserPlus className="h-4 w-4" /> Nova Cotação
              </Link>
              <Link
                to="/painel/clientes"
                className="flex items-center gap-2 rounded-full border border-navy-foreground/40 bg-navy-foreground/10 px-4 py-2 text-sm font-semibold text-navy-foreground hover:bg-navy-foreground/20"
              >
                <Users className="h-4 w-4" /> Novo Cliente
              </Link>
              <Link
                to="/painel/relatorios"
                className="flex items-center gap-2 rounded-full border border-navy-foreground/40 bg-navy-foreground/10 px-4 py-2 text-sm font-semibold text-navy-foreground hover:bg-navy-foreground/20"
              >
                <BarChart3 className="h-4 w-4" /> Ver Relatórios
              </Link>
            </div>
          </div>
        </div>
      )}

      <div
        className={`grid gap-4 sm:grid-cols-2 ${data.escopo === "comercial" ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
      >
        {Object.entries({
          ...data.metricas,
          ...(data.escopo === "comercial" ? { Propostas: totalPropostas } : {}),
        }).map(([rotulo, total]) => {
          const Icon = ICONES[rotulo] ?? Package;
          return (
            <div key={rotulo} className="rounded-2xl border border-border bg-card p-6">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-navy/10 text-navy">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-display text-4xl text-foreground">{total}</p>
              <p className="text-sm text-muted-foreground">{rotulo}</p>
            </div>
          );
        })}
      </div>

      {data.escopo === "operacional" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <PainelBarras titulo="Pacotes por status" dados={data.pacotes_status ?? []} />
          <PainelBarras titulo="Viagens por status" dados={data.viagens_status} />
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <PainelFunil titulo="Funil de Oportunidades" dados={data.funil ?? []} />
            <PainelDonut titulo="Propostas por status" dados={data.propostas_status ?? []} />
            <ProximosEmbarques dados={data.proximos_embarques ?? []} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <PainelReceita receita={data.receita_mes} />
            <DestinosMaisVendidos dados={data.destinos_mais_vendidos ?? []} />
            <PainelBarras titulo="Viagens por status" dados={data.viagens_status} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <UltimasAtividades dados={data.atividades_recentes ?? []} />
            <MapaViagensPainel dados={data.viagens_por_estado ?? []} />
          </div>
        </>
      )}
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

// Funil de vendas: mesma lista de barras, só que ordenada da maior pra
// menor etapa e com largura decrescente, pra dar a leitura visual de
// funil (topo largo, base estreita) sem inventar nenhum dado.
function PainelFunil({
  titulo,
  dados,
}: {
  titulo: string;
  dados: { rotulo: string; total: number }[];
}) {
  const ordenado = [...dados].sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...ordenado.map((d) => d.total));
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl text-foreground">{titulo}</h2>
      {ordenado.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Sem dados ainda.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {ordenado.map((d, i) => {
            const pct = (d.total / max) * 100;
            const percentual = Math.round((d.total / ordenado[0].total) * 100) || 0;
            return (
              <div key={d.rotulo}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{d.rotulo}</span>
                  <span className="text-muted-foreground">
                    {d.total} ({percentual}%)
                  </span>
                </div>
                <div className="mt-1.5 h-3 rounded-full bg-muted">
                  <div
                    className="h-3 rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: CORES_DONUT[i % CORES_DONUT.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PainelDonut({
  titulo,
  dados,
}: {
  titulo: string;
  dados: { rotulo: string; total: number }[];
}) {
  const total = dados.reduce((s, d) => s + d.total, 0);
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl text-foreground">{titulo}</h2>
      {dados.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Sem dados ainda.</p>
      ) : (
        <>
          <div className="relative mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dados}
                  dataKey="total"
                  nameKey="rotulo"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {dados.map((_, i) => (
                    <Cell key={i} fill={CORES_DONUT[i % CORES_DONUT.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, "Total"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl text-foreground">{total}</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {dados.map((d, i) => (
              <li key={d.rotulo} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CORES_DONUT[i % CORES_DONUT.length] }}
                  />
                  {d.rotulo}
                </span>
                <span className="text-muted-foreground">
                  {d.total} ({Math.round((d.total / total) * 100) || 0}%)
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PainelReceita({ receita }: { receita?: import("../../lib/painel").ReceitaMes }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl text-foreground">Receita (este mês)</h2>
      {!receita || receita.total_viagens === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhum embarque previsto para este mês.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Receita prevista</span>
            <span className="font-display text-lg text-foreground">
              R$ {formatarPreco(receita.prevista)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Receita confirmada</span>
            <span className="font-display text-lg text-foreground">
              R$ {formatarPreco(receita.confirmada)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Ticket médio</span>
            <span className="font-display text-lg text-foreground">
              R$ {formatarPreco(receita.ticket_medio)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function DestinosMaisVendidos({
  dados,
}: {
  dados: { destino: string; estado_sigla: string; total: number }[];
}) {
  const max = Math.max(1, ...dados.map((d) => d.total));
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl text-foreground">Destinos mais vendidos</h2>
      {dados.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Sem viagens vendidas ainda.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {dados.map((d, i) => (
            <div key={`${d.destino}-${d.estado_sigla}`} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-sm font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium text-foreground">
                    {d.destino} · {d.estado_sigla}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{d.total}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-gold"
                    style={{ width: `${(d.total / max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProximosEmbarques({
  dados,
}: {
  dados: {
    id_viagem: number;
    data_embarque: string;
    cliente_nome: string;
    nome_pacote: string | null;
    destino: string | null;
    estado_sigla: string | null;
  }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl text-foreground">Próximos embarques</h2>
      {dados.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhum embarque agendado.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {dados.map((v) => {
            const data = new Date(v.data_embarque);
            return (
              <li key={v.id_viagem} className="flex items-center gap-3">
                <img
                  src={imagemDestino(undefined, v.id_viagem)}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {v.destino ?? v.nome_pacote ?? "Destino a definir"}
                    {v.estado_sigla ? ` · ${v.estado_sigla}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{v.cliente_nome}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-navy">
                  {data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function UltimasAtividades({
  dados,
}: {
  dados: {
    id_interacao: number;
    tipo_interacao: string;
    data_interacao: string;
    cliente_nome: string | null;
    consultor_nome: string | null;
  }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl text-foreground">Últimas atividades</h2>
      {dados.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {dados.map((a) => (
            <li key={a.id_interacao} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                <Clock className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-foreground">
                  <span className="font-medium">{a.consultor_nome ?? "Equipe"}</span>{" "}
                  registrou "{a.tipo_interacao}"
                  {a.cliente_nome ? (
                    <>
                      {" "}
                      com <span className="font-medium">{a.cliente_nome}</span>
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.data_interacao).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
