import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  getRegistro,
  listarLinhas,
  criarLinha,
  atualizarLinha,
  deletarLinha,
  type LinhaGenerica,
} from "../../../../lib/admin";
import { useAuth } from "../../../../lib/auth";
import { podeAdministrarTudo } from "../../../../lib/permissoes";
import { ApiError } from "../../../../lib/api";

export const Route = createFileRoute("/painel/admin/$dominio/$tabela")({
  component: AdminTabelaPage,
});

function formatarValor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function AdminTabelaPage() {
  const { dominio, tabela } = Route.useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const podeAcessar = podeAdministrarTudo(usuario);
  const queryClient = useQueryClient();

  const [campo, setCampo] = useState("");
  const [valor, setValor] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState<{ campo: string; valor: string } | null>(null);
  const [editando, setEditando] = useState<LinhaGenerica | null>(null);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (usuario && !podeAcessar) navigate({ to: "/painel" });
  }, [usuario, podeAcessar, navigate]);

  const { data: registro } = useQuery({
    queryKey: ["admin-registro"],
    queryFn: getRegistro,
    enabled: podeAcessar,
  });
  const info = registro?.[dominio]?.[tabela];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-linhas", dominio, tabela, filtroAtivo],
    queryFn: () =>
      listarLinhas(dominio, tabela, {
        campo: filtroAtivo?.campo,
        valor: filtroAtivo?.valor,
        limit: 100,
      }),
    enabled: podeAcessar,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["admin-linhas", dominio, tabela] });

  const mutDeletar = useMutation({
    mutationFn: (id: string | number) => deletarLinha(dominio, tabela, id),
    onSuccess: () => {
      toast.success("Registro excluído.");
      invalidar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Não foi possível excluir."),
  });

  if (!podeAcessar || !info) {
    return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  }

  const colunas = [info.pk, ...info.cols];
  const registros = data?.registros ?? [];

  return (
    <div>
      <Link
        to="/painel/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Administração
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">{dominio}</p>
          <h1 className="mt-1 font-display text-3xl text-foreground">{tabela}</h1>
        </div>
        <button
          onClick={() => setCriando(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-gold-foreground hover:brightness-95"
        >
          <Plus className="h-4 w-4" /> Novo registro
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFiltroAtivo(campo && valor ? { campo, valor } : null);
        }}
        className="mt-6 flex flex-wrap gap-2"
      >
        <select
          value={campo}
          onChange={(e) => setCampo(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        >
          <option value="">Buscar por campo...</option>
          {colunas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor (aceita parte do texto)"
          disabled={!campo}
          className="flex-1 min-w-[200px] rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!campo || !valor}
          className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-navy-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Search className="h-4 w-4" /> Buscar
        </button>
        {filtroAtivo && (
          <button
            type="button"
            onClick={() => {
              setCampo("");
              setValor("");
              setFiltroAtivo(null);
            }}
            className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted"
          >
            Limpar
          </button>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {colunas.map((c) => (
                <th key={c} className="whitespace-nowrap px-4 py-3">
                  {c}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={colunas.length + 1} className="px-4 py-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={colunas.length + 1} className="px-4 py-6 text-center text-red-600">
                  {error instanceof ApiError ? error.message : "Erro ao carregar."}
                </td>
              </tr>
            )}
            {!isLoading && !isError && registros.length === 0 && (
              <tr>
                <td colSpan={colunas.length + 1} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
            {registros.map((linha) => (
              <tr key={String(linha[info.pk])} className="border-t border-border hover:bg-muted/30">
                {colunas.map((c) => (
                  <td key={c} className="whitespace-nowrap px-4 py-2.5 text-foreground">
                    {formatarValor(linha[c])}
                  </td>
                ))}
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditando(linha)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir o registro ${linha[info.pk]}?`)) {
                          mutDeletar.mutate(linha[info.pk] as string | number);
                        }
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <p className="mt-3 text-xs text-muted-foreground">{data.total} registro(s) nesta página.</p>}

      {(criando || editando) && (
        <FormularioModal
          dominio={dominio}
          tabela={tabela}
          pk={info.pk}
          cols={info.cols}
          linha={editando}
          onClose={() => {
            setCriando(false);
            setEditando(null);
          }}
          onSaved={() => {
            invalidar();
            setCriando(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function FormularioModal({
  dominio,
  tabela,
  pk,
  cols,
  linha,
  onClose,
  onSaved,
}: {
  dominio: string;
  tabela: string;
  pk: string;
  cols: string[];
  linha: LinhaGenerica | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const dados: LinhaGenerica = {};
    for (const col of cols) {
      const v = String(form.get(col) ?? "").trim();
      if (v !== "") dados[col] = v;
    }
    setSalvando(true);
    try {
      if (linha) {
        await atualizarLinha(dominio, tabela, linha[pk] as string | number, dados);
        toast.success("Registro atualizado.");
      } else {
        await criarLinha(dominio, tabela, dados);
        toast.success("Registro criado.");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">
            {linha ? `Editar #${linha[pk]}` : "Novo registro"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {cols.map((col) => (
            <div key={col}>
              <label className="text-sm font-medium text-foreground">{col}</label>
              <input
                name={col}
                defaultValue={linha ? String(linha[col] ?? "") : ""}
                placeholder={linha ? "Deixe em branco para não alterar" : ""}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={salvando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-3 text-sm font-semibold text-navy-foreground hover:opacity-90 disabled:opacity-60"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {linha ? "Salvar alterações" : "Criar registro"}
          </button>
        </form>
      </div>
    </div>
  );
}
