import test from "node:test";
import assert from "node:assert/strict";
import { PERFIS, perfilValido, rotasPermitidas, podeAcessar, rotaInicial, rotuloDoPerfil } from "./perfis.js";

const TODAS = ["/", "/atendimento", "/kds", "/estoque", "/recepcao", "/caixa"];

test("o gerente acessa todas as telas", () => {
  for (const rota of TODAS) assert.equal(podeAcessar("gerente", rota), true, rota);
});

test("cada perfil operacional acessa somente a sua tela", () => {
  assert.deepEqual(rotasPermitidas("garcom"), ["/atendimento"]);
  assert.deepEqual(rotasPermitidas("cozinha"), ["/kds"]);
  assert.deepEqual(rotasPermitidas("recepcao"), ["/recepcao"]);
  assert.deepEqual(rotasPermitidas("caixa"), ["/caixa"]);
});

test("garçom não acessa estoque, caixa, cozinha nem dashboard", () => {
  for (const rota of ["/estoque", "/caixa", "/kds", "/recepcao", "/"]) {
    assert.equal(podeAcessar("garcom", rota), false, rota);
  }
});

test("só o gerente acessa estoque e dashboard", () => {
  for (const perfil of Object.keys(PERFIS).filter((p) => p !== "gerente")) {
    assert.equal(podeAcessar(perfil, "/estoque"), false, perfil);
    assert.equal(podeAcessar(perfil, "/"), false, perfil);
  }
});

test("perfil desconhecido, vazio ou malicioso não acessa nada", () => {
  for (const perfil of ["admin", "", null, undefined, 42, "constructor", "__proto__", "toString", "GERENTE"]) {
    assert.equal(perfilValido(perfil), false, String(perfil));
    assert.deepEqual(rotasPermitidas(perfil), [], String(perfil));
    assert.equal(rotaInicial(perfil), null, String(perfil));
  }
});

test("rota inicial de cada perfil é uma rota que ele pode acessar", () => {
  for (const perfil of Object.keys(PERFIS)) {
    assert.equal(podeAcessar(perfil, rotaInicial(perfil)), true, perfil);
  }
  assert.equal(rotaInicial("gerente"), "/");
  assert.equal(rotaInicial("garcom"), "/atendimento");
});

test("rótulos legíveis", () => {
  assert.equal(rotuloDoPerfil("garcom"), "Garçom");
  assert.equal(rotuloDoPerfil("gerente"), "Gerente");
  assert.equal(rotuloDoPerfil("xyz"), "");
});

test("nenhum perfil recebe rota fora da lista de telas do sistema", () => {
  for (const perfil of Object.keys(PERFIS)) {
    for (const rota of rotasPermitidas(perfil)) assert.ok(TODAS.includes(rota), `${perfil}: ${rota}`);
  }
});
