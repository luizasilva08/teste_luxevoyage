import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { SiteHeader } from "../../components/site/SiteHeader";
import { SiteFooter } from "../../components/site/SiteFooter";
import { MapaEstados } from "../../components/site/MapaEstados";
import { listarPacotes, type PacoteResumo } from "../../lib/catalogo";
import { imagemDestino } from "../../lib/imagens";
import { formatarPreco } from "../../lib/format";

const buscaSchema = z.object({
  busca: z.string().optional(),
  regiao: z.string().optional(),
  estado: z.string().optional(),
});

export const Route = createFileRoute("/pacotes/")({
  validateSearch: buscaSchema,
  head: () => ({
    meta: [{ title: "Pacotes de viagem · Luxe Voyage Brasil" }],
  }),
  component: PacotesPage,
});

const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

function PacotesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [termo, setTermo] = useState(search.busca ?? "");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pacotes", search],
    queryFn: () =>
      listarPacotes({
        busca: search.busca,
        regiao: search.regiao,
        estado: search.estado,
        limit: 200,
      }),
  });
  const pacotes = data?.registros ?? [];

  function aplicarBusca(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: { ...search, busca: termo || undefined } });
  }

  function alternarRegiao(regiao: string) {
    navigate({ search: { ...search, regiao: search.regiao === regiao ? undefined : regiao } });
  }

  function selecionarEstado(estado: string | undefined) {
    navigate({ search: { ...search, estado } });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border bg-muted/40 py-14">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            Catálogo completo
          </p>
          <h1 className="mt-3 font-display text-5xl">
            Encontre o pacote{" "}
            <em className="not-italic text-navy underline decoration-gold decoration-4 underline-offset-8">
              perfeito
            </em>
          </h1>

          <form onSubmit={aplicarBusca} className="mt-8 flex max-w-xl gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
              <MapPin className="h-4 w-4 text-gold" />
              <input
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Busque por destino ou nome do pacote"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-navy-foreground hover:opacity-90"
            >
              <Search className="h-4 w-4" /> Buscar
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Região
            </span>
            {REGIOES.map((r) => (
              <button
                key={r}
                onClick={() => alternarRegiao(r)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${search.regiao === r ? "border-navy bg-navy text-navy-foreground" : "border-border bg-card hover:bg-muted"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <MapaEstados selecionado={search.estado} onSelecionar={selecionarEstado} />
          </aside>

          <div>
            {isLoading && (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[360px] animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            )}
            {isError && (
              <p className="text-muted-foreground">
                Não foi possível carregar os pacotes agora. Tente novamente em instantes.
              </p>
            )}
            {!isLoading && !isError && pacotes.length === 0 && (
              <p className="text-muted-foreground">
                Nenhum pacote encontrado com esses filtros. Tente ampliar a busca.
              </p>
            )}
            {!isLoading && pacotes.length > 0 && (
              <>
                <p className="mb-6 text-sm text-muted-foreground">
                  {pacotes.length} pacote{pacotes.length === 1 ? "" : "s"} encontrado
                  {pacotes.length === 1 ? "" : "s"}
                </p>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {pacotes.map((p) => (
                    <PacoteCard key={p.id_pacote} p={p} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

const CORES_STATUS_PACOTE: Record<string, string> = {
  Publicado: "bg-emerald-600",
  Ativo: "bg-emerald-600",
  "Em Revisão": "bg-amber-600",
  Rascunho: "bg-muted-foreground/70",
  Inativo: "bg-red-600",
};

function PacoteCard({ p }: { p: PacoteResumo }) {
  const corStatus = CORES_STATUS_PACOTE[p.status] ?? "bg-muted-foreground/70";
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card">
      <Link to="/pacotes/$id" params={{ id: String(p.id_pacote) }} className="relative block h-56">
        <img
          src={imagemDestino(p.regiao_nome, p.id_pacote)}
          alt={p.destino}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {p.destaque && (
          <span className="absolute left-3 top-3 rounded-md bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-foreground">
            {p.destaque}
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-md bg-navy/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-navy-foreground">
          {p.categoria || p.regiao_nome}
        </span>
        <span
          className={`absolute bottom-3 right-3 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white ${corStatus}`}
        >
          {p.status}
        </span>
      </Link>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">
          {p.destino} · {p.estado_sigla}
        </p>
        <Link to="/pacotes/$id" params={{ id: String(p.id_pacote) }}>
          <h3 className="mt-1 font-display text-2xl leading-tight hover:text-navy">
            {p.nome_pacote}
          </h3>
        </Link>
        <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              A partir de
            </p>
            <p className="font-display text-3xl text-navy">R$ {formatarPreco(p.preco_a_partir)}</p>
          </div>
          <Link
            to="/pacotes/$id"
            params={{ id: String(p.id_pacote) }}
            className="rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-navy-foreground hover:opacity-90"
          >
            Ver detalhes
          </Link>
        </div>
      </div>
    </article>
  );
}
