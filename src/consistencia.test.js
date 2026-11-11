import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PERFIS, rotasPermitidas } from "./config/perfis.js";

const aqui = dirname(fileURLToPath(import.meta.url));
const ler = (...partes) => readFileSync(join(aqui, ...partes), "utf8");

const app = ler("App.jsx");
const sidebar = ler("components", "Sidebar.jsx");
const regras = readFileSync(join(aqui, "..", "firestore.rules"), "utf8");

const rotasDoApp = [...app.matchAll(/<Route path="(\/[a-z]*)" element=\{<RotaPorPerfil perfil=\{perfil\} caminho="([^"]*)">/g)];
const rotasDoMenu = [...sidebar.matchAll(/\{ to: "([^"]+)"/g)].map((m) => m[1]);
const rotasDoGerente = rotasPermitidas("gerente");

test("toda rota protegida do App usa o mesmo caminho no guarda de perfil", () => {
  assert.ok(rotasDoApp.length >= 6);
  for (const [, caminho, guarda] of rotasDoApp) assert.equal(caminho, guarda);
});

test("as rotas do App, as do menu e as do gerente são exatamente as mesmas", () => {
  const doApp = rotasDoApp.map((m) => m[1]).sort();
  assert.deepEqual(doApp, [...rotasDoGerente].sort());
  assert.deepEqual([...rotasDoMenu].sort(), [...rotasDoGerente].sort());
});

test("nenhuma tela do sistema ficou sem proteção por perfil", () => {
  const rotasSemGuarda = [...app.matchAll(/<Route path="(\/[a-z]+)" element=\{(?!<RotaPorPerfil)/g)].map((m) => m[1]).filter((rota) => rota !== "/login");
  assert.deepEqual(rotasSemGuarda, []);
});

test("a rota pública da fila existe e não passa por login", () => {
  const publica = app.indexOf('path="/fila/:ticketId"');
  const protegida = app.indexOf("<RotaProtegida>");
  assert.ok(publica > 0 && protegida > 0 && publica < protegida);
});

test("os perfis das regras do Firestore são os mesmos do aplicativo", () => {
  const listaNasRegras = regras.match(/perfil in \[([^\]]+)\]/)[1].match(/'([a-z]+)'/g).map((s) => s.replaceAll("'", ""));
  assert.deepEqual([...listaNasRegras].sort(), Object.keys(PERFIS).sort());
});

test("as regras bloqueiam todo o resto e proíbem apagar pedidos e fila", () => {
  assert.match(regras, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.equal((regras.match(/allow delete: if false;/g) || []).length, 4);
});

test("a coleção pública da fila não guarda dados pessoais", () => {
  const bloco = regras.slice(regras.indexOf("match /filaPublica"), regras.indexOf("match /estoque"));
  assert.match(bloco, /hasOnly\(\['status', 'timestamp'\]\)/);
  assert.doesNotMatch(bloco, /nome/);
});

test("o serviço da fila grava na coleção pública os mesmos campos que as regras aceitam", () => {
  const servico = ler("services", "filaService.js");
  const publico = servico.slice(servico.indexOf("publicoRef, {"), servico.indexOf("await lote.commit"));
  assert.match(publico, /status: "Aguardando"/);
  assert.doesNotMatch(publico, /nome|pessoas/);
});

test("as regras cobrem a coleção de mesas e só deixam mudar o status", () => {
  const bloco = regras.slice(regras.indexOf("match /mesas"));
  assert.match(bloco, /allow read: if gerenteOu/);
  assert.match(bloco, /soMuda\(\['status'\]\)/);
  assert.match(bloco, /status in \['Livre', 'Ocupada'\]/);
  assert.match(bloco, /allow create: if ehGerente\(\)/);
  assert.match(bloco, /allow delete: if false;/);
});

test("alocar um cliente grava a mesa na fila, e as regras permitem esse campo", () => {
  const servico = ler("services", "filaService.js");
  assert.match(servico, /status: "Alocada", mesa: numeroMesa/);
  assert.match(servico, /doc\(db, "mesas", String\(numeroMesa\)\), \{ status: "Ocupada" \}/);
  const blocoFila = regras.slice(regras.indexOf("match /fila/"), regras.indexOf("match /filaPublica"));
  assert.match(blocoFila, /soMuda\(\['status', 'mesa'\]\)/);
});

test("o número máximo de mesas do app bate com o salão cadastrado", async () => {
  const { MESA_MAX, MESAS_PADRAO } = await import("./data/mesas.js");
  assert.equal(MESA_MAX, MESAS_PADRAO.length);
  assert.match(ler("pages", "Atendimento.jsx"), /import \{ MESA_MIN, MESA_MAX \} from "\.\.\/data\/mesas"/);
});
