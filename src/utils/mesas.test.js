import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVRE, OCUPADA, normalizarMesas, mesasLivres, mesasQueComportam, melhorMesa,
  capacidadeMaxima, contarOcupadas, estaOcupada, numeroDeMesaValido,
} from "./mesas.js";
import { MESAS_PADRAO, MESA_MAX, LUGARES_MAX } from "../data/mesas.js";

const salao = (ocupadas = []) =>
  MESAS_PADRAO.map((mesa) => ({ ...mesa, status: ocupadas.includes(mesa.numero) ? OCUPADA : LIVRE }));

test("o salão padrão tem 12 mesas numeradas de 1 a 12", () => {
  assert.equal(MESAS_PADRAO.length, 12);
  assert.deepEqual(MESAS_PADRAO.map((m) => m.numero), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.equal(MESA_MAX, 12);
});

test("a maior mesa do salão define a capacidade máxima", () => {
  assert.equal(LUGARES_MAX, 6);
  assert.equal(capacidadeMaxima(salao()), 6);
});

test("número de mesa fora de 1..12 é inválido", () => {
  for (const n of [1, 6, 12]) assert.equal(numeroDeMesaValido(n), true, String(n));
  for (const n of [0, -1, 13, 100, 1.5, NaN, "3", null, undefined]) {
    assert.equal(numeroDeMesaValido(n), false, String(n));
  }
});

test("normalizarMesas aceita documentos válidos e ordena por número", () => {
  const mesas = normalizarMesas([
    { numero: 5, lugares: 4, status: OCUPADA },
    { numero: 2, lugares: 2, status: LIVRE },
  ]);
  assert.deepEqual(mesas.map((m) => m.numero), [2, 5]);
  assert.equal(mesas[1].status, OCUPADA);
});

test("normalizarMesas usa o id do documento quando não há campo numero", () => {
  const mesas = normalizarMesas([{ id: "7", lugares: 4 }]);
  assert.deepEqual(mesas, [{ numero: 7, lugares: 4, status: LIVRE }]);
});

test("normalizarMesas descarta documento quebrado em vez de derrubar a tela", () => {
  const mesas = normalizarMesas([
    { numero: 99, lugares: 4 },
    { numero: 3, lugares: 0 },
    { numero: 4, lugares: "abc" },
    { numero: 5 },
    null,
    { numero: 6, lugares: 4 },
  ]);
  assert.deepEqual(mesas.map((m) => m.numero), [6]);
});

test("status desconhecido é tratado como livre", () => {
  assert.equal(normalizarMesas([{ numero: 1, lugares: 2, status: "sei la" }])[0].status, LIVRE);
});

test("normalizarMesas aguenta lista vazia ou ausente", () => {
  assert.deepEqual(normalizarMesas([]), []);
  assert.deepEqual(normalizarMesas(undefined), []);
});

test("mesa ocupada não aparece como disponível", () => {
  const mesas = salao([1, 2]);
  assert.equal(mesasLivres(mesas).length, 10);
  assert.equal(mesasQueComportam(mesas, 2).some((m) => m.numero === 1), false);
});

test("grupo nunca é oferecido mesa menor que ele", () => {
  for (const pessoas of [1, 2, 3, 4, 5, 6]) {
    for (const mesa of mesasQueComportam(salao(), pessoas)) {
      assert.ok(mesa.lugares >= pessoas, `${pessoas} pessoas em mesa de ${mesa.lugares}`);
    }
  }
});

test("a melhor mesa é a menor que comporta o grupo (não desperdiça mesa grande)", () => {
  assert.equal(melhorMesa(salao(), 2).lugares, 2);
  assert.equal(melhorMesa(salao(), 3).lugares, 4);
  assert.equal(melhorMesa(salao(), 5).lugares, 6);
});

test("entre mesas do mesmo tamanho, escolhe a de menor número", () => {
  assert.equal(melhorMesa(salao(), 2).numero, 1);
  assert.equal(melhorMesa(salao([1, 2]), 2).numero, 3);
});

test("sem mesa que comporte o grupo, não devolve nenhuma", () => {
  assert.equal(melhorMesa(salao(), 7), null);
  assert.deepEqual(mesasQueComportam(salao(), 20), []);
  assert.equal(melhorMesa(salao(Array.from({ length: 12 }, (_, i) => i + 1)), 2), null);
});

test("quando só sobra mesa grande, o grupo pequeno pode usá-la", () => {
  const mesas = salao([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(melhorMesa(mesas, 2).lugares, 6);
});

test("pessoas inválidas são tratadas como 1 pessoa", () => {
  for (const v of [0, -3, NaN, undefined, "abc"]) {
    assert.equal(mesasQueComportam(salao(), v).length, 12, String(v));
  }
});

test("contagem de ocupadas e consulta por número", () => {
  const mesas = salao([3, 9]);
  assert.equal(contarOcupadas(mesas), 2);
  assert.equal(estaOcupada(mesas, 3), true);
  assert.equal(estaOcupada(mesas, 4), false);
  assert.equal(estaOcupada([], 3), false);
});

test("capacidadeMaxima cai no padrão quando o salão ainda não foi cadastrado", () => {
  assert.equal(capacidadeMaxima([]), LUGARES_MAX);
});
