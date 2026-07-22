import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, User } from "lucide-react";
import {
  listarPropostas,
  atualizarProposta,
  ESTAGIOS_PROPOSTA,
  type PropostaPainel,
} from "../../../lib/painel";
import { useAuth } from "../../../lib/auth";
import { podeGerenciarPropostas } from "../../../lib/permissoes";
import { formatarPreco } from "../../../lib/format";

export const Route = createFileRoute("/painel/propostas/")({
  component: PropostasPage,
});

function PropostasPage() {
  const { usuario } = useAuth();
  const podeEditar = podeGerenciarPropostas(usuario);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["painel-propostas"],
    queryFn: listarPropostas,
  });
  const propostas = data ?? [];

  const mutAtualizar = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      atualizarProposta(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["painel-propostas"] }),
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">Propostas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cotações que já viraram proposta formal — acompanhe até a assinatura do contrato.
      </p>

      {isLoading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-card" />}

      {!isLoading && (
        <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
          {ESTAGIOS_PROPOSTA.map((estagio) => {
            const itens = propostas.filter((p) => p.status === estagio);
            return (
              <div key={estagio} className="w-72 shrink-0">
                <div className="flex items-center justify-between px-1 pb-3">
                  <h2 className="text-sm font-semibold text-foreground">{estagio}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {itens.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {itens.map((p) => (
                    <PropostaCard
                      key={p.id_proposta}
                      p={p}
                      podeEditar={podeEditar}
                      onMudarStatus={(status) => mutAtualizar.mutate({ id: p.id_proposta, status })}
                    />
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

function PropostaCard({
  p,
  podeEditar,
  onMudarStatus,
}: {
  p: PropostaPainel;
  podeEditar: boolean;
  onMudarStatus: (status: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <Link
        to="/painel/clientes/$id"
        params={{ id: String(p.id_cliente) }}
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-navy"
      >
        <User className="h-3.5 w-3.5 text-muted-foreground" /> {p.cliente_nome}
      </Link>
      {p.nome_pacote && (
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <Package className="h-3 w-3" /> {p.nome_pacote}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">v{p.versao}</span>
        <span className="text-sm font-semibold text-navy">
          R$ {formatarPreco(p.valor_total_calculado)}
        </span>
      </div>
      {podeEditar && (
        <select
          value={p.status}
          onChange={(e) => onMudarStatus(e.target.value)}
          className="mt-3 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        >
          {ESTAGIOS_PROPOSTA.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
