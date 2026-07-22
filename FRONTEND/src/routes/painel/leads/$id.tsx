import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Mail, Phone, MapPin, UserCheck, Loader2, Send } from "lucide-react";
import {
  buscarOportunidade,
  atualizarOportunidade,
  registrarInteracao,
  ESTAGIOS_FUNIL,
} from "../../../lib/painel";
import { useAuth } from "../../../lib/auth";
import { formatarPreco, formatarDataHora } from "../../../lib/format";

export const Route = createFileRoute("/painel/leads/$id")({
  component: LeadDetalhePage,
});

function LeadDetalhePage() {
  const { id } = Route.useParams();
  const idOportunidade = Number(id);
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const [nota, setNota] = useState("");

  const { data: lead, isLoading } = useQuery({
    queryKey: ["painel-oportunidade", idOportunidade],
    queryFn: () => buscarOportunidade(idOportunidade),
  });

  const mutAtualizar = useMutation({
    mutationFn: (campos: Parameters<typeof atualizarOportunidade>[1]) =>
      atualizarOportunidade(idOportunidade, campos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel-oportunidade", idOportunidade] });
      queryClient.invalidateQueries({ queryKey: ["painel-oportunidades"] });
    },
    onError: () => toast.error("Não foi possível salvar a alteração."),
  });

  const mutInteracao = useMutation({
    mutationFn: (tipo: string) => registrarInteracao(idOportunidade, tipo),
    onSuccess: () => {
      setNota("");
      queryClient.invalidateQueries({ queryKey: ["painel-oportunidade", idOportunidade] });
      toast.success("Interação registrada.");
    },
    onError: () => toast.error("Não foi possível registrar a interação."),
  });

  if (isLoading || !lead) {
    return <div className="h-72 animate-pulse rounded-2xl bg-card" />;
  }

  return (
    <div>
      <Link
        to="/painel/leads"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Atendimentos
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">{lead.cliente_nome}</h1>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {lead.cliente_email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {lead.cliente_email}
              </span>
            )}
            {lead.cliente_telefone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {lead.cliente_telefone}
              </span>
            )}
            {lead.cliente_cep && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {lead.cliente_cep}
              </span>
            )}
          </div>
        </div>
        <p className="font-display text-3xl text-navy">R$ {formatarPreco(lead.valor_estimado)}</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl text-foreground">Histórico de interações</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nota.trim()) mutInteracao.mutate(nota.trim());
              }}
              className="mt-4 flex gap-2"
            >
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Registrar contato: ligação, e-mail, WhatsApp..."
                className="flex-1 rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
              <button
                type="submit"
                disabled={mutInteracao.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-navy px-4 text-sm font-semibold text-navy-foreground hover:opacity-90 disabled:opacity-60"
              >
                {mutInteracao.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>

            <ul className="mt-6 space-y-4">
              {lead.historico.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
              )}
              {lead.historico.map((h) => (
                <li key={h.id_interacao} className="border-l-2 border-gold/60 pl-4">
                  <p className="text-sm text-foreground">{h.tipo_interacao}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatarDataHora(h.data_interacao)}{" "}
                    {h.consultor_nome ? `· ${h.consultor_nome}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl text-foreground">Interesses de destino</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {lead.interesses.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum destino de interesse registrado.
                </p>
              )}
              {lead.interesses.map((i) => (
                <span
                  key={i.id_interesse}
                  className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-foreground"
                >
                  {i.destino} · {i.estado_sigla}{" "}
                  <span className="text-muted-foreground">({i.status})</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Estágio do funil
            </label>
            <select
              value={lead.estagio_funil}
              disabled={mutAtualizar.isPending}
              onChange={(e) => mutAtualizar.mutate({ estagio_funil: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            >
              {ESTAGIOS_FUNIL.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Consultor responsável
            </label>
            <p className="mt-2 text-sm text-foreground">{lead.consultor_nome || "Ninguém ainda"}</p>
            {usuario && lead.id_usuario_interno !== usuario.id_usuario_interno && (
              <button
                onClick={() =>
                  mutAtualizar.mutate({ id_usuario_interno: usuario.id_usuario_interno })
                }
                disabled={mutAtualizar.isPending}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-navy hover:underline disabled:opacity-60"
              >
                <UserCheck className="h-3.5 w-3.5" /> Assumir este atendimento
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
