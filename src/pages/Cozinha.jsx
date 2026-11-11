import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";
import gsap from "gsap";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { milissegundos, minutosDesde, nivelDeUrgencia } from "../utils/cozinha";
import "../styles/Cozinha.css";

const reduzirMovimento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const animarSaida = (elemento) =>
  new Promise((resolve) => {
    gsap.to(elemento, { opacity: 0, scale: 0.9, duration: 0.3, ease: "power2.in", onComplete: resolve });
  });

export function Cozinha() {
  const [pedidos, setPedidos] = useState([]);
  const [erroConexao, setErroConexao] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [emAtualizacao, setEmAtualizacao] = useState(() => new Set());
  const boardRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "pedidos"), where("status", "in", ["Pendente", "Em Preparo"]));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => milissegundos(a.timestamp) - milissegundos(b.timestamp));
        setPedidos(docs);
        setErroConexao(false);
      },
      (erro) => {
        console.error("Falha ao ler pedidos:", erro);
        setErroConexao(true);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!boardRef.current || pedidos.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".kds-card",
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, stagger: 0.05, duration: 0.4, ease: "power2.out" }
      );
    }, boardRef);
    return () => ctx.revert();
  }, [pedidos.length]);

  const marcarAtualizando = (id, ativo) =>
    setEmAtualizacao((atual) => {
      const novo = new Set(atual);
      if (ativo) novo.add(id);
      else novo.delete(id);
      return novo;
    });

  const atualizarStatus = async (pedido) => {
    if (emAtualizacao.has(pedido.id)) return;
    const novoStatus = pedido.status === "Pendente" ? "Em Preparo" : "Pronto";
    const elemento = document.getElementById(`pedido-${pedido.id}`);
    const animar = novoStatus === "Pronto" && elemento && !reduzirMovimento();

    marcarAtualizando(pedido.id, true);
    try {
      if (animar) await animarSaida(elemento);
      await updateDoc(doc(db, "pedidos", pedido.id), { status: novoStatus });
      addToast(
        novoStatus === "Pronto" ? "Pedido marcado como pronto!" : "Iniciou o preparo do pedido.",
        "sucesso"
      );
    } catch (error) {
      console.error("Falha ao atualizar pedido:", error);
      if (elemento) gsap.set(elemento, { clearProps: "all" });
      addToast("Não foi possível atualizar o pedido. Verifique a conexão e tente novamente.", "erro");
    } finally {
      marcarAtualizando(pedido.id, false);
    }
  };

  const minutosEmEspera = (pedido) => minutosDesde(milissegundos(pedido.timestamp), agora);

  return (
    <main className="kds-container">
      <header className="kds-header">
        <div className="header-titles">
          <h1>Cozinha Express</h1>
        </div>
        <span className="kds-pulse">{erroConexao ? "Sem conexão" : "Sincronização Ativa"}</span>
      </header>

      {erroConexao && (
        <div className="erro-banner" role="alert">
          Não foi possível carregar os pedidos. Verifique a conexão; a tela volta a atualizar sozinha quando ela retornar.
        </div>
      )}

      <section className="kds-board" ref={boardRef}>
        {pedidos.map((pedido) => {
          const minutos = minutosEmEspera(pedido);
          const nivel = nivelDeUrgencia(minutos);
          const statusClasse = pedido.status?.toLowerCase().replace(" ", "-");
          return (
            <Card key={pedido.id} id={`pedido-${pedido.id}`} className={`kds-card ${statusClasse} ${nivel}`.trim()}>
              <div className="kds-card-header">
                <h2>Mesa {pedido.mesa}</h2>
                <span className="kds-status-badge">{pedido.status}</span>
              </div>
              {minutos !== null && (
                <span className="kds-tempo">{minutos === 0 ? "Chegou agora" : `Há ${minutos} min`}</span>
              )}
              <ul className="kds-itens">
                {pedido.itens?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <Button
                variant={pedido.status === "Pendente" ? "danger" : "primary"}
                className="kds-btn-acao"
                loading={emAtualizacao.has(pedido.id)}
                onClick={() => atualizarStatus(pedido)}
              >
                {pedido.status === "Pendente" ? "Iniciar Preparo" : "Marcar como Pronto"}
              </Button>
            </Card>
          );
        })}
        {pedidos.length === 0 && !erroConexao && (
          <div className="kds-vazio">O salão está tranquilo. Nenhum pedido na fila.</div>
        )}
      </section>
    </main>
  );
}
