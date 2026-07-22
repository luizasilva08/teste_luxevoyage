import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Mail, Phone, MapPin } from "lucide-react";
import {
  buscarCliente,
  listarInteressesDoCliente,
  listarOportunidadesDoCliente,
} from "../../../lib/painel";
import { formatarPreco } from "../../../lib/format";

export const Route = createFileRoute("/painel/clientes/$id")({
  component: ClienteDetalhePage,
});

function ClienteDetalhePage() {
  const { id } = Route.useParams();
  const idCliente = Number(id);

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["painel-cliente", idCliente],
    queryFn: () => buscarCliente(idCliente),
  });
  const { data: interesses } = useQuery({
    queryKey: ["painel-cliente-interesses", idCliente],
    queryFn: () => listarInteressesDoCliente(idCliente),
  });
  const { data: oportunidades } = useQuery({
    queryKey: ["painel-cliente-oportunidades", idCliente],
    queryFn: () => listarOportunidadesDoCliente(idCliente),
  });

  if (isLoading || !cliente) {
    return <div className="h-64 animate-pulse rounded-2xl bg-card" />;
  }

  return (
    <div>
      <Link
        to="/painel/clientes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Clientes
      </Link>

      <h1 className="mt-4 font-display text-3xl text-foreground">{cliente.nome}</h1>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {cliente.email_criptografado && (
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> {cliente.email_criptografado}
          </span>
        )}
        {cliente.telefone_criptografado && (
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> {cliente.telefone_criptografado}
          </span>
        )}
        {cliente.cep && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {cliente.cep}
          </span>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl text-foreground">Oportunidades</h2>
          <ul className="mt-4 space-y-3">
            {(oportunidades ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma oportunidade ainda.</p>
            )}
            {(oportunidades ?? []).map((o) => (
              <li key={o.id_oportunidade}>
                <Link
                  to="/painel/leads/$id"
                  params={{ id: String(o.id_oportunidade) }}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-sm hover:border-gold"
                >
                  <span className="font-medium text-foreground">{o.estagio_funil}</span>
                  <span className="text-navy">R$ {formatarPreco(o.valor_estimado)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl text-foreground">Interesses de destino</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(interesses ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum interesse registrado.</p>
            )}
            {(interesses ?? []).map((i) => (
              <span
                key={i.id_interesse}
                className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-foreground"
              >
                {i.status}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
