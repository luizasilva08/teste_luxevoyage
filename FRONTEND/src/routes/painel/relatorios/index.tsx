import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, FileBarChart, Loader2 } from "lucide-react";
import { listarRelatorios, executarRelatorio, type RelatorioMeta } from "../../../lib/relatorios";

export const Route = createFileRoute("/painel/relatorios/")({
  component: RelatoriosPage,
});

function baixarCsv(titulo: string, registros: Record<string, unknown>[]) {
  if (registros.length === 0) return;
  const colunas = Object.keys(registros[0]);
  const escapar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const linhas = [
    colunas.join(","),
    ...registros.map((r) => colunas.map((c) => escapar(r[c])).join(",")),
  ];
  const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function RelatoriosPage() {
  const [selecionado, setSelecionado] = useState<RelatorioMeta | null>(null);

  const { data: relatorios, isLoading: carregandoLista } = useQuery({
    queryKey: ["relatorios-lista"],
    queryFn: listarRelatorios,
  });

  const { data: resultado, isLoading: carregandoResultado } = useQuery({
    queryKey: ["relatorio-resultado", selecionado?.id],
    queryFn: () => executarRelatorio(selecionado!.id),
    enabled: !!selecionado,
  });

  const porCategoria = useMemo(() => {
    const grupos: Record<string, RelatorioMeta[]> = {};
    for (const r of relatorios ?? []) {
      (grupos[r.categoria] ??= []).push(r);
    }
    return grupos;
  }, [relatorios]);

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">Relatórios</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Consultas prontas sobre o negócio — só aparecem aqui as que fazem sentido pro seu perfil.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-6">
          {carregandoLista && <div className="h-40 animate-pulse rounded-2xl bg-card" />}
          {Object.entries(porCategoria).map(([categoria, itens]) => (
            <div key={categoria}>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">{categoria}</p>
              <ul className="mt-2 space-y-1">
                {itens.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelecionado(r)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${selecionado?.id === r.id ? "bg-navy text-navy-foreground" : "text-foreground hover:bg-muted"}`}
                    >
                      {r.titulo}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!carregandoLista && (relatorios ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum relatório disponível pro seu perfil.</p>
          )}
        </aside>

        <div>
          {!selecionado && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <FileBarChart className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Escolha um relatório na lista ao lado.
              </p>
            </div>
          )}

          {selecionado && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl text-foreground">{selecionado.titulo}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{selecionado.descricao}</p>
                </div>
                {resultado && resultado.registros.length > 0 && (
                  <button
                    onClick={() => baixarCsv(resultado.titulo, resultado.registros)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" /> Exportar CSV
                  </button>
                )}
              </div>

              <div className="mt-6">
                {carregandoResultado && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Rodando consulta...
                  </div>
                )}
                {resultado && <TabelaResultado registros={resultado.registros} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatarCelula(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function TabelaResultado({ registros }: { registros: Record<string, unknown>[] }) {
  if (registros.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum resultado pra essa consulta agora.</p>;
  }
  const colunas = Object.keys(registros[0]);
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {colunas.map((c) => (
              <th key={c} className="whitespace-nowrap px-4 py-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registros.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {colunas.map((c) => (
                <td key={c} className="whitespace-nowrap px-4 py-2.5 text-foreground">
                  {formatarCelula(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        {registros.length} linha(s).
      </p>
    </div>
  );
}
