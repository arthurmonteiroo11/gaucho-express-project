import { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, hasFirebaseConfig } from "./config/firebase";
import { Sidebar } from "./components/Sidebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RotaPorPerfil } from "./components/RotaPorPerfil";
import { SemPerfil } from "./components/SemPerfil";
import { usePerfil } from "./hooks/usePerfil";
import { rotaInicial } from "./config/perfis";
import { Login } from "./pages/Login";
import "./styles/Layout.css";

const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Atendimento = lazy(() => import("./pages/Atendimento").then((m) => ({ default: m.Atendimento })));
const Cozinha = lazy(() => import("./pages/Cozinha").then((m) => ({ default: m.Cozinha })));
const Estoque = lazy(() => import("./pages/Estoque").then((m) => ({ default: m.Estoque })));
const Recepcao = lazy(() => import("./pages/Recepcao").then((m) => ({ default: m.Recepcao })));
const Caixa = lazy(() => import("./pages/Caixa").then((m) => ({ default: m.Caixa })));
const AcompanharFila = lazy(() => import("./pages/AcompanharFila").then((m) => ({ default: m.AcompanharFila })));

const TITULOS = {
  "/": "Painel do Restaurante",
  "/atendimento": "Comanda Operacional",
  "/kds": "Cozinha KDS",
  "/estoque": "Controle de Estoque",
  "/recepcao": "Fila de Recepção",
  "/caixa": "Terminal de Caixa PDV",
};

function RotaProtegida({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroAutenticacao, setErroAutenticacao] = useState(false);

  useEffect(() => {
    if (!auth) {
      setCarregando(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUsuario(user);
        setErroAutenticacao(false);
        setCarregando(false);
      },
      () => {
        setUsuario(null);
        setErroAutenticacao(true);
        setCarregando(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (!hasFirebaseConfig || !auth) {
    return <Navigate to="/login" replace />;
  }

  if (carregando) {
    return <div className="loading-screen">Carregando painel de controle...</div>;
  }

  if (erroAutenticacao) {
    return (
      <div className="loading-screen" role="alert">
        Não foi possível verificar sua sessão. Recarregue a página e tente novamente.
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children(usuario);
}

function LayoutComHeader({ usuario }) {
  const { perfil, carregando, erro } = usePerfil(usuario);
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  const tituloAtual = TITULOS[location.pathname] || "Painel de Controle";

  useEffect(() => {
    document.title = `${tituloAtual} · Gaúcho Express`;
  }, [tituloAtual]);

  if (carregando) {
    return <div className="loading-screen">Verificando seu acesso...</div>;
  }

  if (erro) {
    return (
      <div className="loading-screen" role="alert">
        Não foi possível verificar suas permissões. Recarregue a página e tente novamente.
      </div>
    );
  }

  if (!perfil) {
    return <SemPerfil usuario={usuario} />;
  }

  return (
    <div className="app-layout">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>

      <Sidebar
        menuAberto={menuAberto}
        setMenuAberto={setMenuAberto}
        usuario={usuario}
        perfil={perfil}
      />

      <div className="app-content">
        <header className="top-header">
          <button
            type="button"
            className="menu-hamburguer"
            onClick={() => setMenuAberto(!menuAberto)}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            aria-controls="sidebar"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="header-breadcrumbs">
            <span>Início</span> / <strong className="active">{tituloAtual}</strong>
          </div>

          <div className="header-search">
            <input type="text" placeholder="Pesquisar itens, pedidos..." aria-label="Pesquisar" />
          </div>
        </header>

        <div className="page-body" id="conteudo" tabIndex={-1}>
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<div className="page-loading" role="status">Carregando…</div>}>
              <Routes>
                <Route path="/" element={<RotaPorPerfil perfil={perfil} caminho="/"><Dashboard /></RotaPorPerfil>} />
                <Route path="/atendimento" element={<RotaPorPerfil perfil={perfil} caminho="/atendimento"><Atendimento /></RotaPorPerfil>} />
                <Route path="/kds" element={<RotaPorPerfil perfil={perfil} caminho="/kds"><Cozinha /></RotaPorPerfil>} />
                <Route path="/estoque" element={<RotaPorPerfil perfil={perfil} caminho="/estoque"><Estoque /></RotaPorPerfil>} />
                <Route path="/recepcao" element={<RotaPorPerfil perfil={perfil} caminho="/recepcao"><Recepcao /></RotaPorPerfil>} />
                <Route path="/caixa" element={<RotaPorPerfil perfil={perfil} caminho="/caixa"><Caixa /></RotaPorPerfil>} />
                <Route path="*" element={<Navigate to={rotaInicial(perfil)} replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/fila/:ticketId"
          element={
            <ErrorBoundary>
              <Suspense fallback={<div className="loading-screen">Carregando…</div>}>
                <AcompanharFila />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/*"
          element={
            <RotaProtegida>
              {(usuario) => <LayoutComHeader usuario={usuario} />}
            </RotaProtegida>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
