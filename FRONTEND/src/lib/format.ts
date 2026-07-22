export function formatarPreco(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return "Sob consulta";
  const numero = typeof valor === "string" ? Number(valor) : valor;
  if (Number.isNaN(numero)) return "Sob consulta";
  return numero.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatarData(valor: string | null | undefined): string {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
