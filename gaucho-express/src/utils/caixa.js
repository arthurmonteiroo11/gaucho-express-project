export const TAXA_SERVICO = 0.1;

export const emCentavos = (valor) => Math.round(valor * 100);

export function agruparItens(nomes, tabelaDePrecos) {
  const contagem = {};
  nomes.forEach((nome) => {
    contagem[nome] = (contagem[nome] || 0) + 1;
  });
  return Object.entries(contagem).map(([nome, qtd]) => {
    const precoCadastrado = tabelaDePrecos[nome];
    const precoUnitario = emCentavos(precoCadastrado ?? 0);
    return { nome, qtd, semPreco: precoCadastrado === undefined, subtotal: precoUnitario * qtd };
  });
}

export function calcularConta(nomes, tabelaDePrecos) {
  const itens = agruparItens(nomes, tabelaDePrecos);
  const total = itens.reduce((acc, item) => acc + item.subtotal, 0);
  const taxaServico = Math.round(total * TAXA_SERVICO);
  return {
    itens,
    total,
    taxaServico,
    totalGeral: total + taxaServico,
    temItemSemPreco: itens.some((item) => item.semPreco),
  };
}

export const valorPorPessoa = (totalCentavos, pessoas) =>
  Math.round(totalCentavos / (Number(pessoas) || 1));
