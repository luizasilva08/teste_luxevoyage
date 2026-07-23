/**
 * Máscaras de formatação progressiva pra campos brasileiros comuns —
 * aplicadas a cada tecla digitada (onChange), pra quem preenche o
 * formulário já ver o formato certo se montando, sem precisar adivinhar.
 */

export function maskTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  const ddd = d.slice(0, 2);
  const numero = d.slice(2);
  if (d.length <= 2) return `(${ddd}`;
  if (numero.length <= 4) return `(${ddd}) ${numero}`;
  const divisor = d.length > 10 ? 5 : 4;
  return `(${ddd}) ${numero.slice(0, divisor)}-${numero.slice(divisor)}`;
}

export function maskCPF(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += `.${d.slice(3, 6)}`;
  if (d.length > 6) out += `.${d.slice(6, 9)}`;
  if (d.length > 9) out += `-${d.slice(9, 11)}`;
  return out;
}

export function maskCEP(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
