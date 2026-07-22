import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, User } from "lucide-react";
import { listarOportunidades, ESTAGIOS_FUNIL, type OportunidadePainel } from "../../../lib/painel";
import { formatarPreco } from "../../../lib/format";

export const Route = createFileRoute("/painel/leads/")({
  component: LeadsPage,
});

function LeadsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["painel-oportunidades"],
    queryFn: listarOportunidades,
  });
  const oportunidades = data ?? [];

  const estagiosPresentes = new Set(oportunidades.map((o) => o.estagio_funil));
  const colunas = [
    ...ESTAGIOS_FUNIL,
    ...Array.from(estagiosPresentes).filter(
      (e) => !(ESTAGIOS_FUNIL as readonly string[]).includes(e),
    ),
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">Atendimentos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada card é um lead vindo do site ou cadastrado manualmente — arraste a conversa até o
        fechamento.
      </p>

      {isLoading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-card" />}

      {!isLoading && (
        <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
          {colunas.map((estagio) => {
            const itens = oportunidades.filter((o) => o.estagio_funil === estagio);
            return (
              <div key={estagio} className="w-72 shrink-0">
                <div className="flex items-center justify-between px-1 pb-3">
                  <h2 className="text-sm font-semibold text-foreground">{estagio}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {itens.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {itens.map((o) => (
                    <LeadCard key={o.id_oportunidade} o={o} />
                  ))}
                  {itens.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      Vazio
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeadCard({ o }: { o: OportunidadePainel }) {
  return (
    <Link
      to="/painel/leads/$id"
      params={{ id: String(o.id_oportunidade) }}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-gold hover:shadow-md"
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <User className="h-3.5 w-3.5 text-muted-foreground" /> {o.cliente_nome}
      </p>
      {o.cliente_email && (
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <Mail className="h-3 w-3" /> {o.cliente_email}
        </p>
      )}
      {o.cliente_telefone && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" /> {o.cliente_telefone}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">{o.consultor_nome || "Sem consultor"}</span>
        <span className="text-sm font-semibold text-navy">
          R$ {formatarPreco(o.valor_estimado)}
        </span>
      </div>
    </Link>
  );
}
