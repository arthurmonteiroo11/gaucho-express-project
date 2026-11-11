import test from "node:test";
import assert from "node:assert/strict";
import { precos, fichaTecnica, calcularConsumo, formatarMoeda, formatarCentavos, categorias } from "./cardapio.js";

const normalizar = (texto) => texto.replace(/\u00a0/g, " ");
const INSUMOS_CADASTRADOS = ["costela", "linguica", "picanha", "polenta"];

test("todo prato com ficha técnica tem preço no cardápio", () => {
  for (const prato of Object.keys(fichaTecnica)) {
    assert.ok(prato in precos, `sem preço: ${prato}`);
  }
});

test("toda ficha técnica usa apenas insumos cadastrados e quantidades positivas", () => {
  for (const [prato, insumos] of Object.entries(fichaTecnica)) {
    for (const { id, qtd } of insumos) {
      assert.ok(INSUMOS_CADASTRADOS.includes(id), `${prato}: insumo ${id}`);
      assert.ok(qtd > 0, `${prato}: quantidade ${qtd}`);
    }
  }
});

test("todos os preços são números positivos", () => {
  for (const [nome, preco] of Object.entries(precos)) {
    assert.ok(typeof preco === "number" && preco > 0, nome);
  }
});

test("categorias começam por Todos", () => {
  assert.equal(categorias[0], "Todos");
});

test("calcularConsumo de um prato segue a ficha técnica", () => {
  assert.deepEqual(calcularConsumo(["Picanha na Brasa"]), { picanha: 0.4 });
});

test("calcularConsumo soma pratos repetidos e combos", () => {
  const consumo = calcularConsumo(["Combo Família Gaúcha", "Picanha na Brasa", "Picanha na Brasa"]);
  assert.deepEqual(consumo, { costela: 1.2, linguica: 0.6, polenta: 0.4, picanha: 0.8 });
});

test("calcularConsumo ignora itens sem ficha técnica (bebidas)", () => {
  assert.deepEqual(calcularConsumo(["Cerveja Artesanal", "Suco Natural"]), {});
});

test("calcularConsumo não acumula erro de ponto flutuante", () => {
  const consumo = calcularConsumo(Array(3).fill("Linguiça Campeira"));
  assert.equal(consumo.linguica, 0.9);
  assert.equal(calcularConsumo(["Polenta Frita", "Combo Casal"]).polenta, 0.4);
});

test("calcularConsumo de pedido vazio é vazio", () => {
  assert.deepEqual(calcularConsumo([]), {});
});

test("formatação de moeda em reais", () => {
  assert.equal(normalizar(formatarMoeda(199.9)), "R$ 199,90");
  assert.equal(normalizar(formatarCentavos(19990)), "R$ 199,90");
  assert.equal(normalizar(formatarCentavos(0)), "R$ 0,00");
});
