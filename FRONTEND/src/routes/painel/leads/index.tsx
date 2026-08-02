import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  Search,
  Plus,
  MapPin,
  Inbox,
  PhoneCall,
  FileText,
  Handshake,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  listarOportunidades,
  criarOportunidade,
  buscarClientesPorNome,
  ESTAGIOS_FUNIL,
  type OportunidadePainel,
} from "../../../lib/painel";
import { useAuth } from "../../../lib/auth";
import { podeGerenciarAtendimentos } from "../../../lib/permissoes";
import { formatarPreco, formatarRelativo } from "../../../lib/format";
import { ApiError } from "../../../lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";

export const Route = createFileRoute("/painel/leads/")({
  component: LeadsPage,
});

const ICONE_ESTAGIO: Record<string, React.ComponentType<{ className?: string }>> = {
  Prospecção: Inbox,
  Qualificação: PhoneCall,
  "Proposta Enviada": FileText,
  Negociação: Handshake,
  "Fechamento Ganho": CheckCircle2,
  "Fechamento Perdido": XCircle,
};

const COR_ESTAGIO: Record<string, string> = {
  Prospecção: "bg-slate-100 text-slate-700",
  Qualificação: "bg-sky-100 text-sky-700",
  "Proposta Enviada": "bg-amber-100 text-amber-700",
  Negociação: "bg-violet-100 text-violet-700",
  "Fechamento Ganho": "bg-emerald-100 text-emerald-700",
  "Fechamento Perdido": "bg-rose-100 text-rose-700",
};

const DESCRICAO_ESTAGIO: Record<string, string> = {
  Prospecção: "Ainda não contatado",
  Qualificação: "Entendendo a necessidade",
  "Proposta Enviada": "Aguardando retorno do cliente",
  Negociação: "Ajustando condições",
  "Fechamento Ganho": "Venda concluída",
  "Fechamento Perdido": "Não seguiu adiante",
};

