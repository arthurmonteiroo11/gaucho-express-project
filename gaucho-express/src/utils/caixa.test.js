import test from "node:test";
import assert from "node:assert/strict";
import { agruparItens, calcularConta, emCentavos, valorPorPessoa, TAXA_SERVICO } from "./caixa.js";

const precos = { "Picanha na Brasa": 120, "Polenta Frita": 25, "Cerveja Artesanal": 18, "Suco Natural": 14 };

test("emCentavos evita erro de ponto flutuante", () => {
  assert.equal(emCentavos(19.99), 1999);
  assert.equal(emCentavos(0.1 + 0.2), 30);
  assert.equal(emCentavos(120), 12000);
});

test("agruparItens junta itens repetidos e soma o subtotal", () => {
  const itens = agruparItens(["Cerveja Artesanal", "Polenta Frita", "Cerveja Artesanal"], precos);
  const cerveja = itens.find((i) => i.nome === "Cerveja Artesanal");
  assert.equal(cerveja.qtd, 2);
  assert.equal(cerveja.subtotal, 3600);
  assert.equal(cerveja.semPreco, false);
  assert.equal(itens.length, 2);
});

test("calcularConta aplica taxa de serviço de 10% em centavos", () => {
  assert.equal(TAXA_SERVICO, 0.1);
  const conta = calcularConta(["Picanha na Brasa", "Polenta Frita", "Cerveja Artesanal", "Cerveja Artesanal"], precos);
  assert.equal(conta.total, 18100);
  assert.equal(conta.taxaServico, 1810);
  assert.equal(conta.totalGeral, 19910);
  assert.equal(conta.temItemSemPreco, false);
});

test("calcularConta arredonda a taxa para o centavo mais próximo", () => {
  const conta = calcularConta(["Suco Natural"], { "Suco Natural": 0.15 });
  assert.equal(conta.total, 15);
  assert.equal(conta.taxaServico, 2);
  assert.equal(conta.totalGeral, 17);
});

test("calcularConta sinaliza item sem preço cadastrado e não o cobra", () => {
  const conta = calcularConta(["Prato Misterioso", "Polenta Frita"], precos);
  assert.equal(conta.temItemSemPreco, true);
  assert.equal(conta.total, 2500);
  assert.equal(conta.itens.find((i) => i.nome === "Prato Misterioso").subtotal, 0);
});

test("calcularConta de mesa vazia é zero", () => {
  const conta = calcularConta([], precos);
  assert.equal(conta.totalGeral, 0);
  assert.deepEqual(conta.itens, []);
});

test("valorPorPessoa divide o total e arredonda em centavos", () => {
  assert.equal(valorPorPessoa(19910, 2), 9955);
  assert.equal(valorPorPessoa(10000, 3), 3333);
  assert.equal(valorPorPessoa(10000, 1), 10000);
});

test("valorPorPessoa trata divisor vazio ou inválido como 1", () => {
  assert.equal(valorPorPessoa(5000, ""), 5000);
  assert.equal(valorPorPessoa(5000, 0), 5000);
  assert.equal(valorPorPessoa(5000, undefined), 5000);
});
