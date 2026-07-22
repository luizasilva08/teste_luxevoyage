import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  MapPin,
  Calendar,
  Users,
  Search,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  Star,
  Minus,
  Plus,
} from "lucide-react";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";
import { QuoteDialog } from "../components/site/QuoteDialog";
import { listarDestinos, listarPacotes, type Destino, type PacoteResumo } from "../lib/catalogo";
import { imagemDestino, heroNoronha } from "../lib/imagens";
import { formatarPreco } from "../lib/format";

export const Route = createFileRoute("/")({
  component: Home,
});

const testimonials = [
  {
    name: "Mariana Costa",
    city: "São Paulo, SP",
    text: "Viagem para Fernando de Noronha impecável. Cada detalhe foi cuidado pela Luxe Voyage — desde o transfer até as reservas dos passeios. Voltaremos!",
  },
  {
    name: "Ricardo Almeida",
    city: "Belo Horizonte, MG",
    text: "Atendimento consultivo de verdade. Personalizaram tudo, indicaram bons hotéis e ficaram perto para o que precisei.",
  },
  {
    name: "Juliana Ferreira",
    city: "Curitiba, PR",
    text: "Preço justo, comunicação clara e sem pegadinhas. Nossa lua de mel em Maragogi foi como sonhei.",
  },
  {
    name: "Tábio Nakamura",
    city: "Porto Alegre, RS",
    text: "Roteiro sensato e a Luxe Voyage tornou tudo simples. Recomendo demais para famílias e casais.",
  },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <Trust />
      <DestinationsSection />
      <PromosSection />
      <Testimonials />
      <ConciergeCTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  const [travelers, setTravelers] = useState(2);
  const [busca, setBusca] = useState("");

  return (
    <section className="relative">
      <div className="relative h-[640px] w-full overflow-hidden">
        <img
          src={heroNoronha}
          alt="Fernando de Noronha"
          width={1920}
          height={1200}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/70 via-navy/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-6">
          <span className="inline-flex w-fit items-center rounded-full border border-gold/60 bg-navy/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            Turismo consultivo
          </span>
          <h1 className="mt-6 font-display text-6xl leading-[0.95] text-white md:text-8xl">
            Sua próxima viagem começa aqui
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">
            Roteiros pelo Brasil com curadoria de especialistas, do primeiro clique ao pouso de
            volta.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <span className="h-1.5 w-10 rounded-full bg-gold" />
            <span className="h-1.5 w-6 rounded-full bg-white/40" />
            <span className="h-1.5 w-6 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="mx-auto -mt-14 max-w-6xl px-6 relative z-10">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="grid gap-2 rounded-2xl border border-border bg-card p-4 shadow-[0_20px_60px_-25px_rgba(15,27,61,0.35)] md:grid-cols-[1.2fr_1fr_0.8fr_auto]"
        >
          <Field icon={<MapPin className="h-4 w-4 text-gold" />} label="DESTINO">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Para onde vamos? Ex: Bahia, Gramado..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </Field>
          <Field icon={<Calendar className="h-4 w-4 text-gold" />} label="IDA E VOLTA">
            <input
              placeholder="Selecione as datas"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </Field>
          <Field icon={<Users className="h-4 w-4 text-gold" />} label="VIAJANTES">
            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => setTravelers(Math.max(1, travelers - 1))}
                className="grid h-7 w-7 place-items-center rounded-full border hover:bg-muted"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-4 text-center font-medium">{travelers}</span>
              <button
                type="button"
                onClick={() => setTravelers(travelers + 1)}
                className="grid h-7 w-7 place-items-center rounded-full border hover:bg-muted"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </Field>
          <Link
            to="/pacotes"
            search={{ busca: busca || undefined }}
            className="flex items-center justify-center gap-2 rounded-xl bg-gold px-8 py-4 text-sm font-semibold text-gold-foreground transition hover:brightness-95"
          >
            <Search className="h-4 w-4" /> Buscar
          </Link>
        </form>
      </div>
    </section>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl px-4 py-3 hover:bg-muted/40">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Trust() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Compra 100% segura",
      desc: "Pagamentos protegidos e políticas claras.",
    },
    {
      icon: HeartHandshake,
      title: "Atendimento humano",
      desc: "Especialistas com você antes, durante e depois.",
    },
    {
      icon: Sparkles,
      title: "Curadoria premium",
      desc: "Hotéis, roteiros e experiências selecionadas.",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 pt-24 pb-8">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted">
              <Icon className="h-5 w-5 text-navy" />
            </span>
            <div>
              <h3 className="text-lg text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DestinationsSection() {
  const [activeRegiao, setActiveRegiao] = useState("Todos");
  const { data: destinos, isLoading } = useQuery({
    queryKey: ["destinos"],
    queryFn: listarDestinos,
  });

  const regioes = ["Todos", ...Array.from(new Set((destinos ?? []).map((d) => d.regiao_nome)))];
  const filtrados = (destinos ?? [])
    .filter((d) => activeRegiao === "Todos" || d.regiao_nome === activeRegiao)
    .slice(0, 6);

  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            Destinos em alta
          </p>
          <h2 className="mt-3 font-display text-5xl leading-tight">
            O Brasil que você{" "}
            <em className="not-italic text-navy underline decoration-gold decoration-4 underline-offset-8">
              precisa conhecer
            </em>
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Destinos com pacotes ativos agora, direto do nosso catálogo — sem enrolação.
          </p>
        </div>
        {regioes.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {regioes.map((t) => (
              <button
                key={t}
                onClick={() => setActiveRegiao(t)}
                className={`rounded-full border px-5 py-2 text-sm transition ${activeRegiao === t ? "border-navy bg-navy text-navy-foreground" : "border-border bg-card hover:bg-muted"}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[320px] animate-pulse rounded-2xl bg-muted" />
          ))}
        {!isLoading && filtrados.length === 0 && (
          <p className="col-span-full text-muted-foreground">
            Nenhum destino publicado ainda por aqui.
          </p>
        )}
        {filtrados.map((d, i) => (
          <DestinationCard key={d.id_municipio} d={d} large={i === 0} />
        ))}
      </div>
    </section>
  );
}

function DestinationCard({ d, large }: { d: Destino; large?: boolean }) {
  return (
    <Link
      to="/pacotes"
      search={{ estado: d.estado_sigla }}
      className={`group relative block overflow-hidden rounded-2xl ${large ? "lg:col-span-2 lg:row-span-1" : ""}`}
    >
      <div className={`relative ${large ? "h-[420px]" : "h-[320px]"}`}>
        <img
          src={imagemDestino(d.regiao_nome, d.id_municipio)}
          alt={d.destino}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/25 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-foreground">
          {d.regiao_nome}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <h3 className="font-display text-3xl">{d.destino}</h3>
          <p className="mt-2 text-sm text-white/85">
            {d.total_pacotes} pacote{d.total_pacotes === 1 ? "" : "s"} disponí
            {d.total_pacotes === 1 ? "vel" : "veis"}
            {d.preco_a_partir != null && (
              <>
                {" "}
                · a partir de <strong>R$ {formatarPreco(d.preco_a_partir)}</strong>
              </>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}

function PromosSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["pacotes", "home"],
    queryFn: () => listarPacotes({ limit: 4 }),
  });
  const pacotes = data?.registros ?? [];

  return (
    <section className="bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
              Ofertas da semana
            </p>
            <h2 className="mt-3 font-display text-5xl">
              Promoções{" "}
              <em className="not-italic text-navy underline decoration-gold decoration-4 underline-offset-8">
                imperdíveis
              </em>
            </h2>
          </div>
          <Link
            to="/pacotes"
            className="hidden text-sm font-semibold text-navy underline underline-offset-4 md:block"
          >
            Ver todas →
          </Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[320px] animate-pulse rounded-2xl bg-card" />
            ))}
          {!isLoading && pacotes.length === 0 && (
            <p className="col-span-full text-muted-foreground">
              Nenhuma promoção publicada no momento.
            </p>
          )}
          {pacotes.map((p) => (
            <PromoCard key={p.id_pacote} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoCard({ p }: { p: PacoteResumo }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <Link to="/pacotes/$id" params={{ id: String(p.id_pacote) }} className="relative block h-48">
        <img
          src={imagemDestino(p.regiao_nome, p.id_pacote)}
          alt={p.destino}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute left-3 top-3 rounded-md bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-foreground">
          {p.destaque || "Oferta"}
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
            Ver
          </Link>
        </div>
      </div>
    </article>
  );
}

function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Depoimentos</p>
        <h2 className="mt-3 font-display text-5xl">
          Quem viaja com a{" "}
          <em className="not-italic text-navy underline decoration-gold decoration-4 underline-offset-8">
            Luxe Voyage
          </em>{" "}
          recomenda
        </h2>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {testimonials.map((t) => (
          <figure
            key={t.name}
            className="flex flex-col rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex gap-0.5 text-gold">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/80">
              "{t.text}"
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-navy font-display text-navy-foreground">
                {t.name[0]}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.city}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function ConciergeCTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="overflow-hidden rounded-3xl bg-navy px-10 py-14 text-navy-foreground md:px-16 md:py-16">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <h2 className="font-display text-4xl md:text-5xl">Não encontrou o que procura?</h2>
            <p className="mt-4 max-w-xl text-navy-foreground/75">
              Nossos consultores montam um roteiro sob medida para você, sua família ou seu grupo.
            </p>
          </div>
          <div className="md:justify-self-end">
            <QuoteDialog
              trigger={
                <button className="rounded-xl bg-gold px-8 py-4 text-sm font-semibold text-gold-foreground transition hover:brightness-95">
                  Solicitar cotação personalizada
                </button>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
