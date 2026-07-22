import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  MapPin, Calendar, Users, Search, LogIn, ShieldCheck, HeartHandshake,
  Sparkles, Star, Minus, Plus, Facebook, Instagram, Twitter, Linkedin, LogOut,
} from "lucide-react";
import { useAuth, logout } from "../lib/auth";

import heroNoronha from "../assets/hero-noronha.jpg";
import destJerico from "../assets/dest-jericoacoara.jpg";
import destSalvador from "../assets/dest-salvador.jpg";
import destRio from "../assets/dest-rio.jpg";
import destOuroPreto from "../assets/dest-ouropreto.jpg";
import destBonito from "../assets/dest-bonito.jpg";
import destGramado from "../assets/dest-gramado.jpg";
import destMaragogi from "../assets/dest-maragogi.jpg";

export const Route = createFileRoute("/")({
  component: Home,
});

const destinations = [
  { name: "Fernando de Noronha", region: "Nordeste", img: heroNoronha, desc: "Arquipélago paradisíaco com águas cristalinas e vida marinha exuberante." },
  { name: "Jericoacoara", region: "Ceará", img: destJerico, desc: "Dunas, lagoas e pôr do sol inesquecível em um dos vilarejos mais charmosos." },
  { name: "Salvador", region: "Bahia", img: destSalvador, desc: "Centro histórico do Pelourinho, cultura afro-brasileira e música na alma." },
  { name: "Rio de Janeiro", region: "Sudeste", img: destRio, desc: "Cidade maravilhosa com praias icônicas e paisagens que emolduram o mar." },
  { name: "Ouro Preto", region: "Minas Gerais", img: destOuroPreto, desc: "Cidade colonial tombada pela UNESCO, patrimônio barroco vivo." },
  { name: "Bonito", region: "Mato Grosso do Sul", img: destBonito, desc: "Rios de águas transparentes, grutas e a natureza em estado puro." },
  { name: "Gramado", region: "Serra Gaúcha", img: destGramado, desc: "Charme europeu, gastronomia refinada e clima aconchegante o ano todo." },
  { name: "Maragogi", region: "Alagoas", img: destMaragogi, desc: "Piscinas naturais de águas turquesa no Caribe brasileiro." },
];

const promos = [
  { name: "Fernando de Noronha", nights: "5 diárias · aéreo incluso", price: "4.890", img: heroNoronha },
  { name: "Jericoacoara", nights: "4 diárias · com transfer", price: "2.290", img: destJerico },
  { name: "Bonito", nights: "5 diárias · passeios inclusos", price: "2.790", img: destBonito },
  { name: "Rio de Janeiro", nights: "3 diárias · vista mar", price: "1.290", img: destRio },
];

const testimonials = [
  { name: "Mariana Costa", city: "São Paulo, SP", text: "Viagem para Fernando de Noronha impecável. Cada detalhe foi cuidado pela Luxe Voyage — desde o transfer até as reservas dos passeios. Voltaremos!" },
  { name: "Ricardo Almeida", city: "Belo Horizonte, MG", text: "Atendimento consultivo de verdade. Personalizaram tudo, indicaram bons hotéis e ficaram perto para o que precisei." },
  { name: "Juliana Ferreira", city: "Curitiba, PR", text: "Preço justo, comunicação clara e sem pegadinhas. Nossa lua de mel em Maragogi foi como sonhei." },
  { name: "Tábio Nakamura", city: "Porto Alegre, RS", text: "Roteiro sensato e a Luxe Voyage tornou tudo simples. Recomendo demais para famílias e casais." },
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Trust />
      <DestinationsSection />
      <PromosSection />
      <Testimonials />
      <ConciergeCTA />
      <Footer />
    </div>
  );
}

