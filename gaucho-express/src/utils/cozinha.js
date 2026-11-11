export const MIN_ATENCAO = 10;
export const MIN_URGENTE = 20;

export const milissegundos = (timestamp) =>
  typeof timestamp?.toMillis === "function" ? timestamp.toMillis() : Number.POSITIVE_INFINITY;

export const minutosDesde = (inicio, agora) =>
  Number.isFinite(inicio) ? Math.max(0, Math.floor((agora - inicio) / 60000)) : null;

export const nivelDeUrgencia = (minutos) => {
  if (minutos === null) return "";
  if (minutos >= MIN_URGENTE) return "urgente";
  if (minutos >= MIN_ATENCAO) return "atencao";
  return "";
};
