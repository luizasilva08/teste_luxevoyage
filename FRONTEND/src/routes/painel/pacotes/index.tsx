import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Loader2 } from "lucide-react";
import {
  listarPacotesAdmin,
  criarPacoteAdmin,
  atualizarPacoteAdmin,
  deletarPacoteAdmin,
  listarMunicipios,
  STATUS_PACOTE,
  type PacoteAdmin,
} from "../../../lib/painel";

export const Route = createFileRoute("/painel/pacotes/")({
  component: PacotesAdminPage,
});

function PacotesAdminPage() {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<PacoteAdmin | null>(null);
  const [criando, setCriando] = useState(false);

  const { data: pacotes, isLoading } = useQuery({
    queryKey: ["painel-pacotes"],
    queryFn: () => listarPacotesAdmin(),
  });
  const { data: municipios } = useQuery({
    queryKey: ["painel-municipios"],
    queryFn: () => listarMunicipios(),
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["painel-pacotes"] });

  const mutDeletar = useMutation({
    mutationFn: (id: number) => deletarPacoteAdmin(id),
    onSuccess: () => {
      invalidar();
      toast.success("Pacote removido.");
    },
    onError: () => toast.error("Não foi possível remover este pacote."),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Catálogo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pacotes que aparecem na vitrine pública.
          </p>
        </div>
        <button
          onClick={() => setCriando(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-gold-foreground hover:brightness-95"
        >
          <Plus className="h-4 w-4" /> Novo pacote
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Destino</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && (pacotes ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">
                  Nenhum pacote cadastrado ainda.
                </td>
              </tr>
            )}
            {(pacotes ?? []).map((p) => (
              <tr key={p.id_pacote} className="border-t border-border hover:bg-muted/30">
                <td className="px-5 py-3 font-medium text-foreground">{p.nome_pacote}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {municipios?.find((m) => m.id_municipio === p.id_municipio_destino)?.nome ??
                    `#${p.id_municipio_destino}`}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditando(p)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover "${p.nome_pacote}"?`)) mutDeletar.mutate(p.id_pacote);
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

      {(criando || editando) && (
        <PacoteFormModal
          pacote={editando}
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

function StatusBadge({ status }: { status: string }) {
  const cores: Record<string, string> = {
    Publicado: "bg-emerald-100 text-emerald-700",
    Ativo: "bg-emerald-100 text-emerald-700",
    Rascunho: "bg-muted text-muted-foreground",
    "Em Revisão": "bg-amber-100 text-amber-700",
    Inativo: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cores[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status}
    </span>
  );
}

function PacoteFormModal({
  pacote,
  onClose,
  onSaved,
}: {
  pacote: PacoteAdmin | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: municipios } = useQuery({
    queryKey: ["painel-municipios"],
    queryFn: () => listarMunicipios(),
  });
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const dados = {
      nome_pacote: String(form.get("nome_pacote") || ""),
      id_municipio_destino: Number(form.get("id_municipio_destino")),
      status: String(form.get("status") || "Rascunho"),
    };
    setSalvando(true);
    try {
      if (pacote) {
        await atualizarPacoteAdmin(pacote.id_pacote, dados);
        toast.success("Pacote atualizado.");
      } else {
        await criarPacoteAdmin(dados);
        toast.success("Pacote criado.");
      }
      onSaved();
    } catch {
      toast.error("Não foi possível salvar o pacote.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">
            {pacote ? "Editar pacote" : "Novo pacote"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Nome do pacote</label>
            <input
              name="nome_pacote"
              required
              defaultValue={pacote?.nome_pacote}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Destino</label>
            <select
              name="id_municipio_destino"
              required
              defaultValue={pacote?.id_municipio_destino}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            >
              <option value="">Selecione...</option>
              {(municipios ?? []).map((m) => (
                <option key={m.id_municipio} value={m.id_municipio}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Status</label>
            <select
              name="status"
              defaultValue={pacote?.status ?? "Rascunho"}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            >
              {STATUS_PACOTE.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-3 text-sm font-semibold text-navy-foreground hover:opacity-90 disabled:opacity-60"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
            {pacote ? "Salvar alterações" : "Criar pacote"}
          </button>
        </form>
      </div>
    </div>
  );
}
