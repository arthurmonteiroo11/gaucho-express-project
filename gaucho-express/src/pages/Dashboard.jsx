import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import Chart from "react-apexcharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChefHat,
  CircleDollarSign,
  Clock3,
  ConciergeBell,
  LayoutDashboard,
  PackageSearch,
  Radio,
  UsersRound,
} from "lucide-react";
import { db } from "../config/firebase";
import { normalizarMesas, contarOcupadas } from "../utils/mesas";
import "../styles/Dashboard.css";

const periodosGrafico = [
  { id: "hoje", label: "Hoje", dias: 1 },
  { id: "7-dias", label: "7 dias", dias: 7 },
  { id: "30-dias", label: "30 dias", dias: 30 },
];
const horasGrafico = Array.from({ length: 24 }, (_, hora) => `${String(hora).padStart(2, "0")}h`);

const obterDataPedido = (timestamp) => {
  const data = timestamp instanceof Date
    ? timestamp
    : typeof timestamp?.toDate === "function"
      ? timestamp.toDate()
      : null;
  return data && Number.isFinite(data.getTime()) ? data : null;
};

const modulos = [
  { id: "01", titulo: "Atendimento", desc: "Comandas e serviço", path: "/atendimento", icon: ConciergeBell },
  { id: "02", titulo: "Cozinha KDS", desc: "Pedidos em preparo", path: "/kds", icon: ChefHat },
  { id: "03", titulo: "Estoque", desc: "Inventário e insumos", path: "/estoque", icon: PackageSearch },
  { id: "04", titulo: "Recepção", desc: "Fila e acomodação", path: "/recepcao", icon: UsersRound },
  { id: "05", titulo: "Caixa PDV", desc: "Contas e fechamento", path: "/caixa", icon: CircleDollarSign },
];

