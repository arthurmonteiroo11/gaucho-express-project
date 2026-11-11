import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db, hasFirebaseConfig } from "../config/firebase";
import { calcularAcompanhamento, idDeTicketValido, STATUS_ATIVOS } from "../utils/fila";
import { milissegundos } from "../utils/cozinha";
import "../styles/Acompanhar.css";

const formatarHora = (data) =>
  data ? data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

const textoGrupos = (quantidade) =>
  quantidade === 0
    ? "Você é o próximo!"
    : `${quantidade} ${quantidade === 1 ? "grupo" : "grupos"} à sua frente`;

export function AcompanharFila() {
  const { ticketId } = useParams();
  const idValido = idDeTicketValido(ticketId);
  const [meu, setMeu] = useState(undefined);
  const [ativos, setAtivos] = useState([]);
  const [erro, setErro] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  useEffect(() => {
    document.title = "Sua posição na fila · Gaúcho Express";
  }, []);

  useEffect(() => {
    if (!idValido) return undefined;
    if (!db || !hasFirebaseConfig) {
      setErro(true);
      return undefined;
    }

    setMeu(undefined);
    setErro(false);

    const cancelarMeu = onSnapshot(
      doc(db, "filaPublica", ticketId),
      (snap) => {
        setMeu(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setErro(false);
        setAtualizadoEm(new Date());
      },
      (falha) => {
        console.error("Falha ao ler o acompanhamento:", falha?.code);
        setErro(true);
      }
    );

    const cancelarAtivos = onSnapshot(
      query(collection(db, "filaPublica"), where("status", "in", STATUS_ATIVOS)),
      (snap) => {
        setAtivos(
          snap.docs.map((d) => ({
            id: d.id,
            status: d.data().status,
            timestampMs: milissegundos(d.data().timestamp),
          }))
        );
        setAtualizadoEm(new Date());
      },
      (falha) => {
        console.error("Falha ao ler a fila pública:", falha?.code);
        setErro(true);
      }
    );

    return () => {
      cancelarMeu();
      cancelarAtivos();
    };
  }, [ticketId, idValido]);

  const resultado = useMemo(() => {
    if (!idValido) return { situacao: "invalido" };
    if (meu === undefined) return null;
    if (meu === null) return { situacao: "invalido" };
    return calcularAcompanhamento(
      { id: meu.id, status: meu.status, timestampMs: milissegundos(meu.timestamp) },
      ativos
    );
  }, [idValido, meu, ativos]);

  const carregando = idValido && resultado === null && !erro;

  return (
    <main className="acompanhar-container">
      <section className="acompanhar-card" aria-labelledby="acompanhar-titulo">
        <p className="acompanhar-marca">
          Gaúcho<span>Express</span>
        </p>
        <h1 id="acompanhar-titulo" className="acompanhar-titulo">
          Sua posição na fila
        </h1>

        <div className="acompanhar-corpo" role="status" aria-live="polite">
          {carregando && <p className="acompanhar-texto">Buscando sua posição…</p>}

          {!carregando && erro && resultado === null && (
            <p className="acompanhar-aviso" role="alert">
              Não foi possível carregar sua posição. Verifique a conexão e recarregue a página.
            </p>
          )}

          {resultado?.situacao === "invalido" && (
            <>
              <p className="acompanhar-icone acompanhar-icone-neutro" aria-hidden="true">?</p>
              <p className="acompanhar-destaque">Link inválido ou expirado</p>
              <p className="acompanhar-texto">Procure a recepção do restaurante para receber um novo link.</p>
            </>
          )}

          {resultado?.situacao === "aguardando" && (
            <>
              <p className="acompanhar-rotulo">Você é o</p>
              <p className="acompanhar-posicao">{resultado.posicao}º</p>
              <p className="acompanhar-destaque">{textoGrupos(resultado.naFrente)}</p>
              <div className="acompanhar-estimativa">
                <span>Tempo estimado</span>
                <strong>~{resultado.esperaMin} min</strong>
              </div>
              <p className="acompanhar-texto">
                Esta página atualiza sozinha. Fique por perto: quando sua mesa estiver pronta, o aviso aparece aqui.
              </p>
            </>
          )}

          {resultado?.situacao === "chamado" && (
            <>
              <p className="acompanhar-icone acompanhar-icone-ok" aria-hidden="true">✓</p>
              <p className="acompanhar-destaque">Sua mesa está pronta!</p>
              <p className="acompanhar-texto">Dirija-se à recepção para ser acomodado.</p>
            </>
          )}

          {resultado?.situacao === "atendido" && (
            <>
              <p className="acompanhar-icone acompanhar-icone-ok" aria-hidden="true">✓</p>
              <p className="acompanhar-destaque">Bom apetite!</p>
              <p className="acompanhar-texto">Você já foi acomodado. Obrigado por esperar.</p>
            </>
          )}
        </div>

        {erro && resultado !== null && (
          <p className="acompanhar-aviso" role="alert">
            Sem conexão no momento. Mostrando a última informação recebida.
          </p>
        )}

        {atualizadoEm && !erro && resultado?.situacao === "aguardando" && (
          <p className="acompanhar-rodape">Atualizado às {formatarHora(atualizadoEm)}</p>
        )}
      </section>
    </main>
  );
}
