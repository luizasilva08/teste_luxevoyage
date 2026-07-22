import { Facebook, Instagram, Twitter, Linkedin } from "lucide-react";

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.25em] text-gold">{title}</p>
      <ul className="mt-4 space-y-2 text-sm text-navy-foreground/75">
        {items.map((i) => (
          <li key={i}>
            <a href="#" className="hover:text-gold">
              {i}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/60 font-display text-gold">
                L
              </span>
              <span className="font-display text-2xl">Luxe Voyage</span>
            </div>
            <p className="mt-4 text-sm text-navy-foreground/70">
              Turismo consultivo curado por especialistas. Roteiros sob medida com hospitalidade de
              verdade.
            </p>
            <div className="mt-6 flex gap-3 text-navy-foreground/70">
              <Facebook className="h-4 w-4 hover:text-gold" />
              <Instagram className="h-4 w-4 hover:text-gold" />
              <Twitter className="h-4 w-4 hover:text-gold" />
              <Linkedin className="h-4 w-4 hover:text-gold" />
            </div>
          </div>
          <FooterCol title="EXPLORAR" items={["Home", "Destinos", "Pacotes", "Promoções"]} />
          <FooterCol
            title="INSTITUCIONAL"
            items={["Sobre nós", "Termos de uso", "Política de privacidade", "LGPD"]}
          />
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
