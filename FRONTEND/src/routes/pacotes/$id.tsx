import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Sparkles, ChevronLeft } from "lucide-react";
import { SiteHeader } from "../../components/site/SiteHeader";
import { SiteFooter } from "../../components/site/SiteFooter";
import { QuoteDialog } from "../../components/site/QuoteDialog";
import { buscarPacote } from "../../lib/catalogo";
import { imagemDestino } from "../../lib/imagens";
import { formatarPreco, formatarData } from "../../lib/format";

export const Route = createFileRoute("/pacotes/$id")({
  component: PacoteDetalhePage,
});

function PacoteDetalhePage() {
  const { id } = Route.useParams();
  const {
    data: pacote,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["pacote", id],
    queryFn: () => buscarPacote(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (isError || !pacote) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="font-display text-3xl">Pacote não encontrado</h1>
          <p className="mt-3 text-muted-foreground">Esse pacote pode não estar mais disponível.</p>
          <Link
            to="/pacotes"
            className="mt-6 inline-block rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-navy-foreground hover:opacity-90"
          >
            Ver outros pacotes
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const imagem = imagemDestino(pacote.regiao_nome, pacote.id_pacote);
  const destinoLabel = `${pacote.destino} · ${pacote.estado_sigla}`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="relative h-[420px] w-full overflow-hidden">
        <img src={imagem} alt={pacote.destino} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-6 pb-10 text-white">
          <Link
            to="/pacotes"
            className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Todos os pacotes
          </Link>
          <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            <MapPin className="h-3.5 w-3.5" /> {destinoLabel} · {pacote.regiao_nome}
          </p>
          <h1 className="mt-2 font-display text-5xl leading-tight md:text-6xl">
            {pacote.nome_pacote}
          </h1>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="font-display text-3xl">O que está incluso</h2>
          {pacote.servicos.length === 0 ? (
            <p className="mt-4 text-muted-foreground">
              Os serviços deste pacote ainda estão sendo definidos pela nossa equipe — fale com um
              consultor para saber mais.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {pacote.servicos.map((s) => (
                <div
                  key={s.id_modulo}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-navy" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.nome_servico}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.categoria_servico} · {s.parceiro}
                    </p>
                    {!s.obrigatorio && (
                      <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Opcional
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pacote.precos_sazonais.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-3xl">Preços por temporada</h2>
              <div className="mt-6 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Temporada</th>
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3 text-right">Valor estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pacote.precos_sazonais.map((p, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{p.temporada}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatarData(p.data_inicio)} – {formatarData(p.data_fim)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-navy">
                          R$ {formatarPreco(p.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_-35px_rgba(15,27,61,0.35)] lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">A partir de</p>
          <p className="mt-1 font-display text-5xl text-navy">
            R$ {formatarPreco(pacote.preco_a_partir)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            por pessoa, valores podem variar por temporada
          </p>

          <QuoteDialog
            idPacote={pacote.id_pacote}
            destinoLabel={destinoLabel}
            trigger={
              <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-gold-foreground transition hover:brightness-95">
                <Sparkles className="h-4 w-4" /> Solicitar cotação
              </button>
            }
          />

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Sem compromisso · resposta em até 1 dia útil
          </p>
        </aside>
      </div>

      <SiteFooter />
    </div>
  );
}