function LeadsPage() {
  const { usuario } = useAuth();
  const [busca, setBusca] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const [estagioNovo, setEstagioNovo] = useState<string>(ESTAGIOS_FUNIL[0]);

  const { data, isLoading } = useQuery({
    queryKey: ["painel-oportunidades"],
    queryFn: listarOportunidades,
  });
  const oportunidades = data ?? [];

  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? oportunidades.filter(
        (o) =>
          o.cliente_nome.toLowerCase().includes(termo) ||
          (o.destino ?? "").toLowerCase().includes(termo),
      )
    : oportunidades;

  const estagiosPresentes = new Set(oportunidades.map((o) => o.estagio_funil));
  const colunas = [
    ...ESTAGIOS_FUNIL,
    ...Array.from(estagiosPresentes).filter(
      (e) => !(ESTAGIOS_FUNIL as readonly string[]).includes(e),
    ),
  ];

  const contagens = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const o of oportunidades) mapa.set(o.estagio_funil, (mapa.get(o.estagio_funil) ?? 0) + 1);
    return mapa;
  }, [oportunidades]);

  function abrirNovo(estagio: string) {
    setEstagioNovo(estagio);
    setNovoOpen(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
            Atendimentos <MessageSquare className="h-6 w-6 text-gold" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe todas as solicitações e interações com clientes em cada etapa do funil.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar atendimento, cliente ou destino..."
              className="w-56 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {podeGerenciarAtendimentos(usuario) && (
            <button
              onClick={() => abrirNovo(ESTAGIOS_FUNIL[0])}
              className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground hover:brightness-95"
            >
              <Plus className="h-4 w-4" /> Novo atendimento
            </button>
          )}
        </div>
      </div>

      {isLoading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-card" />}

      {!isLoading && (
        <>
          <div className="mt-6 flex flex-wrap gap-3">
            <ChipTotal total={oportunidades.length} />
            {colunas.map((estagio) => (
              <Chip
                key={estagio}
                estagio={estagio}
                total={contagens.get(estagio) ?? 0}
              />
            ))}
          </div>

          <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
            {colunas.map((estagio) => {
              const itens = filtradas.filter((o) => o.estagio_funil === estagio);
              const Icon = ICONE_ESTAGIO[estagio];
              return (
                <div key={estagio} className="w-72 shrink-0">
                  <div className="rounded-t-xl border border-border bg-card px-3 py-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />} {estagio}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {itens.length}
                      </span>
                    </div>
                    {DESCRICAO_ESTAGIO[estagio] && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {DESCRICAO_ESTAGIO[estagio]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3 rounded-b-xl border border-t-0 border-border bg-muted/20 p-3">
                    {itens.map((o) => (
                      <LeadCard key={o.id_oportunidade} o={o} />
                    ))}
                    {itens.length === 0 && (
                      <p className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
                        {termo ? "Nada aqui pra essa busca." : "Nenhum atendimento aqui ainda."}
                      </p>
                    )}
                    {podeGerenciarAtendimentos(usuario) && (
                      <button
                        onClick={() => abrirNovo(estagio)}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar atendimento
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <NovoAtendimentoDialog open={novoOpen} onOpenChange={setNovoOpen} estagioInicial={estagioNovo} />
    </div>
  );
}

function ChipTotal({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-navy/10 text-navy">
        <MessageSquare className="h-4 w-4" />
      </span>
      <div>
        <p className="font-display text-lg leading-none text-foreground">{total}</p>
        <p className="text-xs text-muted-foreground">Total de atendimentos</p>
      </div>
    </div>
  );
}

function Chip({ estagio, total }: { estagio: string; total: number }) {
  const Icon = ICONE_ESTAGIO[estagio] ?? Inbox;
  const cor = COR_ESTAGIO[estagio] ?? "bg-muted text-muted-foreground";
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <span className={`grid h-8 w-8 place-items-center rounded-full ${cor}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="font-display text-lg leading-none text-foreground">{total}</p>
        <p className="text-xs text-muted-foreground">{estagio}</p>
      </div>
    </div>
  );
}

function LeadCard({ o }: { o: OportunidadePainel }) {
  return (
    <Link
      to="/painel/leads/$id"
      params={{ id: String(o.id_oportunidade) }}
      className="block rounded-xl border border-border bg-card p-3.5 shadow-sm transition hover:border-gold hover:shadow-md"
    >
      <p className="truncate text-sm font-semibold text-foreground">{o.cliente_nome}</p>
      {o.destino && (
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" /> {o.destino}
          {o.estado_sigla ? ` · ${o.estado_sigla}` : ""}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatarRelativo(o.ultima_atividade)}</span>
          {o.total_interacoes > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {o.total_interacoes}
            </span>
          )}
        </span>
        {o.valor_estimado != null && (
          <span className="text-sm font-semibold text-navy">
            R$ {formatarPreco(o.valor_estimado)}
          </span>
        )}
      </div>
    </Link>
  );
}

function NovoAtendimentoDialog({
  open,
  onOpenChange,
  estagioInicial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  estagioInicial: string;
}) {
  const queryClient = useQueryClient();
  const [buscaCliente, setBuscaCliente] = useState("");
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [nomeClienteEscolhido, setNomeClienteEscolhido] = useState("");
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { data: clientesEncontrados } = useQuery({
    queryKey: ["busca-cliente-atendimento", buscaCliente],
    queryFn: () => buscarClientesPorNome(buscaCliente),
    enabled: buscaCliente.trim().length >= 2,
  });

  function fechar() {
    onOpenChange(false);
    setBuscaCliente("");
    setIdCliente(null);
    setNomeClienteEscolhido("");
    setValor("");
  }

  async function salvar() {
    if (!idCliente) {
      toast.error("Escolha um cliente na busca.");
      return;
    }
    setEnviando(true);
    try {
      await criarOportunidade({
        id_cliente: idCliente,
        estagio_funil: estagioInicial,
        valor_estimado: valor ? Number(valor) : undefined,
      });
      toast.success("Atendimento criado.");
      queryClient.invalidateQueries({ queryKey: ["painel-oportunidades"] });
      fechar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível criar o atendimento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : fechar())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo atendimento</DialogTitle>
          <DialogDescription>
            Vai entrar na coluna "{estagioInicial}". Busque o cliente já cadastrado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Cliente
            </label>
            <input
              value={nomeClienteEscolhido || buscaCliente}
              onChange={(e) => {
                setBuscaCliente(e.target.value);
                setNomeClienteEscolhido("");
                setIdCliente(null);
              }}
              placeholder="Digite o nome do cliente..."
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
            {!nomeClienteEscolhido && buscaCliente.trim().length >= 2 && (
              <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-border">
                {(clientesEncontrados ?? []).length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                ) : (
                  (clientesEncontrados ?? []).map((c) => (
                    <button
                      key={c.id_cliente}
                      type="button"
                      onClick={() => {
                        setIdCliente(c.id_cliente);
                        setNomeClienteEscolhido(c.nome);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      {c.nome}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Valor estimado (opcional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </div>

          <button
            onClick={salvar}
            disabled={enviando || !idCliente}
            className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-gold-foreground hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Criando..." : "Criar atendimento"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
