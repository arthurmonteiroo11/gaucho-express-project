import { MESA_MIN, MESA_MAX, LUGARES_MAX } from "../data/mesas.js";

export const LIVRE = "Livre";
export const OCUPADA = "Ocupada";

export const numeroDeMesaValido = (numero) =>
  Number.isInteger(numero) && numero >= MESA_MIN && numero <= MESA_MAX;

export function normalizarMesas(documentos) {
  const mesas = [];
  for (const documento of documentos ?? []) {
    const numero = Number(documento?.numero ?? documento?.id);
    const lugares = Number(documento?.lugares);
    if (!numeroDeMesaValido(numero)) continue;
    if (!Number.isFinite(lugares) || lugares < 1) continue;
    mesas.push({
      numero,
      lugares: Math.round(lugares),
      status: documento?.status === OCUPADA ? OCUPADA : LIVRE,
    });
  }
  return mesas.sort((a, b) => a.numero - b.numero);
}

export const mesasLivres = (mesas) => (mesas ?? []).filter((mesa) => mesa.status === LIVRE);

export function mesasQueComportam(mesas, pessoas) {
  const quantidade = Math.max(1, Math.round(Number(pessoas)) || 1);
  return mesasLivres(mesas)
    .filter((mesa) => mesa.lugares >= quantidade)
    .sort((a, b) => a.lugares - b.lugares || a.numero - b.numero);
}

export const melhorMesa = (mesas, pessoas) => mesasQueComportam(mesas, pessoas)[0] ?? null;

export function capacidadeMaxima(mesas) {
  const lugares = (mesas ?? []).map((mesa) => mesa.lugares);
  return lugares.length > 0 ? Math.max(...lugares) : LUGARES_MAX;
}

export const contarOcupadas = (mesas) => (mesas ?? []).filter((mesa) => mesa.status === OCUPADA).length;

export const estaOcupada = (mesas, numero) =>
  (mesas ?? []).some((mesa) => mesa.numero === numero && mesa.status === OCUPADA);
