import { LUGARES_MAX } from "../data/mesas.js";

export const MINUTOS_POR_GRUPO = 15;
export const MINUTOS_BASE = 10;
export const PESSOAS_MIN = 1;
export const PESSOAS_MAX = LUGARES_MAX;
export const STATUS_ATIVOS = ["Aguardando", "Chamando"];

export const idDeTicketValido = (id) => typeof id === "string" && /^[A-Za-z0-9]{10,40}$/.test(id);

export const limitarPessoas = (valor, maximo = PESSOAS_MAX) => {
  const teto = Math.max(PESSOAS_MIN, Math.round(Number(maximo)) || PESSOAS_MAX);
  const numero = Math.round(Number(valor));
  if (!Number.isFinite(numero)) return PESSOAS_MIN;
  return Math.min(teto, Math.max(PESSOAS_MIN, numero));
};

export const estimarEspera = (quantidadeNaFrente) =>
  Math.max(0, Number(quantidadeNaFrente) || 0) * MINUTOS_POR_GRUPO + MINUTOS_BASE;

const instante = (ms) => (Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY);

const chegouAntes = (a, b) => {
  const ta = instante(a.timestampMs);
  const tb = instante(b.timestampMs);
  if (ta !== tb) return ta < tb;
  return a.id < b.id;
};

export function calcularAcompanhamento(meu, ativos) {
  if (!meu) return { situacao: "invalido" };
  if (meu.status === "Alocada") return { situacao: "atendido" };
  if (meu.status === "Chamando") return { situacao: "chamado" };
  if (meu.status !== "Aguardando") return { situacao: "invalido" };

  const naFrente = (ativos ?? []).filter((t) => t.id !== meu.id && chegouAntes(t, meu)).length;
  return {
    situacao: "aguardando",
    posicao: naFrente + 1,
    naFrente,
    esperaMin: estimarEspera(naFrente),
  };
}
