import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";
import { MESAS_PADRAO } from "../data/mesas";

export async function adicionarNaFila({ nome, pessoas, tempoEstimado }) {
  const filaRef = doc(collection(db, "fila"));
  const publicoRef = doc(db, "filaPublica", filaRef.id);

  const lote = writeBatch(db);
  lote.set(filaRef, {
    nome,
    pessoas,
    tempoEstimado,
    status: "Aguardando",
    timestamp: serverTimestamp(),
  });
  lote.set(publicoRef, {
    status: "Aguardando",
    timestamp: serverTimestamp(),
  });
  await lote.commit();

  return filaRef.id;
}

export async function atualizarStatusDaFila(id, status) {
  const lote = writeBatch(db);
  lote.update(doc(db, "fila", id), { status });
  lote.set(doc(db, "filaPublica", id), { status }, { merge: true });
  await lote.commit();
}

export async function alocarEmMesa(idFila, numeroMesa) {
  const lote = writeBatch(db);
  lote.update(doc(db, "fila", idFila), { status: "Alocada", mesa: numeroMesa });
  lote.set(doc(db, "filaPublica", idFila), { status: "Alocada" }, { merge: true });
  lote.update(doc(db, "mesas", String(numeroMesa)), { status: "Ocupada" });
  await lote.commit();
}

export async function cadastrarSalaoPadrao() {
  const lote = writeBatch(db);
  MESAS_PADRAO.forEach((mesa) => {
    lote.set(doc(db, "mesas", String(mesa.numero)), {
      numero: mesa.numero,
      lugares: mesa.lugares,
      status: "Livre",
    });
  });
  await lote.commit();
}

export const linkDeAcompanhamento = (id) => `${window.location.origin}/fila/${id}`;
