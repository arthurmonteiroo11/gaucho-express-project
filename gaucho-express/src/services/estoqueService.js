import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { calcularConsumo } from "../data/cardapio";

class ErroDeEstoque extends Error {}

const arredondarKg = (valor) => Math.round(valor * 1000) / 1000;

export const registrarPedidoComBaixa = async ({ mesa, itens }) => {
  if (!db) {
    return { sucesso: false, erro: "Sem conexão com o banco de dados. Verifique a configuração do Firebase." };
  }

  try {
    const consumo = calcularConsumo(itens);
    const idsInsumos = Object.keys(consumo);
    const pedidoRef = doc(collection(db, "pedidos"));

    await runTransaction(db, async (transaction) => {
      const snaps = await Promise.all(
        idsInsumos.map((id) => transaction.get(doc(db, "estoque", id)))
      );

      const atualizacoes = snaps.map((snap, indice) => {
        const id = idsInsumos[indice];
        if (!snap.exists()) {
          throw new ErroDeEstoque(`O insumo "${id}" não está cadastrado no estoque. Cadastre-o e envie o pedido de novo.`);
        }

        const dados = snap.data();
        const atual = Number(dados.quantidadeKg);
        if (!Number.isFinite(atual)) {
          throw new ErroDeEstoque(`O estoque de "${dados.nome || id}" está sem quantidade válida. Corrija em Estoque e tente de novo.`);
        }

        const novaQuantidade = arredondarKg(atual - consumo[id]);
        if (novaQuantidade < 0) {
          throw new ErroDeEstoque(
            `Estoque insuficiente de ${dados.nome || id}: o pedido usa ${consumo[id]} kg e restam ${atual} kg.`
          );
        }
        return { ref: snap.ref, novaQuantidade };
      });

      atualizacoes.forEach(({ ref, novaQuantidade }) => {
        transaction.update(ref, { quantidadeKg: novaQuantidade });
      });

      transaction.set(pedidoRef, {
        mesa,
        itens,
        status: "Pendente",
        timestamp: serverTimestamp(),
      });
    });

    return { sucesso: true };
  } catch (error) {
    console.error("Pedido não registrado (transação desfeita):", error);
    return {
      sucesso: false,
      erro:
        error instanceof ErroDeEstoque
          ? error.message
          : "Não foi possível enviar o pedido. Nada foi descontado do estoque; verifique a conexão e tente novamente.",
    };
  }
};
