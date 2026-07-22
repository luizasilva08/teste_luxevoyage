import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Mail, Phone } from "lucide-react";
import { listarClientes, buscarClientesPorNome } from "../../../lib/painel";

export const Route = createFileRoute("/painel/clientes/")({
  component: ClientesPage,
});

function ClientesPage() {
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["painel-clientes", termo],
    queryFn: () => (termo ? buscarClientesPorNome(termo) : listarClientes()),
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">Clientes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todo mundo que já pediu uma cotação ou foi cadastrado pela equipe.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTermo(busca.trim());
        }}
        className="mt-6 flex max-w-sm gap-2"
      >
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3.5 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-navy px-4 text-sm font-semibold text-navy-foreground hover:opacity-90"
        >
          Buscar
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Contato</th>
              <th className="px-5 py-3">CEP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && (clientes ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {(clientes ?? []).map((c) => (
              <tr key={c.id_cliente} className="border-t border-border hover:bg-muted/30">
                <td className="px-5 py-3">
                  <Link
                    to="/painel/clientes/$id"
                    params={{ id: String(c.id_cliente) }}
                    className="font-medium text-foreground hover:text-navy"
                  >
                    {c.nome}
                  </Link>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  <div className="flex flex-col gap-0.5">
                    {c.email_criptografado && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {c.email_criptografado}
                      </span>
                    )}
                    {c.telefone_criptografado && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {c.telefone_criptografado}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{c.cep || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
