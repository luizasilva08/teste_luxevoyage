import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "../ui/dialog";
import { solicitarCotacao } from "../../lib/catalogo";
import { ApiError } from "../../lib/api";

type QuoteDialogProps = {
  trigger: React.ReactNode;
  idPacote?: number;
  idMunicipioDestino?: number;
  destinoLabel?: string;
};

export function QuoteDialog({
  trigger,
  idPacote,
  idMunicipioDestino,
  destinoLabel,
}: QuoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    const form = new FormData(e.currentTarget);

    setEnviando(true);
    try {
      await solicitarCotacao({
        nome: String(form.get("nome") || ""),
        email: String(form.get("email") || ""),
        telefone: String(form.get("telefone") || "") || undefined,
        cep: String(form.get("cep") || "") || undefined,
        mensagem: String(form.get("mensagem") || "") || undefined,
        id_pacote: idPacote,
        id_municipio_destino: idMunicipioDestino,
      });
      setEnviado(true);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível enviar seu pedido agora. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setTimeout(() => setEnviado(false), 300);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {enviado ? (
          <div className="py-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-navy/10 text-navy">
              <Send className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-2xl text-foreground">Pedido enviado!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Um consultor da Luxe Voyage vai entrar em contato em breve com uma proposta sob medida
              {destinoLabel ? ` para ${destinoLabel}` : ""}.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                Solicitar cotação {destinoLabel ? `— ${destinoLabel}` : "personalizada"}
              </DialogTitle>
              <DialogDescription>
                Conte um pouco sobre a viagem e um consultor monta uma proposta sem compromisso.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-medium text-foreground">Nome completo</label>
                <input
                  name="nome"
                  required
                  placeholder="Seu nome"
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground">E-mail</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="voce@email.com"
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Telefone</label>
                  <input
                    name="telefone"
                    placeholder="(00) 00000-0000"
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">CEP (opcional)</label>
                <input
                  name="cep"
                  placeholder="00000-000"
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Conte mais sobre a viagem (opcional)
                </label>
                <textarea
                  name="mensagem"
                  rows={3}
                  placeholder="Datas, número de viajantes, preferências..."
                  className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <button
                type="submit"
                disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-3 text-sm font-semibold text-gold-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                {enviando ? "Enviando..." : "Solicitar cotação"}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
