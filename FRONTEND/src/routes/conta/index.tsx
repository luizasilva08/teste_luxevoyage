import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, LogOut, Plane, CreditCard, MessageCircle, Star, Send, Package,
} from "lucide-react";
import { SiteHeader } from "../../components/site/SiteHeader";
import { SiteFooter } from "../../components/site/SiteFooter";
import {
  useClienteAuth,
  getResumoConta,
  enviarMensagemConta,
  avaliarViagemConta,
  pagarParcelaConta,
  type OportunidadeConta,
  type ViagemConta,
  type PagamentoConta,
  type MensagemConta,
} from "../../lib/cliente";
import { formatarPreco, formatarData, formatarDataHora } from "../../lib/format";

export const Route = createFileRoute("/conta/")({
  component: ContaPage,
});

const ABAS = [
  { id: "viagens", label: "Minhas viagens", icon: Plane },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { id: "conversas", label: "Conversas", icon: MessageCircle },
] as const;

function ContaPage() {
  const { cliente, carregando, logout } = useClienteAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<(typeof ABAS)[number]["id"]>("viagens");

  useEffect(() => {
    if (!carregando && !cliente) navigate({ to: "/conta/entrar" });
  }, [carregando, cliente, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["conta-resumo"],
    queryFn: getResumoConta,
    enabled: !!cliente,
  });

  if (carregando || !cliente) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/40">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  function handleLogout() {
    logout();
    toast.success("Sessão encerrada.");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border bg-muted/40 py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Minha conta</p>
            <h1 className="mt-2 font-display text-4xl text-foreground">Olá, {cliente.nome.split(" ")[0]}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-navy hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex gap-2 overflow-x-auto">
          {ABAS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setAba(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition ${aba === item.id ? "border-navy bg-navy text-navy-foreground" : "border-border bg-card hover:bg-muted"}`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
        </div>

        {isLoading && <div className="mt-8 h-64 animate-pulse rounded-2xl bg-card" />}

        {data && (
          <div className="mt-8">
            {aba === "viagens" && <AbaViagens viagens={data.viagens} oportunidades={data.oportunidades} />}
            {aba === "pagamentos" && <AbaPagamentos pagamentos={data.pagamentos} />}
            {aba === "conversas" && (
              <AbaConversas oportunidades={data.oportunidades} mensagens={data.mensagens} />
            )}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

// --- Viagens -----------------------------------------------------------
function AbaViagens({
  viagens,
  oportunidades,
}: {
  viagens: ViagemConta[];
  oportunidades: OportunidadeConta[];
}) {
  if (viagens.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhuma viagem confirmada ainda"
        descricao={
          oportunidades.length > 0
            ? "Suas cotações estão em andamento — assim que o contrato for assinado, a viagem aparece aqui."
            : "Peça uma cotação num pacote pra começar a planejar sua próxima viagem."
        }
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {viagens.map((v) => (
        <ViagemCard key={v.id_viagem} v={v} />
      ))}
    </div>
  );
}

const CORES_STATUS_VIAGEM: Record<string, string> = {
  Confirmada: "bg-sky-100 text-sky-700",
  "Em Andamento": "bg-amber-100 text-amber-700",
  Concluída: "bg-emerald-100 text-emerald-700",
  Cancelada: "bg-red-100 text-red-700",
};

function ViagemCard({ v }: { v: ViagemConta }) {
  const queryClient = useQueryClient();
  const [nota, setNota] = useState(v.avaliacao_nota ?? 0);
  const [comentario, setComentario] = useState(v.avaliacao_comentario ?? "");
  const [avaliando, setAvaliando] = useState(false);

  const mutAvaliar = useMutation({
    mutationFn: () => avaliarViagemConta(v.id_viagem, nota, comentario || undefined),
    onSuccess: () => {
      toast.success("Avaliação enviada. Obrigado!");
      setAvaliando(false);
      queryClient.invalidateQueries({ queryKey: ["conta-resumo"] });
    },
    onError: () => toast.error("Não foi possível enviar sua avaliação."),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
            <Package className="h-3.5 w-3.5" /> {v.nome_pacote ?? "Pacote personalizado"}
          </p>
          <h3 className="mt-1 font-display text-2xl text-foreground">
            {formatarData(v.data_embarque)} → {formatarData(v.data_retorno)}
          </h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${CORES_STATUS_VIAGEM[v.status_viagem] ?? "bg-muted text-muted-foreground"}`}>
          {v.status_viagem}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
        <span>Contrato: {v.status_contrato}</span>
        <span>{v.parcelas_pagas}/{v.parcelas_total} parcelas pagas</span>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        {v.avaliacao_nota && !avaliando ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-gold">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < v.avaliacao_nota! ? "fill-current" : ""}`} />
              ))}
            </div>
            <button onClick={() => setAvaliando(true)} className="text-xs font-semibold text-navy hover:underline">
              Editar avaliação
            </button>
          </div>
        ) : avaliando || !v.avaliacao_nota ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {v.avaliacao_nota ? "Editar avaliação" : "Avaliar esta viagem"}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setNota(i + 1)}>
                  <Star className={`h-6 w-6 transition ${i < nota ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder="Conte como foi (opcional)"
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
            <button
              disabled={nota === 0 || mutAvaliar.isPending}
              onClick={() => mutAvaliar.mutate()}
              className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-navy-foreground hover:opacity-90 disabled:opacity-50"
            >
              {mutAvaliar.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enviar avaliação
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// --- Pagamentos ----------------------------------------------------------
function AbaPagamentos({ pagamentos }: { pagamentos: PagamentoConta[] }) {
  const queryClient = useQueryClient();
  const mutPagar = useMutation({
    mutationFn: (id: number) => pagarParcelaConta(id),
    onSuccess: () => {
      toast.success("Pagamento confirmado (simulação).");
      queryClient.invalidateQueries({ queryKey: ["conta-resumo"] });
    },
    onError: () => toast.error("Não foi possível confirmar o pagamento."),
  });

  if (pagamentos.length === 0) {
    return <EstadoVazio titulo="Nenhum pagamento por aqui" descricao="Parcelas aparecem depois que um contrato é assinado." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-5 py-3">Pacote</th>
            <th className="px-5 py-3">Parcela</th>
            <th className="px-5 py-3">Método</th>
            <th className="px-5 py-3">Valor</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {pagamentos.map((p) => (
            <tr key={p.id_pagamento} className="border-t border-border">
              <td className="px-5 py-3 font-medium text-foreground">{p.nome_pacote ?? "—"}</td>
              <td className="px-5 py-3 text-muted-foreground">{p.numero_parcela}/{p.total_parcelas}</td>
              <td className="px-5 py-3 text-muted-foreground">{p.metodo_pagamento}</td>
              <td className="px-5 py-3 text-navy">R$ {formatarPreco(p.valor_total)}</td>
              <td className="px-5 py-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    p.status_transacao === "Confirmado"
                      ? "bg-emerald-100 text-emerald-700"
                      : p.status_transacao === "Pendente"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {p.status_transacao}
                </span>
              </td>
              <td className="px-5 py-3 text-right">
                {p.status_transacao === "Pendente" && (
                  <button
                    disabled={mutPagar.isPending}
                    onClick={() => mutPagar.mutate(p.id_pagamento)}
                    className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-gold-foreground hover:brightness-95 disabled:opacity-50"
                  >
                    Pagar agora
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        "Pagar agora" é uma simulação — este projeto não processa pagamentos reais.
      </p>
    </div>
  );
}

// --- Conversas -------------------------------------------------------------
function AbaConversas({
  oportunidades,
  mensagens,
}: {
  oportunidades: OportunidadeConta[];
  mensagens: MensagemConta[];
}) {
  if (oportunidades.length === 0) {
    return <EstadoVazio titulo="Nenhuma conversa ainda" descricao="Peça uma cotação pra começar a falar com um consultor." />;
  }

  return (
    <div className="space-y-6">
      {oportunidades.map((o) => (
        <ConversaCard
          key={o.id_oportunidade}
          oportunidade={o}
          mensagens={mensagens.filter((m) => m.id_oportunidade === o.id_oportunidade)}
        />
      ))}
    </div>
  );
}

function ConversaCard({
  oportunidade,
  mensagens,
}: {
  oportunidade: OportunidadeConta;
  mensagens: MensagemConta[];
}) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");

  const mutEnviar = useMutation({
    mutationFn: (mensagem: string) => enviarMensagemConta(oportunidade.id_oportunidade, mensagem),
    onSuccess: () => {
      setTexto("");
      queryClient.invalidateQueries({ queryKey: ["conta-resumo"] });
    },
    onError: () => toast.error("Não foi possível enviar a mensagem."),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-foreground">
          {oportunidade.nome_pacote ?? "Cotação personalizada"}
        </h3>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {oportunidade.consultor_nome ? `com ${oportunidade.consultor_nome}` : "aguardando consultor"}
        </span>
      </div>

      <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto">
        {mensagens.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
        )}
        {mensagens.map((m) => {
          const doCliente = m.tipo_interacao.startsWith("Cliente:");
          return (
            <li
              key={m.id_interacao}
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${doCliente ? "ml-auto bg-navy text-navy-foreground" : "bg-muted text-foreground"}`}
            >
              <p>{doCliente ? m.tipo_interacao.replace(/^Cliente:\s*/, "") : m.tipo_interacao}</p>
              <p className={`mt-1 text-[10px] uppercase tracking-widest ${doCliente ? "text-navy-foreground/60" : "text-muted-foreground"}`}>
                {doCliente ? "Você" : m.consultor_nome ?? "Equipe"} · {formatarDataHora(m.data_interacao)}
              </p>
            </li>
          );
        })}
      </ul>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) mutEnviar.mutate(texto.trim());
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="flex-1 rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
        <button
          type="submit"
          disabled={mutEnviar.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-navy px-4 text-sm font-semibold text-navy-foreground hover:opacity-90 disabled:opacity-60"
        >
          {mutEnviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

function EstadoVazio({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <h3 className="font-display text-2xl text-foreground">{titulo}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{descricao}</p>
    </div>
  );
}