function Header() {
  const { usuario, carregando } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    toast.success("Sessão encerrada.");
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-navy-foreground font-display text-xl">L</span>
          <span className="leading-tight">
            <span className="block font-display text-xl text-foreground">Luxe Voyage</span>
            <span className="block text-[10px] font-semibold tracking-[0.3em] text-muted-foreground">BRASIL</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-border bg-card/70 p-1.5 text-sm md:flex">
          {["Home", "Destinos", "Pacotes", "Atendimento"].map((item, i) => (
            <a key={item} href="#" className={`rounded-full px-5 py-2 transition ${i === 0 ? "bg-navy text-navy-foreground" : "text-foreground/70 hover:text-foreground"}`}>
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {carregando ? null : usuario ? (
            <>
              <span className="hidden text-sm font-medium text-foreground/80 md:inline">
                Olá, {usuario.nome.split(" ")[0]}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-navy-foreground transition hover:opacity-90"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="hidden items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground md:inline-flex">
                <LogIn className="h-4 w-4" /> Entrar
              </Link>
              <Link to="/auth" className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-navy-foreground transition hover:opacity-90">
                Cadastre-se
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const [travelers, setTravelers] = useState(2);
  return (
    <section className="relative">
      <div className="relative h-[640px] w-full overflow-hidden">
        <img src={heroNoronha} alt="Fernando de Noronha" width={1920} height={1200} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/70 via-navy/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-6">
          <span className="inline-flex w-fit items-center rounded-full border border-gold/60 bg-navy/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            Nordeste
          </span>
          <h1 className="mt-6 font-display text-6xl leading-[0.95] text-white md:text-8xl">Fernando de Noronha</h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">Águas cristalinas e paisagens vulcânicas preservadas.</p>
          <div className="mt-6 flex items-center gap-2">
            <span className="h-1.5 w-10 rounded-full bg-gold" />
            <span className="h-1.5 w-6 rounded-full bg-white/40" />
            <span className="h-1.5 w-6 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="mx-auto -mt-14 max-w-6xl px-6 relative z-10">
        <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 shadow-[0_20px_60px_-25px_rgba(15,27,61,0.35)] md:grid-cols-[1.2fr_1fr_0.8fr_auto]">
          <Field icon={<MapPin className="h-4 w-4 text-gold" />} label="DESTINO">
            <input placeholder="Para onde vamos? Ex: Bahia, Gramado..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </Field>
          <Field icon={<Calendar className="h-4 w-4 text-gold" />} label="IDA E VOLTA">
            <input placeholder="Selecione as datas" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </Field>
          <Field icon={<Users className="h-4 w-4 text-gold" />} label="VIAJANTES">
            <div className="flex items-center gap-3 text-sm">
              <button onClick={() => setTravelers(Math.max(1, travelers - 1))} className="grid h-7 w-7 place-items-center rounded-full border hover:bg-muted"><Minus className="h-3 w-3" /></button>
              <span className="w-4 text-center font-medium">{travelers}</span>
              <button onClick={() => setTravelers(travelers + 1)} className="grid h-7 w-7 place-items-center rounded-full border hover:bg-muted"><Plus className="h-3 w-3" /></button>
            </div>
          </Field>
          <button className="flex items-center justify-center gap-2 rounded-xl bg-gold px-8 py-4 text-sm font-semibold text-gold-foreground transition hover:brightness-95">
            <Search className="h-4 w-4" /> Buscar
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
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
    { icon: ShieldCheck, title: "Compra 100% segura", desc: "Pagamentos protegidos e políticas claras." },
    { icon: HeartHandshake, title: "Atendimento humano", desc: "Especialistas com você antes, durante e depois." },
    { icon: Sparkles, title: "Curadoria premium", desc: "Hotéis, roteiros e experiências selecionadas." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 pt-24 pb-8">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6">
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
  const [active, setActive] = useState("Todos");
  const tabs = ["Todos", "Praia", "Natureza", "Cultura", "Serra"];
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Destinos em alta</p>
          <h2 className="mt-3 font-display text-5xl leading-tight">O Brasil que você <em className="not-italic text-navy underline decoration-gold decoration-4 underline-offset-8">precisa conhecer</em></h2>
          <p className="mt-3 max-w-xl text-muted-foreground">Selecionamos os destinos mais desejados do país e uma curadoria de experiências que só a Luxe Voyage entrega.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`rounded-full border px-5 py-2 text-sm transition ${active === t ? "border-navy bg-navy text-navy-foreground" : "border-border bg-card hover:bg-muted"}`}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {destinations.map((d, i) => (
          <DestinationCard key={d.name} d={d} large={i === 0} />
        ))}
      </div>
    </section>
  );
}

function DestinationCard({ d, large }: { d: typeof destinations[number]; large?: boolean }) {
  return (
    <article className={`group relative overflow-hidden rounded-2xl ${large ? "lg:col-span-2 lg:row-span-1" : ""}`}>
      <div className={`relative ${large ? "h-[420px]" : "h-[320px]"}`}>
        <img src={d.img} alt={d.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/25 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-foreground">
          {d.region}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <h3 className="font-display text-3xl">{d.name}</h3>
          <p className="mt-2 max-w-md text-sm text-white/85">{d.desc}</p>
        </div>
      </div>
    </article>
  );
}

function PromosSection() {
  return (
    <section className="bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Ofertas da semana</p>
            <h2 className="mt-3 font-display text-5xl">Promoções <em className="not-italic text-navy underline decoration-gold decoration-4 underline-offset-8">imperdíveis</em></h2>
          </div>
          <a href="#" className="hidden text-sm font-semibold text-navy underline underline-offset-4 md:block">Ver todas →</a>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {promos.map(p => (
            <article key={p.name} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative h-48">
                <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-md bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-foreground">Oferta</span>
              </div>
              <div className="p-5">
                <h3 className="font-display text-2xl leading-tight">{p.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{p.nights}</p>
                <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">A partir de</p>
                    <p className="font-display text-3xl text-navy">R$ {p.price}</p>
                  </div>
                  <button className="rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-navy-foreground hover:opacity-90">Ver</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Depoimentos</p>
        <h2 className="mt-3 font-display text-5xl">Quem viaja com a <em className="not-italic text-navy underline decoration-gold decoration-4 underline-offset-8">Luxe Voyage</em> recomenda</h2>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {testimonials.map(t => (
          <figure key={t.name} className="flex flex-col rounded-2xl border border-border bg-card p-6">
            <div className="flex gap-0.5 text-gold">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/80">"{t.text}"</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-navy font-display text-navy-foreground">{t.name[0]}</span>
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
            <p className="mt-4 max-w-xl text-navy-foreground/75">Nossos consultores montam um roteiro sob medida para você, sua família ou seu grupo.</p>
          </div>
          <div className="md:justify-self-end">
            <button className="rounded-xl bg-gold px-8 py-4 text-sm font-semibold text-gold-foreground transition hover:brightness-95">
              Solicitar cotação personalizada
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/60 font-display text-gold">L</span>
              <span className="font-display text-2xl">Luxe Voyage</span>
            </div>
            <p className="mt-4 text-sm text-navy-foreground/70">Turismo consultivo curado por especialistas. Roteiros sob medida com hospitalidade de verdade.</p>
            <div className="mt-6 flex gap-3 text-navy-foreground/70">
              <Facebook className="h-4 w-4 hover:text-gold" />
              <Instagram className="h-4 w-4 hover:text-gold" />
              <Twitter className="h-4 w-4 hover:text-gold" />
              <Linkedin className="h-4 w-4 hover:text-gold" />
            </div>
          </div>
          <FooterCol title="EXPLORAR" items={["Home", "Destinos", "Pacotes", "Promoções"]} />
          <FooterCol title="INSTITUCIONAL" items={["Sobre nós", "Termos de uso", "Política de privacidade", "LGPD"]} />
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-gold">CONTATO</p>
            <ul className="mt-4 space-y-2 text-sm text-navy-foreground/75">
              <li>0800 123 4567</li>
              <li>contato@luxevoyage.com.br</li>
              <li>Av. Paulista, 1000 — São Paulo, SP</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-navy-foreground/10 pt-6 text-xs text-navy-foreground/60 md:flex-row md:items-center">
          <p>© 2026 Luxe Voyage. Todos os direitos reservados.</p>
          <p>CNPJ 00.000.000/0001-00 · CADASTUR 00.000.000-0</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.25em] text-gold">{title}</p>
      <ul className="mt-4 space-y-2 text-sm text-navy-foreground/75">
        {items.map(i => <li key={i}><a href="#" className="hover:text-gold">{i}</a></li>)}
      </ul>
    </div>
  );
}
