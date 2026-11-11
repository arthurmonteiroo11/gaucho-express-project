import test from "node:test";
import assert from "node:assert/strict";
import { milissegundos, minutosDesde, nivelDeUrgencia, MIN_ATENCAO, MIN_URGENTE } from "./cozinha.js";

test("limites de urgência são 10 e 20 minutos", () => {
  assert.equal(MIN_ATENCAO, 10);
  assert.equal(MIN_URGENTE, 20);
});

test("nivelDeUrgencia respeita as fronteiras", () => {
  assert.equal(nivelDeUrgencia(0), "");
  assert.equal(nivelDeUrgencia(9), "");
  assert.equal(nivelDeUrgencia(10), "atencao");
  assert.equal(nivelDeUrgencia(19), "atencao");
  assert.equal(nivelDeUrgencia(20), "urgente");
  assert.equal(nivelDeUrgencia(120), "urgente");
});

test("nivelDeUrgencia ignora pedido sem horário confirmado", () => {
  assert.equal(nivelDeUrgencia(null), "");
});

test("minutosDesde calcula minutos inteiros e nunca fica negativo", () => {
  const agora = 10 * 60000;
  assert.equal(minutosDesde(0, agora), 10);
  assert.equal(minutosDesde(agora - 59999, agora), 0);
  assert.equal(minutosDesde(agora + 5 * 60000, agora), 0);
});

test("minutosDesde devolve null quando o horário ainda não existe", () => {
  assert.equal(minutosDesde(Number.POSITIVE_INFINITY, Date.now()), null);
  assert.equal(minutosDesde(NaN, Date.now()), null);
});

test("milissegundos lê timestamp do Firestore e trata ausência", () => {
  assert.equal(milissegundos({ toMillis: () => 1234 }), 1234);
  assert.equal(milissegundos(null), Number.POSITIVE_INFINITY);
  assert.equal(milissegundos(undefined), Number.POSITIVE_INFINITY);
  assert.equal(milissegundos({}), Number.POSITIVE_INFINITY);
});

test("ordenar por milissegundos coloca o pedido mais antigo primeiro e o sem horário por último", () => {
  const pedidos = [
    { id: "novo", timestamp: { toMillis: () => 3000 } },
    { id: "pendente", timestamp: null },
    { id: "antigo", timestamp: { toMillis: () => 1000 } },
  ];
  pedidos.sort((a, b) => milissegundos(a.timestamp) - milissegundos(b.timestamp));
  assert.deepEqual(pedidos.map((p) => p.id), ["antigo", "novo", "pendente"]);
});
