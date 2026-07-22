import { useQuery } from "@tanstack/react-query";
import { listarEstados, type EstadoResumo } from "../../lib/catalogo";

// Cartograma simplificado do Brasil em grade — cada estado numa célula
// (linha, coluna) aproximando sua posição geográfica real, sem precisar
// de um mapa vetorial de verdade.
const POSICOES: Record<string, { linha: number; coluna: number }> = {
  RR: { linha: 1, coluna: 2 },
  AP: { linha: 1, coluna: 3 },
  AM: { linha: 2, coluna: 1 },
  PA: { linha: 2, coluna: 2 },
  MA: { linha: 2, coluna: 3 },
  CE: { linha: 2, coluna: 4 },
  RN: { linha: 2, coluna: 5 },
  AC: { linha: 3, coluna: 1 },
  RO: { linha: 3, coluna: 2 },
  TO: { linha: 3, coluna: 3 },
  PI: { linha: 3, coluna: 4 },
  PE: { linha: 3, coluna: 5 },
  PB: { linha: 3, coluna: 6 },
  MT: { linha: 4, coluna: 3 },
  BA: { linha: 4, coluna: 4 },
  SE: { linha: 4, coluna: 5 },
  AL: { linha: 4, coluna: 6 },
  MS: { linha: 5, coluna: 2 },
  GO: { linha: 5, coluna: 3 },
  DF: { linha: 5, coluna: 4 },
  MG: { linha: 5, coluna: 5 },
  ES: { linha: 5, coluna: 6 },
  SP: { linha: 6, coluna: 4 },
  RJ: { linha: 6, coluna: 5 },
  PR: { linha: 7, coluna: 3 },
  SC: { linha: 7, coluna: 4 },
  RS: { linha: 8, coluna: 2 },
};

const CORES_REGIAO: Record<string, { bg: string; ring: string; dot: string }> = {
  Norte: { bg: "bg-emerald-500", ring: "ring-emerald-600", dot: "bg-emerald-500" },
  Nordeste: { bg: "bg-amber-500", ring: "ring-amber-600", dot: "bg-amber-500" },
  "Centro-Oeste": { bg: "bg-yellow-600", ring: "ring-yellow-700", dot: "bg-yellow-600" },
  Sudeste: { bg: "bg-rose-600", ring: "ring-rose-700", dot: "bg-rose-600" },
  Sul: { bg: "bg-navy", ring: "ring-navy", dot: "bg-navy" },
};

const LEGENDA = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

export function MapaEstados({
  selecionado,
  onSelecionar,
}: {
  selecionado?: string;
  onSelecionar: (sigla: string | undefined) => void;
}) {
  const { data, isLoading } = useQuery({ queryKey: ["publico-estados"], queryFn: listarEstados });
  const estados = data ?? [];
  const porSigla = new Map(estados.map((e) => [e.estado_sigla, e]));

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl text-foreground">Explore por estado</h3>
          <p className="mt-1 text-sm text-muted-foreground">Clique em um estado para filtrar destinos.</p>
        </div>
        {selecionado && (
          <button
            onClick={() => onSelecionar(undefined)}
            className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:border-gold hover:text-foreground"
          >
            Limpar
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 h-56 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div
          className="mt-6 grid gap-1.5"
          style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
        >
          {Object.entries(POSICOES).map(([sigla, pos]) => {
            const info = porSigla.get(sigla);
            const total = info?.total_pacotes ?? 0;
            const cores = info ? CORES_REGIAO[info.regiao_nome] : undefined;
            const ativo = selecionado === sigla;
            const disponivel = total > 0;

            return (
              <button
                key={sigla}
                disabled={!disponivel}
                onClick={() => onSelecionar(ativo ? undefined : sigla)}
                title={info ? `${info.estado_nome} · ${total} pacote${total === 1 ? "" : "s"}` : sigla}
                style={{ gridRow: pos.linha, gridColumn: pos.coluna }}
                className={[
                  "flex aspect-square flex-col items-center justify-center rounded-lg text-[10px] font-bold uppercase leading-tight transition",
                  disponivel
                    ? `${cores?.bg} text-white hover:brightness-110`
                    : "cursor-not-allowed bg-muted text-muted-foreground/60",
                  ativo ? `ring-2 ring-offset-2 ${cores?.ring ?? ""}` : "",
                ].join(" ")}
              >
                <span>{sigla}</span>
                {disponivel && <span className="text-[9px] font-medium opacity-90">{total}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
        {LEGENDA.map((regiao) => (
          <span key={regiao} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${CORES_REGIAO[regiao].dot}`} />
            {regiao}
          </span>
        ))}
      </div>
    </div>
  );
}

export type { EstadoResumo };
