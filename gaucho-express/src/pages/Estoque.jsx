import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, doc, runTransaction } from "firebase/firestore";
import { db } from "../config/firebase";
import gsap from "gsap";
import { useToast } from "../contexts/ToastContext";
import "../styles/Estoque.css";

const arredondarKg = (valor) => Math.round(valor * 1000) / 1000;

const AJUSTES = [
  { valor: -1, rotulo: "- 1 KG", classe: "ctrl-btn sub" },
  { valor: -0.5, rotulo: "- 500g", classe: "ctrl-btn sub min" },
  { valor: 0.5, rotulo: "+ 500g", classe: "ctrl-btn add min" },
  { valor: 1, rotulo: "+ 1 KG", classe: "ctrl-btn add" },
];

export function Estoque() {
  const [insumos, setInsumos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroConexao, setErroConexao] = useState(false);
  const listRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "estoque"),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => String(a.nome ?? a.id).localeCompare(String(b.nome ?? b.id), "pt-BR"));
        setInsumos(data);
        setErroConexao(false);
        setCarregando(false);
      },
      (erro) => {
        console.error("Falha ao ler o estoque:", erro);
        setErroConexao(true);
        setCarregando(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".estoque-row",
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: "power1.out" }
      );
    }, listRef);
    return () => ctx.revert();
  }, [insumos.length]);

  const alterarMassa = async (id, valorEmKg) => {
    const ref = doc(db, "estoque", id);
    try {
      const aceito = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error("insumo-inexistente");
        const atual = Number(snap.data().quantidadeKg) || 0;
        const novo = arredondarKg(atual + valorEmKg);
        if (novo < 0) return false;
        transaction.update(ref, { quantidadeKg: novo });
        return true;
      });
      if (!aceito) addToast("Não há estoque suficiente para retirar essa quantidade.", "erro");
    } catch (error) {
      console.error("Falha ao ajustar estoque:", error);
      addToast("Não foi possível ajustar o estoque. Verifique a conexão e tente novamente.", "erro");
    }
  };

  return (
    <main className="estoque-wrapper">
      <header className="page-header">
        <h1>Controle de Insumos</h1>
        <p>Auditoria e ajuste manual de estoque em quilogramas</p>
      </header>

      {erroConexao && (
        <div className="erro-banner" role="alert">
          Não foi possível carregar o estoque. Verifique a conexão; a lista volta a atualizar sozinha quando ela retornar.
        </div>
      )}

      <section className="estoque-list" ref={listRef}>
        {insumos.map((item) => {
          const quantidade = Number(item.quantidadeKg);
          const quantidadeValida = Number.isFinite(quantidade);
          const abaixoDoMinimo =
            quantidadeValida && typeof item.minimoKg === "number" && quantidade <= item.minimoKg;
          const nome = item.nome || item.id;

          return (
            <article key={item.id} className={`estoque-row ${abaixoDoMinimo ? "baixo" : ""}`.trim()}>
              <div className="row-identificacao">
                <h3 className="item-nome">{nome}</h3>
                <span className="item-categoria">{item.categoria || "Geral"}</span>
                {abaixoDoMinimo && <span className="estoque-alerta">Abaixo do mínimo</span>}
              </div>

              <div className="row-dados">
                <span className="peso-display">
                  {quantidadeValida ? quantidade.toFixed(3) : "—"} <small>KG</small>
                </span>
              </div>

              <div className="row-controles">
                {[AJUSTES.slice(0, 2), AJUSTES.slice(2)].map((grupo, indice) => (
                  <div className="control-group" key={indice}>
                    {grupo.map(({ valor, rotulo, classe }) => (
                      <button
                        key={valor}
                        type="button"
                        className={classe}
                        disabled={valor < 0 && (!quantidadeValida || quantidade + valor < 0)}
                        aria-label={`${valor < 0 ? "Retirar" : "Adicionar"} ${Math.abs(valor) === 1 ? "1 quilo" : "500 gramas"} de ${nome}`}
                        onClick={() => alterarMassa(item.id, valor)}
                      >
                        {rotulo}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
        {!carregando && !erroConexao && insumos.length === 0 && (
          <div className="estoque-vazio">Nenhum insumo cadastrado ainda.</div>
        )}
      </section>
    </main>
  );
}
