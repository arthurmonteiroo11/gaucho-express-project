import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, where, doc, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";
import gsap from "gsap";
import { Button } from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { precos, formatarCentavos } from "../data/cardapio";
import { calcularConta, valorPorPessoa } from "../utils/caixa";
import { normalizarMesas } from "../utils/mesas";
import "../styles/Caixa.css";

export function Caixa() {
  const [pedidos, setPedidos] = useState([]);
  const [mesasDoSalao, setMesasDoSalao] = useState([]);
  const [mesaSelecionada, setMesaSelecionada] = useState(null);
  const [divisao, setDivisao] = useState(1);
  const [processando, setProcessando] = useState(false);
  const [erroConexao, setErroConexao] = useState(false);
  const { addToast } = useToast();
  const gridRef = useRef(null);
  const itensRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "pedidos"), where("status", "!=", "Pago"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setErroConexao(false);
      },
      (erro) => {
        console.error("Falha ao ler pedidos:", erro);
        setErroConexao(true);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "mesas"),
      (snap) => setMesasDoSalao(normalizarMesas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
      (erro) => console.error("Falha ao ler as mesas:", erro)
    );
    return () => unsub();
  }, []);

  const mesas = [...new Set(pedidos.map((p) => p.mesa))].sort((a, b) => a - b);

  useEffect(() => {
    if (mesaSelecionada !== null && !pedidos.some((p) => p.mesa === mesaSelecionada)) {
      setMesaSelecionada(null);
      setDivisao(1);
    }
  }, [pedidos, mesaSelecionada]);

  useEffect(() => {
    if (pedidos.length > 0 && gridRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".mesa-card",
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }
        );
      }, gridRef);
      return () => ctx.revert();
    }
  }, [pedidos.length]);

  useEffect(() => {
    if (mesaSelecionada !== null && itensRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".cupom-item-row",
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: "power1.out" }
        );
      }, itensRef);
      return () => ctx.revert();
    }
  }, [mesaSelecionada]);

  const fecharConta = async () => {
    if (mesaSelecionada === null || processando) return;
    const pedidosDaMesa = pedidos.filter((p) => p.mesa === mesaSelecionada);
    if (pedidosDaMesa.length === 0) return;

    setProcessando(true);
    try {
      const lote = writeBatch(db);
      pedidosDaMesa.forEach((p) => lote.update(doc(db, "pedidos", p.id), { status: "Pago" }));
      if (mesasDoSalao.some((mesa) => mesa.numero === mesaSelecionada)) {
        lote.update(doc(db, "mesas", String(mesaSelecionada)), { status: "Livre" });
      }
      await lote.commit();

      addToast(`Conta da Mesa ${mesaSelecionada} encerrada. A mesa está livre.`, "sucesso");
      setMesaSelecionada(null);
      setDivisao(1);
    } catch (error) {
      console.error("Falha ao registrar pagamento:", error);
      addToast("Não foi possível registrar o pagamento. A conta continua aberta; verifique a conexão e tente novamente.", "erro");
    } finally {
      setProcessando(false);
    }
  };

  const getDetalhesMesa = () => {
    if (mesaSelecionada === null) return null;
    const pedidosDaMesa = pedidos.filter((p) => p.mesa === mesaSelecionada);
    if (pedidosDaMesa.length === 0) return null;

    return calcularConta(pedidosDaMesa.flatMap((p) => p.itens || []), precos);
  };

  const detalhes = getDetalhesMesa();

  const handleDivisaoChange = (e) => {
    const val = e.target.value;
    if (val === "") {
      setDivisao("");
      return;
    }
    const num = Number(val);
    if (Number.isInteger(num) && num >= 1 && num <= 50) setDivisao(num);
  };

  const handleDivisaoBlur = () => {
    if (divisao === "" || Number(divisao) < 1) {
      setDivisao(1);
    }
  };

  const divisorAtivo = Number(divisao) || 1;

  const selecionarMesa = (mesa) => setMesaSelecionada(mesa);

  return (
    <main className="caixa-container">
      <section className="caixa-lista-panel">
        <header className="caixa-header">
          <h1>Terminal de Pagamento</h1>
          <p>Selecione uma mesa para realizar a auditoria e fechamento da conta</p>
        </header>

        {erroConexao && (
          <div className="erro-banner" role="alert">
            Não foi possível carregar as contas. Verifique a conexão; a lista volta a atualizar sozinha quando ela retornar.
          </div>
        )}

        <div className="mesas-grid" ref={gridRef}>
          {mesas.map((mesa) => (
            <div
              key={mesa}
              className={`mesa-card ${mesaSelecionada === mesa ? "ativa" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={mesaSelecionada === mesa}
              aria-label={`Mesa ${mesa}, consumo ativo`}
              onClick={() => selecionarMesa(mesa)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selecionarMesa(mesa);
                }
              }}
            >
              <div className="mesa-card-top">
                <span className="mesa-label">Mesa</span>
                <span className="mesa-numero">{String(mesa).padStart(2, "0")}</span>
              </div>
              <div className="mesa-card-bottom">
                <span className="mesa-status-dot"></span>
                <span className="mesa-status-text">Consumo Ativo</span>
              </div>
            </div>
          ))}
          {mesas.length === 0 && !erroConexao && (
            <div className="caixa-vazio">Nenhuma mesa com consumo ativo no momento.</div>
          )}
        </div>
      </section>

      <aside className="caixa-cupom-wrapper">
        <div className="caixa-cupom-panel">
          {detalhes ? (
            <>
              <header className="cupom-header">
                <div className="cupom-logo">GAÚCHO EXPRESS</div>
                <div className="cupom-meta">
                  <span>MESA {String(mesaSelecionada).padStart(2, "0")}</span>
                  <span>DATA: {new Date().toLocaleDateString("pt-BR")}</span>
                </div>
              </header>

              <div className="cupom-body">
                <div className="cupom-colunas">
                  <span>QTD</span>
                  <span>ITEM</span>
                  <span className="col-total">TOTAL</span>
                </div>
                <ul className="cupom-itens" ref={itensRef}>
                  {detalhes.itens.map((item) => (
                    <li key={item.nome} className="cupom-item-row">
                      <span className="item-qtd">{item.qtd}x</span>
                      <span className="item-nome">{item.nome}</span>
                      <span className="item-sub">{item.semPreco ? "sem preço" : formatarCentavos(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                {detalhes.temItemSemPreco && (
                  <p className="cupom-aviso" role="alert">
                    Há itens sem preço cadastrado no cardápio. Confira o valor antes de cobrar.
                  </p>
                )}
              </div>

              <div className="cupom-resumo">
                <div className="resumo-linha">
                  <span>Subtotal</span>
                  <span>{formatarCentavos(detalhes.total)}</span>
                </div>
                <div className="resumo-linha">
                  <span>Taxa de Serviço (10%)</span>
                  <span>{formatarCentavos(detalhes.taxaServico)}</span>
                </div>
              </div>

              <footer className="cupom-footer">
                <div className="cupom-total">
                  <span>TOTAL A PAGAR</span>
                  <strong>{formatarCentavos(detalhes.totalGeral)}</strong>
                </div>

                <div className="divisao-conta">
                  <label htmlFor="divisao-pessoas">Dividir em:</label>
                  <div className="divisao-input-wrapper">
                    <input
                      id="divisao-pessoas"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="50"
                      value={divisao}
                      onChange={handleDivisaoChange}
                      onBlur={handleDivisaoBlur}
                      placeholder="1"
                    />
                    <span>pessoas</span>
                  </div>
                  {divisorAtivo > 1 && (
                    <span className="valor-dividido">
                      {formatarCentavos(valorPorPessoa(detalhes.totalGeral, divisorAtivo))}/cada
                    </span>
                  )}
                </div>

                <Button
                  variant="primary"
                  onClick={fecharConta}
                  loading={processando}
                  className="btn-fechar-conta"
                >
                  Confirmar Pagamento
                </Button>
              </footer>
            </>
          ) : (
            <div className="cupom-placeholder">
              <p>Aguardando seleção de mesa</p>
            </div>
          )}
        </div>
      </aside>
    </main>
  );
}
