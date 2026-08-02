import type { ViagensPorEstado } from "../../lib/painel";

// Mesmo cartograma em grade do MapaEstados (site público), mas aqui
// coloridas por volume de viagens (escala azul sequencial) em vez de
// por região — é o que a Visão Geral comercial precisa mostrar.
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

const FAIXAS = [
  { min: 0, max: 0, rotulo: "0 viagens", classe: "bg-muted text-muted-foreground/60" },
  { min: 1, max: 10, rotulo: "1 – 10 viagens", classe: "bg-sky-200 text-sky-900" },
  { min: 11, max: 30, rotulo: "11 – 30 viagens", classe: "bg-sky-400 text-white" },
  { min: 31, max: 50, rotulo: "31 – 50 viagens", classe: "bg-sky-600 text-white" },
  { min: 51, max: Infinity, rotulo: "+ de 50 viagens", classe: "bg-sky-900 text-white" },
];

function faixaDe(total: number) {
  return FAIXAS.find((f) => total >= f.min && total <= f.max) ?? FAIXAS[0];
}

export function MapaViagensPainel({ dados }: { dados: ViagensPorEstado[] }) {
  const porSigla = new Map(dados.map((d) => [d.estado_sigla, d.total]));

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-foreground">Mapa de viagens</h2>
      </div>

      <div className="mt-6 grid gap-1.5" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
        {Object.entries(POSICOES).map(([sigla, pos]) => {
          const total = porSigla.get(sigla) ?? 0;
          const faixa = faixaDe(total);
          return (
            <div
              key={sigla}
              title={`${sigla} · ${total} viagem${total === 1 ? "" : "s"}`}
              style={{ gridRow: pos.linha, gridColumn: pos.coluna }}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[10px] font-bold uppercase leading-tight ${faixa.classe}`}
            >
              <span>{sigla}</span>
              {total > 0 && <span className="text-[9px] font-medium opacity-90">{total}</span>}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
        {FAIXAS.map((f) => (
          <span key={f.rotulo} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${f.classe.split(" ")[0]}`} />
            {f.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}
