import test from "node:test";
import assert from "node:assert/strict";
import {
  limitarPessoas,
  estimarEspera,
  calcularAcompanhamento,
  PESSOAS_MIN,
  PESSOAS_MAX,
  idDeTicketValido,
} from "./fila.js";

test("limitarPessoas mantém valores válidos e arredonda", () => {
  assert.equal(limitarPessoas(4), 4);
  assert.equal(limitarPessoas("6"), 6);
  assert.equal(limitarPessoas(2.6), 3);
});

test("limitarPessoas protege contra valores inválidos", () => {
  assert.equal(limitarPessoas(0), PESSOAS_MIN);
  assert.equal(limitarPessoas(-5), PESSOAS_MIN);
  assert.equal(limitarPessoas(999), PESSOAS_MAX);
  assert.equal(limitarPessoas(""), PESSOAS_MIN);
  assert.equal(limitarPessoas("abc"), PESSOAS_MIN);
  assert.equal(limitarPessoas(undefined), PESSOAS_MIN);
  assert.equal(limitarPessoas(Infinity), PESSOAS_MIN);
});

test("estimarEspera: 10 min de base + 15 min por grupo na frente", () => {
  assert.equal(estimarEspera(0), 10);
  assert.equal(estimarEspera(1), 25);
  assert.equal(estimarEspera(4), 70);
});

test("estimarEspera nunca devolve valor negativo ou NaN", () => {
  assert.equal(estimarEspera(-3), 10);
  assert.equal(estimarEspera(undefined), 10);
  assert.equal(estimarEspera("x"), 10);
});

const t = (id, status, timestampMs) => ({ id, status, timestampMs });

test("acompanhamento: primeiro da fila", () => {
  const meu = t("a", "Aguardando", 1000);
  const r = calcularAcompanhamento(meu, [meu, t("b", "Aguardando", 2000)]);
  assert.deepEqual(r, { situacao: "aguardando", posicao: 1, naFrente: 0, esperaMin: 10 });
});

test("acompanhamento: conta quem chegou antes, inclusive quem já foi chamado", () => {
  const meu = t("c", "Aguardando", 3000);
  const ativos = [t("a", "Chamando", 1000), t("b", "Aguardando", 2000), meu, t("d", "Aguardando", 4000)];
  const r = calcularAcompanhamento(meu, ativos);
  assert.equal(r.posicao, 3);
  assert.equal(r.naFrente, 2);
  assert.equal(r.esperaMin, 40);
});

test("acompanhamento: a posição melhora quando alguém da frente é atendido", () => {
  const meu = t("c", "Aguardando", 3000);
  const antes = calcularAcompanhamento(meu, [t("a", "Aguardando", 1000), t("b", "Aguardando", 2000), meu]);
  const depois = calcularAcompanhamento(meu, [t("b", "Aguardando", 2000), meu]);
  assert.equal(antes.posicao, 3);
  assert.equal(depois.posicao, 2);
  assert.ok(depois.esperaMin < antes.esperaMin);
});

test("acompanhamento: empate de horário é desempatado pelo id, sem duplicar posição", () => {
  const a = t("a", "Aguardando", 5000);
  const b = t("b", "Aguardando", 5000);
  const ativos = [a, b];
  assert.equal(calcularAcompanhamento(a, ativos).posicao, 1);
  assert.equal(calcularAcompanhamento(b, ativos).posicao, 2);
});

test("acompanhamento: horário ainda não confirmado pelo servidor vai para o fim", () => {
  const meu = t("z", "Aguardando", null);
  const r = calcularAcompanhamento(meu, [t("a", "Aguardando", 1000), meu]);
  assert.equal(r.posicao, 2);
});

test("acompanhamento: estados finais e link inválido", () => {
  assert.deepEqual(calcularAcompanhamento(t("a", "Chamando", 1), []), { situacao: "chamado" });
  assert.deepEqual(calcularAcompanhamento(t("a", "Alocada", 1), []), { situacao: "atendido" });
  assert.deepEqual(calcularAcompanhamento(null, []), { situacao: "invalido" });
  assert.deepEqual(calcularAcompanhamento(t("a", "Qualquer", 1), []), { situacao: "invalido" });
});

test("acompanhamento: funciona com a lista ausente", () => {
  const meu = t("a", "Aguardando", 1);
  assert.equal(calcularAcompanhamento(meu, undefined).posicao, 1);
});

test("idDeTicketValido aceita IDs do Firestore e recusa entradas perigosas", () => {
  assert.equal(idDeTicketValido("Xk3pQ9aL2mZr7TnB4vYc"), true);
  for (const ruim of ["", "abc", "a/b/c/d/e/f/g/h", "../estoque/costela", "id com espaço 123", null, undefined, 123, {}, "x".repeat(41)]) {
    assert.equal(idDeTicketValido(ruim), false, String(ruim));
  }
});

test("o limite de pessoas acompanha a maior mesa do salão", () => {
  assert.equal(PESSOAS_MAX, 6);
  assert.equal(limitarPessoas(20), 6);
});

test("limitarPessoas aceita um teto menor, vindo do salão", () => {
  assert.equal(limitarPessoas(6, 4), 4);
  assert.equal(limitarPessoas(3, 4), 3);
  assert.equal(limitarPessoas(0, 4), 1);
  assert.equal(limitarPessoas(5, "abc"), 5);
});
