import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, TrendingUp, Compass } from "lucide-react";
import { listarDestinos, type Destino } from "../../lib/catalogo";

const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Campo de destino com sugestões: sem digitar nada, mostra os destinos
 * mais procurados (mais pacotes) e atalhos por região; digitando, filtra
 * por cidade ou estado. Clicar num resultado já navega direto pro
 * catálogo filtrado, sem precisar apertar Buscar.
 */
export function DestinoCombobox({
  value,
  onChange,
  onSelecionarDestino,
  onSelecionarRegiao,
}: {
  value: string;
  onChange: (valor: string) => void;
  onSelecionarDestino: (destino: Destino) => void;
  onSelecionarRegiao: (regiao: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: destinos } = useQuery({ queryKey: ["publico-destinos"], queryFn: listarDestinos });
  const lista = destinos ?? [];

  const recomendados = useMemo(
    () => [...lista].sort((a, b) => b.total_pacotes - a.total_pacotes).slice(0, 6),
    [lista],
  );

  const filtrados = useMemo(() => {
    const termo = normalizar(value.trim());
    if (!termo) return [];
    return lista
      .filter(
        (d) => normalizar(d.destino).includes(termo) || normalizar(d.estado_nome).includes(termo),
      )
      .slice(0, 8);
  }, [lista, value]);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const mostrarFiltrados = value.trim().length > 0;
  const resultados = mostrarFiltrados ? filtrados : recomendados;

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setAberto(true)}
        placeholder="Para onde vamos? Ex: Bahia, Gramado..."
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />

      {aberto && (
        <div className="absolute left-0 right-0 top-full z-20 mt-3 w-[22rem] max-w-[90vw] rounded-xl border border-border bg-card p-3 shadow-[0_20px_60px_-25px_rgba(15,27,61,0.35)]">
          {mostrarFiltrados ? (
            resultados.length > 0 ? (
              <ul className="space-y-0.5">
                {resultados.map((d) => (
                  <li key={d.id_municipio}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelecionarDestino(d);
                        setAberto(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
                        <span>
                          {d.destino}{" "}
                          <span className="text-muted-foreground">· {d.estado_sigla}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {d.total_pacotes} pacote{d.total_pacotes === 1 ? "" : "s"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">
                Nenhum destino encontrado com esse nome.
              </p>
            )
          ) : (
            <>
              <p className="flex items-center gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> Mais procurados
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {resultados.map((d) => (
                  <li key={d.id_municipio}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelecionarDestino(d);
                        setAberto(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
                        <span>
                          {d.destino}{" "}
                          <span className="text-muted-foreground">· {d.estado_sigla}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {d.total_pacotes} pacote{d.total_pacotes === 1 ? "" : "s"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <p className="mt-3 flex items-center gap-1.5 border-t border-border px-2.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                <Compass className="h-3 w-3" /> Explorar por região
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 px-2.5">
                {REGIOES.map((regiao) => (
                  <button
                    key={regiao}
                    type="button"
                    onClick={() => {
                      onSelecionarRegiao(regiao);
                      setAberto(false);
                    }}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/80 hover:border-gold hover:text-foreground"
                  >
                    {regiao}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