function useTema() {
  const ler = () => document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const [tema, setTema] = useState(ler);
  useEffect(() => {
    const obs = new MutationObserver(() => setTema(ler()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return tema;
}

const coresGrafico = {
  light: { texto: "#6b675e", eixo: "#6b675e", grade: "rgba(28, 27, 24, 0.10)", ponto: "#ffffff", linha: "#b3401c" },
  dark:  { texto: "#a09a8d", eixo: "#a09a8d", grade: "rgba(255, 255, 255, 0.08)", ponto: "#211f1b", linha: "#e0724c" },
};

const formatDate = () =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());

export function Dashboard() {
  const [metricas, setMetricas] = useState({ mesas: null, fila: null, alertas: null, ocupadas: null, salao: 0 });
  const [erroLive, setErroLive] = useState(false);
  const [pedidosGrafico, setPedidosGrafico] = useState([]);
  const [periodoGrafico, setPeriodoGrafico] = useState("hoje");
  const [estadoGrafico, setEstadoGrafico] = useState(db ? "loading" : "unavailable");
  const firebaseConfigurado = Boolean(db);
  const navigate = useNavigate();
  const tema = useTema();
  const periodoSelecionado = periodosGrafico.find((periodo) => periodo.id === periodoGrafico) ?? periodosGrafico[0];
  const dadosGrafico = useMemo(() => {
    const agora = new Date();
    const inicio = new Date(agora);
    inicio.setHours(0, 0, 0, 0);
    inicio.setDate(inicio.getDate() - (periodoSelecionado.dias - 1));

    const pedidosPorHora = Array(24).fill(0);
    let totalPedidos = 0;

    pedidosGrafico.forEach(({ timestamp }) => {
      const dataPedido = obterDataPedido(timestamp);
      if (!dataPedido || dataPedido < inicio || dataPedido > agora) return;
      pedidosPorHora[dataPedido.getHours()] += 1;
      totalPedidos += 1;
    });

    return { pedidosPorHora, totalPedidos };
  }, [pedidosGrafico, periodoSelecionado]);
  const chartSeries = useMemo(() => [{ name: "Pedidos", data: dadosGrafico.pedidosPorHora }], [dadosGrafico]);
  const cores = coresGrafico[tema];
  const chartOptions = useMemo(() => ({
    chart: {
      type: "area",
      height: 280,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, easing: "easeinout", speed: 650 },
      fontFamily: "var(--font-main)",
      foreColor: cores.texto,
      background: "transparent",
    },
    colors: [cores.linha],
    stroke: { curve: "straight", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 0.1, opacityFrom: 0.12, opacityTo: 0, stops: [0, 95, 100] },
    },
    markers: {
      size: 0,
      colors: [cores.ponto],
      strokeColors: cores.linha,
      strokeWidth: 2,
      hover: { size: 5 },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: cores.grade, strokeDashArray: 0, padding: { left: 4, right: 8 } },
    xaxis: {
      categories: horasGrafico,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        hideOverlappingLabels: true,
        rotate: 0,
        style: { colors: cores.eixo, fontSize: "11px", fontFamily: "var(--font-mono)" },
      },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      tickAmount: 4,
      labels: { formatter: (value) => `${Math.round(value)}`, style: { colors: cores.eixo, fontSize: "11px", fontFamily: "var(--font-mono)" } },
    },
    tooltip: {
      theme: tema,
      x: { show: true },
      y: {
        formatter: (value) => `${value} ${value === 1 ? "pedido" : "pedidos"}`,
        title: { formatter: () => "" },
      },
      marker: { show: true },
    },
    responsive: [{
      breakpoint: 560,
      options: {
        chart: { height: 230 },
        xaxis: { labels: { rotate: 0, style: { fontSize: "9px" } } },
        grid: { padding: { left: 0, right: 0 } },
      },
    }],
  }), [tema, cores]);

  useEffect(() => {
    if (!db) {
      setMetricas({ mesas: null, fila: null, alertas: null });
      setEstadoGrafico("unavailable");
      return;
    }

    const falhas = { pedidos: false, fila: false, estoque: false, mesas: false };
    const marcar = (nome, falhou) => {
      falhas[nome] = falhou;
      setErroLive(Object.values(falhas).some(Boolean));
    };
    const unsubPedidos = onSnapshot(collection(db, "pedidos"), (snap) => {
      const ativos = snap.docs.filter((doc) => doc.data().status !== "Pago").length;
      setMetricas((prev) => ({ ...prev, mesas: ativos }));
      setPedidosGrafico(snap.docs.map((doc) => ({ timestamp: doc.data().timestamp })));
      setEstadoGrafico("ready");
      marcar("pedidos", false);
    }, () => {
      setEstadoGrafico("error");
      marcar("pedidos", true);
    });

    const unsubFila = onSnapshot(collection(db, "fila"), (snap) => {
      const naFila = snap.docs
        .filter((doc) => doc.data().status === "Aguardando")
        .reduce((acc, doc) => acc + (doc.data().pessoas || 0), 0);
      setMetricas((prev) => ({ ...prev, fila: naFila }));
      marcar("fila", false);
    }, () => marcar("fila", true));

    const unsubMesas = onSnapshot(collection(db, "mesas"), (snap) => {
      const salao = normalizarMesas(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setMetricas((prev) => ({ ...prev, ocupadas: contarOcupadas(salao), salao: salao.length }));
      marcar("mesas", false);
    }, () => marcar("mesas", true));

    const unsubEstoque = onSnapshot(collection(db, "estoque"), (snap) => {
      const alertas = snap.docs.filter((doc) => doc.data().quantidadeKg <= doc.data().minimoKg).length;
      setMetricas((prev) => ({ ...prev, alertas }));
      marcar("estoque", false);
    }, () => marcar("estoque", true));

    return () => {
      unsubPedidos();
      unsubFila();
      unsubMesas();
      unsubEstoque();
    };
  }, []);

  const stats = [
    { label: "Pedidos em aberto", value: metricas.mesas, helper: "não pagos neste momento", icon: LayoutDashboard, trend: "Ao vivo", path: "/caixa", destino: "Caixa PDV" },
    { label: "Pessoas na espera", value: metricas.fila, helper: "somente fila aguardando", icon: UsersRound, trend: "Recepção", path: "/recepcao", destino: "Recepção" },
    { label: "Mesas ocupadas", value: metricas.ocupadas, helper: metricas.salao > 0 ? `de ${metricas.salao} mesas do salão` : "salão ainda não cadastrado", icon: ConciergeBell, trend: "Salão", path: "/recepcao", destino: "Recepção" },
    { label: "Itens no limite", value: metricas.alertas, helper: "no mínimo ou abaixo dele", icon: PackageSearch, trend: "Estoque", path: "/estoque", destino: "Estoque" },
  ];

  return (
    <main className="gx-dashboard">
      <header className="gx-welcome">
        <div className="gx-welcome-copy">
          <div className="gx-eyebrow">Painel de serviço</div>
          <h1>Centro de Operações</h1>
          <p>Monitoramento do salão e acesso rápido aos módulos.</p>
        </div>
        <div className="gx-date-stamp">
          <span className="gx-date-label">Hoje</span>
          <strong>{formatDate()}</strong>
            <span className={`gx-live-indicator ${erroLive || !firebaseConfigurado ? "is-warning" : ""}`}>
              <i /> {!firebaseConfigurado ? "Firebase não configurado" : erroLive ? "Conexão parcial" : "Dados em tempo real"}
          </span>
        </div>
      </header>

      <section className="gx-metrics" aria-label="Resumo da operação">
        {stats.map((item, index) => {
          const Icon = item.icon;
          const podeAbrir = Number.isFinite(item.value) && item.value > 0;
          return (
            <button
              aria-label={podeAbrir ? `${item.label}: ${item.value}. Abrir ${item.destino}.` : `${item.label}: ${item.value ?? "indisponível"}. Não há itens para abrir.`}
              className="gx-metric"
              disabled={!podeAbrir}
              key={item.label}
              onClick={() => navigate(item.path)}
              style={{ "--metric-order": index }}
              title={podeAbrir ? `Abrir ${item.destino}` : "Disponível quando houver itens"}
              type="button"
            >
              <div className="gx-metric-top">
                <span className="gx-metric-icon"><Icon size={18} strokeWidth={1.8} /></span>
                <span className="gx-metric-tag">{item.trend}</span>
              </div>
              <div className="gx-metric-value">
                {item.value === null ? (firebaseConfigurado ? <span className="gx-skeleton-value" /> : "—") : item.value}
              </div>
              <div className="gx-metric-bottom">
                <div><h2>{item.label}</h2><p>{firebaseConfigurado ? item.helper : "Indisponível sem conexão Firebase"}</p></div>
                <span className="gx-metric-arrow" aria-hidden="true">{podeAbrir ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</span>
              </div>
            </button>
          );
        })}
      </section>

      <section className="gx-main-grid">
        <article className="gx-chart-panel">
          <div className="gx-panel-heading">
            <div>
              <div className="gx-section-kicker"><BarChart3 size={14} /> Ritmo do serviço</div>
              <h2>Volume de pedidos</h2>
              <p>Pedidos registrados por hora no período selecionado.</p>
            </div>
            <div className="gx-chart-periods" role="group" aria-label="Período do gráfico">
              {periodosGrafico.map((periodo) => (
                <button
                  aria-pressed={periodoGrafico === periodo.id}
                  className={periodoGrafico === periodo.id ? "is-active" : ""}
                  data-testid={`periodo-grafico-${periodo.id}`}
                  key={periodo.id}
                  onClick={() => setPeriodoGrafico(periodo.id)}
                  type="button"
                >
                  {periodo.label}
                </button>
              ))}
            </div>
          </div>
          <div className="gx-chart-wrap" aria-live="polite">
            {estadoGrafico === "loading" && (
              <p className="gx-chart-state" data-testid="status-grafico">Carregando pedidos do Firestore…</p>
            )}
            {estadoGrafico === "unavailable" && (
              <p className="gx-chart-state" data-testid="status-grafico">O gráfico está indisponível porque o Firebase não está configurado.</p>
            )}
            {estadoGrafico === "error" && (
              <p className="gx-chart-state" data-testid="status-grafico">Não foi possível carregar os pedidos. Verifique a conexão com o Firebase.</p>
            )}
            {estadoGrafico === "ready" && dadosGrafico.totalPedidos === 0 && (
              <p className="gx-chart-state" data-testid="status-grafico">Nenhum pedido registrado neste período.</p>
            )}
            {estadoGrafico === "ready" && dadosGrafico.totalPedidos > 0 && (
              <Chart key={tema} options={chartOptions} series={chartSeries} type="area" height={280} />
            )}
          </div>
          <div className="gx-chart-foot">
            <span><Clock3 size={14} /> {periodoSelecionado.id === "hoje" ? "Hoje" : `Últimos ${periodoSelecionado.dias} dias`}</span>
            <span className="gx-chart-disclaimer" data-testid="resumo-grafico">
              {estadoGrafico === "ready"
                ? `${dadosGrafico.totalPedidos} ${dadosGrafico.totalPedidos === 1 ? "pedido" : "pedidos"} no período`
                : estadoGrafico === "loading"
                  ? "Carregando dados"
                  : estadoGrafico === "error"
                    ? "Falha ao carregar dados"
                    : "Sem conexão com Firebase"}
            </span>
          </div>
        </article>

        <aside className="gx-ops-note">
          <div className="gx-note-top">
            <span className="gx-note-icon"><Radio size={17} /></span>
            <span className="gx-note-status"><i /> Operação</span>
          </div>
          <div className="gx-note-copy">
            <span className="gx-section-kicker">Visão geral</span>
            <h2>Controlando<br />e organizando<br /><em>Seu restaurante.</em></h2>
            <p>Pedidos, recepção e insumos reunidos para a equipe agir no tempo certo.</p>
          </div>
          <div className="gx-note-footer"><span>Gaúcho Express</span><span>Painel</span></div>
        </aside>
      </section>

      <section className="gx-modules">
        <header className="gx-modules-heading">
          <div>
            <div className="gx-section-kicker">Estações da casa</div>
            <h2>Acesso rápido</h2>
          </div>
          <span className="gx-modules-caption">Escolha um módulo para continuar</span>
        </header>
        <div className="gx-module-list">
          {modulos.map((mod, index) => {
            const Icon = mod.icon;
            return (
              <button className="gx-module" key={mod.path} onClick={() => navigate(mod.path)}>
                <span className="gx-module-number">{mod.id}</span>
                <span className="gx-module-icon"><Icon size={19} strokeWidth={1.7} /></span>
                <span className="gx-module-copy"><strong>{mod.titulo}</strong><small>{mod.desc}</small></span>
                <span className="gx-module-open">{index === 0 ? <ArrowUpRight size={16} /> : <ArrowRight size={16} />}</span>
              </button>
            );
          })}
        </div>
      </section>
      <footer className="gx-dashboard-footer">
        <span>Gaúcho Express <i>·</i> Copyright © 2026 Todos os direitos reservados</span>
        <span>Projeto de faculdade</span>
      </footer>
    </main>
  );
}
