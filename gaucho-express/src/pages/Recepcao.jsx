import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import gsap from "gsap";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { adicionarNaFila, atualizarStatusDaFila, alocarEmMesa, cadastrarSalaoPadrao, linkDeAcompanhamento } from "../services/filaService";
import { limitarPessoas, estimarEspera, PESSOAS_MIN } from "../utils/fila";
import { normalizarMesas, mesasQueComportam, capacidadeMaxima, contarOcupadas, OCUPADA } from "../utils/mesas";
import "../styles/Recepcao.css";

const reduzirMovimento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const animarSaida = (elemento) =>
  new Promise((resolve) => {
    gsap.to(elemento, { opacity: 0, scale: 0.9, duration: 0.3, ease: "power2.in", onComplete: resolve });
  });

const doisDigitos = (numero) => String(numero).padStart(2, "0");

export function Recepcao() {
  const [fila, setFila] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [nome, setNome] = useState("");
  const [pessoas, setPessoas] = useState("2");
  const [erroNome, setErroNome] = useState("");
  const [erroConexao, setErroConexao] = useState(false);
  const [loadingFila, setLoadingFila] = useState(false);
  const [alocando, setAlocando] = useState(null);
  const [criandoSalao, setCriandoSalao] = useState(false);
  const listaRef = useRef(null);
  const nomeRef = useRef(null);
  const { addToast } = useToast();

  const estimativa = estimarEspera(fila.length);
  const capacidade = capacidadeMaxima(mesas);
  const livres = mesas.length - contarOcupadas(mesas);

  useEffect(() => {
    const q = query(collection(db, "fila"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFila(dados.filter((cliente) => cliente.status !== "Alocada"));
        setErroConexao(false);
      },
      (erro) => {
        console.error("Falha ao ler a fila:", erro);
        setErroConexao(true);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "mesas"),
      (snapshot) => setMesas(normalizarMesas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))),
      (erro) => console.error("Falha ao ler as mesas:", erro)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".fila-card",
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, stagger: 0.1, duration: 0.4, ease: "power2.out" }
      );
    }, listaRef);
    return () => ctx.revert();
  }, [fila.length]);

  const adicionarFila = async (e) => {
    e.preventDefault();
    if (loadingFila) return;

    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErroNome("Informe o nome do cliente para colocá-lo na fila.");
      nomeRef.current?.focus();
      return;
    }

    setLoadingFila(true);
    try {
      await adicionarNaFila({
        nome: nomeLimpo,
        pessoas: limitarPessoas(pessoas, capacidade),
        tempoEstimado: estimativa,
      });

      addToast(`${nomeLimpo} adicionado à fila de espera!`, "sucesso");
      setNome("");
      setPessoas("2");
      setErroNome("");
    } catch (error) {
      console.error("Falha ao adicionar à fila:", error);
      addToast("Não foi possível adicionar o cliente. Verifique a conexão e tente novamente.", "erro");
    } finally {
      setLoadingFila(false);
    }
  };

  const chamarCliente = async (id) => {
    try {
      await atualizarStatusDaFila(id, "Chamando");
      addToast("Cliente chamado ao balcão.", "sucesso");
    } catch (error) {
      console.error("Falha ao chamar cliente:", error);
      addToast("Não foi possível chamar o cliente. Tente novamente.", "erro");
    }
  };

  const copiarLink = async (id) => {
    const url = linkDeAcompanhamento(id);
    try {
      await navigator.clipboard.writeText(url);
      addToast("Link de acompanhamento copiado. Envie ao cliente.", "sucesso");
    } catch {
      window.prompt("Copie o link de acompanhamento do cliente:", url);
    }
  };

  const criarSalao = async () => {
    if (criandoSalao) return;
    setCriandoSalao(true);
    try {
      await cadastrarSalaoPadrao();
      addToast("Salão cadastrado com 12 mesas.", "sucesso");
    } catch (error) {
      console.error("Falha ao cadastrar o salão:", error);
      addToast("Não foi possível cadastrar o salão. Só o gerente pode fazer isso.", "erro");
    } finally {
      setCriandoSalao(false);
    }
  };

  const confirmarMesa = async (cliente, mesa) => {
    const elemento = document.getElementById(`cliente-${cliente.id}`);
    setAlocando(null);
    try {
      if (elemento && !reduzirMovimento()) await animarSaida(elemento);
      await alocarEmMesa(cliente.id, mesa.numero);
      addToast(`${cliente.nome} acomodado na mesa ${doisDigitos(mesa.numero)}.`, "sucesso");
    } catch (error) {
      console.error("Falha ao alocar mesa:", error);
      if (elemento) gsap.set(elemento, { clearProps: "all" });
      addToast("Não foi possível ocupar a mesa. O cliente continua na fila; tente novamente.", "erro");
    }
  };

  return (
    <main className="recepcao-container">
      <aside className="recepcao-form-panel">
        <header className="recepcao-header">
          <h1>Recepção</h1>
        </header>

        <form className="novo-cliente-form" onSubmit={adicionarFila} noValidate>
          <h2>Novo Cliente na Fila</h2>
          <div className="input-group">
            <label htmlFor="cliente-nome">Nome do Cliente</label>
            <input
              id="cliente-nome"
              ref={nomeRef}
              type="text"
              autoComplete="off"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (erroNome) setErroNome("");
              }}
              placeholder="Ex: João Silva"
              aria-invalid={Boolean(erroNome)}
              aria-describedby={erroNome ? "cliente-nome-erro" : undefined}
            />
            {erroNome && (
              <span id="cliente-nome-erro" className="campo-erro" role="alert">{erroNome}</span>
            )}
          </div>
          <div className="input-group">
            <label htmlFor="cliente-pessoas">Número de Pessoas</label>
            <input
              id="cliente-pessoas"
              type="number"
              inputMode="numeric"
              min={PESSOAS_MIN}
              max={capacidade}
              value={pessoas}
              onChange={(e) => setPessoas(e.target.value)}
              onBlur={() => setPessoas(String(limitarPessoas(pessoas, capacidade)))}
              aria-describedby="cliente-pessoas-ajuda"
            />
            <span id="cliente-pessoas-ajuda" className="campo-ajuda">
              Até {capacidade} pessoas, que é o tamanho da maior mesa do salão.
            </span>
          </div>
          <div className="estimativa-box">
            <span>Tempo de espera estimado</span>
            <strong>{estimativa} min</strong>
          </div>
          <Button type="submit" variant="primary" loading={loadingFila}>
            Adicionar à Fila
          </Button>
        </form>

        <section className="salao">
          <div className="salao-header">
            <h2>Salão</h2>
            {mesas.length > 0 && (
              <span className="salao-resumo">{livres} de {mesas.length} livres</span>
            )}
          </div>
          {mesas.length === 0 ? (
            <div className="salao-vazio">
              <p>Nenhuma mesa cadastrada. Sem isso não dá para saber qual mesa está livre.</p>
              <Button variant="secondary" onClick={criarSalao} loading={criandoSalao}>
                Cadastrar as 12 mesas padrão
              </Button>
            </div>
          ) : (
            <ul className="salao-grid">
              {mesas.map((mesa) => (
                <li
                  key={mesa.numero}
                  className={`salao-mesa ${mesa.status === OCUPADA ? "ocupada" : "livre"}`}
                  aria-label={`Mesa ${doisDigitos(mesa.numero)}, ${mesa.lugares} lugares, ${mesa.status.toLowerCase()}`}
                >
                  <strong>{doisDigitos(mesa.numero)}</strong>
                  <small>{mesa.lugares} lug.</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      <section className="fila-lista-panel" ref={listaRef}>
        <div className="fila-lista-header">
          <h2>Fila de Espera Atual</h2>
          <span className="badge-contador">{fila.length} Aguardando</span>
        </div>

        {erroConexao && (
          <div className="erro-banner" role="alert">
            Não foi possível carregar a fila. Verifique a conexão; a lista volta a atualizar sozinha quando ela retornar.
          </div>
        )}

        <div className="fila-grid">
          {fila.map((cliente, index) => {
            const candidatas = mesasQueComportam(mesas, cliente.pessoas);
            return (
              <Card key={cliente.id} id={`cliente-${cliente.id}`} className={`fila-card ${cliente.status?.toLowerCase() ?? ""}`.trim()}>
                <div className="fila-posicao">#{index + 1}</div>
                <div className="fila-info">
                  <h3>{cliente.nome}</h3>
                  <p>{cliente.pessoas} pessoas • Espera preditiva: ~{cliente.tempoEstimado} min</p>
                </div>
                <div className="fila-acoes">
                  <Button
                    variant="secondary"
                    onClick={() => copiarLink(cliente.id)}
                    aria-label={`Copiar link de acompanhamento de ${cliente.nome}`}
                  >
                    Copiar link
                  </Button>
                  {cliente.status === "Aguardando" ? (
                    <Button variant="secondary" onClick={() => chamarCliente(cliente.id)}>Chamar</Button>
                  ) : (
                    <Button
                      variant="primary"
                      aria-expanded={alocando === cliente.id}
                      onClick={() => setAlocando(alocando === cliente.id ? null : cliente.id)}
                    >
                      Alocar Mesa
                    </Button>
                  )}
                </div>

                {alocando === cliente.id && (
                  <div className="fila-mesas">
                    {candidatas.length === 0 ? (
                      <p className="fila-mesas-vazio" role="status">
                        Nenhuma mesa livre comporta {cliente.pessoas} pessoas agora.
                      </p>
                    ) : (
                      <>
                        <span className="fila-mesas-rotulo">Mesas livres para {cliente.pessoas} pessoas</span>
                        <div className="fila-mesas-opcoes">
                          {candidatas.map((mesa) => (
                            <button
                              key={mesa.numero}
                              type="button"
                              className="mesa-opcao"
                              onClick={() => confirmarMesa(cliente, mesa)}
                              aria-label={`Acomodar ${cliente.nome} na mesa ${doisDigitos(mesa.numero)} de ${mesa.lugares} lugares`}
                            >
                              <strong>{doisDigitos(mesa.numero)}</strong>
                              <small>{mesa.lugares} lug.</small>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <button type="button" className="fila-mesas-cancelar" onClick={() => setAlocando(null)}>
                      Cancelar
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
          {fila.length === 0 && !erroConexao && (
            <div className="fila-vazia">
              <p>O salão está livre. Nenhum cliente na fila de espera.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
