import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useToast } from "../contexts/ToastContext";
import { registrarPedidoComBaixa } from "../services/estoqueService";
import { menu, categorias, formatarMoeda } from "../data/cardapio";
import { MESA_MIN, MESA_MAX } from "../data/mesas";
import "../styles/Atendimento.css";


export function Atendimento() {
  const [carrinho, setCarrinho] = useState([]);
  const [mesaTexto, setMesaTexto] = useState("1");
  const [abaAtiva, setAbaAtiva] = useState("Todos");
  const [enviando, setEnviando] = useState(false);
  const menuRef = useRef(null);
  const { addToast } = useToast();

  const mesa = Number(mesaTexto);
  const mesaValida = mesaTexto !== "" && Number.isInteger(mesa) && mesa >= MESA_MIN && mesa <= MESA_MAX;

  const menuFiltrado = abaAtiva === "Todos"
    ? menu
    : menu.filter((item) => item.categoria === abaAtiva);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".menu-item",
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, stagger: 0.03, duration: 0.3, ease: "power2.out" }
      );
    }, menuRef);
    return () => ctx.revert();
  }, [abaAtiva]);

  const adicionarItem = (item) => setCarrinho((atual) => [...atual, item]);

  const removerItem = (index) => setCarrinho((atual) => atual.filter((_, i) => i !== index));

  const enviarPedido = async () => {
    if (carrinho.length === 0 || enviando) return;
    if (!mesaValida) {
      addToast(`Informe um número de mesa entre ${MESA_MIN} e ${MESA_MAX} para enviar o pedido.`, "erro");
      return;
    }

    setEnviando(true);
    const resultado = await registrarPedidoComBaixa({
      mesa,
      itens: carrinho.map((item) => item.nome),
    });
    setEnviando(false);

    if (resultado.sucesso) {
      addToast(`Pedido da Mesa ${mesa} enviado para a cozinha!`, "sucesso");
      setCarrinho([]);
    } else {
      addToast(resultado.erro, "erro");
    }
  };

  const total = carrinho.reduce((acc, item) => acc + item.preco, 0);

  return (
    <main className="atendimento-container">
      <div className="atendimento-content">
        <header className="atendimento-header">
          <div className="header-titles">
            <h1>Comanda Operacional</h1>
          </div>
          <div className="mesa-selector">
            <label htmlFor="mesa-numero">Mesa:</label>
            <input
              id="mesa-numero"
              type="number"
              inputMode="numeric"
              value={mesaTexto}
              onChange={(e) => setMesaTexto(e.target.value)}
              min={MESA_MIN}
              max={MESA_MAX}
              aria-invalid={!mesaValida}
            />
          </div>
        </header>

        <nav className="abas-container" aria-label="Categorias do cardápio">
          {categorias.map((cat) => (
            <Button
              key={cat}
              variant={abaAtiva === cat ? "primary" : "secondary"}
              aria-pressed={abaAtiva === cat}
              onClick={() => setAbaAtiva(cat)}
            >
              {cat}
            </Button>
          ))}
        </nav>

        <section className="menu-grid" ref={menuRef}>
          {menuFiltrado.map((item) => (
            <Card
              key={item.id}
              hoverable
              onClick={() => adicionarItem(item)}
              className="menu-item"
              aria-label={`Adicionar ${item.nome} à mesa, ${formatarMoeda(item.preco)}`}
            >
              <span className="item-categoria">{item.categoria}</span>
              <span className="item-nome">{item.nome}</span>
              <span className="item-preco">{formatarMoeda(item.preco)}</span>
            </Card>
          ))}
        </section>
      </div>

      <aside className="carrinho-panel" id="carrinho-panel">
        <h2>Resumo da Mesa {mesaValida ? mesa : "—"}</h2>
        <ul className="carrinho-lista">
          {carrinho.map((item, index) => (
            <li key={`${item.id}-${index}`}>
              <button
                type="button"
                className="carrinho-item-btn"
                onClick={() => removerItem(index)}
                aria-label={`Remover ${item.nome}, ${formatarMoeda(item.preco)}`}
              >
                <span className="carrinho-item-info">
                  <span className="carrinho-item-nome">{item.nome}</span>
                  <span className="carrinho-item-acao">Remover</span>
                </span>
                <span className="carrinho-item-preco">{formatarMoeda(item.preco)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="carrinho-footer">
          <span className="total">Total: <span>{formatarMoeda(total)}</span></span>
          <Button
            variant="primary"
            onClick={enviarPedido}
            disabled={carrinho.length === 0}
            loading={enviando}
          >
            Disparar para Cozinha
          </Button>
        </div>
      </aside>

      {carrinho.length > 0 && (
        <button
          type="button"
          className="carrinho-fab"
          onClick={() =>
            document
              .getElementById("carrinho-panel")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <span>Ver pedido ({carrinho.length})</span>
          <strong>{formatarMoeda(total)}</strong>
        </button>
      )}
    </main>
  );
}
