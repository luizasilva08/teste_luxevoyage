import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plane } from "lucide-react";
import { listarViagens, atualizarViagem, STATUS_VIAGEM } from "../../../lib/painel";
import { useAuth } from "../../../lib/auth";
import { podeGerenciarViagens } from "../../../lib/permissoes";
import { formatarPreco, formatarData } from "../../../lib/format";

export const Route = createFileRoute("/painel/viagens/")({
  component: ViagensPage,
});

const CORES_STATUS: Record<string, string> = {
  Confirmada: "bg-sky-100 text-sky-700",
  "Em Andamento": "bg-amber-100 text-amber-700",
  Concluída: "bg-emerald-100 text-emerald-700",
  Cancelada: "bg-red-100 text-red-700",
};

function ViagensPage() {
  const { usuario } = useAuth();
  const podeEditar = podeGerenciarViagens(usuario);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["painel-viagens"], queryFn: listarViagens });
  const viagens = data ?? [];

  const mutAtualizar = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      atualizarViagem(id, { status_viagem: status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["painel-viagens"] }),
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">Viagens</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Contratos assinados que viraram viagem — embarque, retorno e pagamento em dia.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Cliente / Pacote</th>
              <th className="px-5 py-3">Embarque</th>
              <th className="px-5 py-3">Retorno</th>
              <th className="px-5 py-3">Pagamento</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && viagens.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                  Nenhuma viagem ainda.
                </td>
              </tr>
            )}
            {viagens.map((v) => (
              <tr key={v.id_viagem} className="border-t border-border hover:bg-muted/30">
                <td className="px-5 py-3">
                  <p className="flex items-center gap-1.5 font-medium text-foreground">
                    <Plane className="h-3.5 w-3.5 text-muted-foreground" /> {v.cliente_nome}
                  </p>
                  {v.nome_pacote && <p className="mt-0.5 text-xs text-muted-foreground">{v.nome_pacote}</p>}
                </td>
                <td className="px-5 py-3 text-muted-foreground">{formatarData(v.data_embarque)}</td>
                <td className="px-5 py-3 text-muted-foreground">{formatarData(v.data_retorno)}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {v.parcelas_pagas}/{v.parcelas_total} parcelas
                  {v.valor_total != null && (
                    <span className="block text-xs">R$ {formatarPreco(v.valor_total)}</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {podeEditar ? (
                    <select
                      value={v.status_viagem}
                      disabled={mutAtualizar.isPending}
                      onChange={(e) => mutAtualizar.mutate({ id: v.id_viagem, status: e.target.value })}
                      className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
                    >
                      {STATUS_VIAGEM.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CORES_STATUS[v.status_viagem] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {v.status_viagem}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
