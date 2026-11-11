export const MESA_MIN = 1;
export const MESA_MAX = 12;

export const MESAS_PADRAO = [
  { numero: 1, lugares: 2 },
  { numero: 2, lugares: 2 },
  { numero: 3, lugares: 2 },
  { numero: 4, lugares: 2 },
  { numero: 5, lugares: 4 },
  { numero: 6, lugares: 4 },
  { numero: 7, lugares: 4 },
  { numero: 8, lugares: 4 },
  { numero: 9, lugares: 4 },
  { numero: 10, lugares: 4 },
  { numero: 11, lugares: 6 },
  { numero: 12, lugares: 6 },
];

export const LUGARES_MAX = MESAS_PADRAO.reduce((maior, mesa) => Math.max(maior, mesa.lugares), 0);
