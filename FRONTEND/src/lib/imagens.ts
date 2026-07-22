import heroNoronha from "../assets/hero-noronha.jpg";
import destJerico from "../assets/dest-jericoacoara.jpg";
import destSalvador from "../assets/dest-salvador.jpg";
import destRio from "../assets/dest-rio.jpg";
import destOuroPreto from "../assets/dest-ouropreto.jpg";
import destBonito from "../assets/dest-bonito.jpg";
import destGramado from "../assets/dest-gramado.jpg";
import destMaragogi from "../assets/dest-maragogi.jpg";

/**
 * O banco tem ~200 municípios reais como destino, mas o acervo de fotos é
 * fixo (8 imagens). Em vez de repetir 1 imagem genérica pra tudo, associa
 * por região (mesmo clima/vibe visual) e varia dentro da região por índice,
 * pra galeria não parecer clonada.
 */
const POR_REGIAO: Record<string, string[]> = {
  Nordeste: [heroNoronha, destJerico, destSalvador, destMaragogi],
  Sudeste: [destRio, destOuroPreto],
  Sul: [destGramado],
  "Centro-Oeste": [destBonito],
  Norte: [destJerico, heroNoronha],
};

const TODAS = [
  heroNoronha,
  destJerico,
  destSalvador,
  destRio,
  destOuroPreto,
  destBonito,
  destGramado,
  destMaragogi,
];

export function imagemDestino(regiaoNome: string | null | undefined, semente = 0): string {
  const opcoes = (regiaoNome && POR_REGIAO[regiaoNome]) || TODAS;
  return opcoes[Math.abs(semente) % opcoes.length];
}

export { heroNoronha };
