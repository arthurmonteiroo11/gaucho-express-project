export const menu = [
  { id: 1, nome: "Combo Família Gaúcha", categoria: "Combos", preco: 199.9 },
  { id: 2, nome: "Combo Casal", categoria: "Combos", preco: 149.9 },
  { id: 3, nome: "Costela Fogo de Chão", categoria: "Carnes", preco: 89.9 },
  { id: 4, nome: "Picanha na Brasa", categoria: "Carnes", preco: 120.0 },
  { id: 5, nome: "Linguiça Campeira", categoria: "Carnes", preco: 35.0 },
  { id: 6, nome: "Polenta Frita", categoria: "Acompanhamentos", preco: 25.0 },
  { id: 7, nome: "Queijo Coalho", categoria: "Acompanhamentos", preco: 22.0 },
  { id: 8, nome: "Arroz Carreteiro", categoria: "Acompanhamentos", preco: 38.0 },
  { id: 9, nome: "Cerveja Artesanal", categoria: "Bebidas", preco: 12.0 },
  { id: 10, nome: "Refrigerante 600ml", categoria: "Bebidas", preco: 8.0 },
  { id: 11, nome: "Suco Natural", categoria: "Bebidas", preco: 10.0 },
];

export const categorias = ["Todos", "Combos", "Carnes", "Acompanhamentos", "Bebidas"];

export const precos = Object.fromEntries(menu.map(({ nome, preco }) => [nome, preco]));

export const fichaTecnica = {
  "Combo Família Gaúcha": [
    { id: "costela", qtd: 1.2 },
    { id: "linguica", qtd: 0.6 },
    { id: "polenta", qtd: 0.4 },
  ],
  "Combo Casal": [
    { id: "picanha", qtd: 0.6 },
    { id: "polenta", qtd: 0.2 },
  ],
  "Costela Fogo de Chão": [{ id: "costela", qtd: 0.5 }],
  "Picanha na Brasa": [{ id: "picanha", qtd: 0.4 }],
  "Linguiça Campeira": [{ id: "linguica", qtd: 0.3 }],
  "Polenta Frita": [{ id: "polenta", qtd: 0.2 }],
};

export function calcularConsumo(nomesDosItens) {
  const consumo = {};
  for (const nome of nomesDosItens) {
    for (const { id, qtd } of fichaTecnica[nome] ?? []) {
      consumo[id] = (consumo[id] ?? 0) + qtd;
    }
  }
  for (const id of Object.keys(consumo)) {
    consumo[id] = Math.round(consumo[id] * 1000) / 1000;
  }
  return consumo;
}

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatarMoeda = (valor) => formatadorMoeda.format(valor);
export const formatarCentavos = (centavos) => formatadorMoeda.format(centavos / 100);
