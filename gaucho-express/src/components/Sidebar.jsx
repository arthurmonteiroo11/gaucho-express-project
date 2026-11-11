import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { podeAcessar, rotuloDoPerfil } from "../config/perfis";
import "../styles/Sidebar.css";

const ITENS_MENU = [
  { to: "/", rotulo: "Dashboard", end: true },
  { to: "/atendimento", rotulo: "Atendimento" },
  { to: "/kds", rotulo: "Cozinha KDS" },
  { to: "/estoque", rotulo: "Estoque" },
  { to: "/recepcao", rotulo: "Recepção" },
  { to: "/caixa", rotulo: "Caixa PDV" },
];

export function Sidebar({ menuAberto, setMenuAberto, usuario, perfil }) {
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem("tema") || "light";
    } catch {
      return "light";
    }
  });
  const navigate = useNavigate();
  const nomeExibido =
    usuario?.displayName?.trim() || usuario?.email?.trim() || "Usuário autenticado";
  const fonteAvatar =
    usuario?.displayName?.trim() || usuario?.email?.split("@")[0]?.trim() || "";
  const iniciais =
    fonteAvatar
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase() || "?";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    try {
      localStorage.setItem("tema", tema);
    } catch {
    }
  }, [tema]);

  const alternarTema = () => setTema(tema === "light" ? "dark" : "light");

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
    } catch (error) {
      console.error("Falha ao sair:", error);
    }
    navigate("/login");
  };

  const fecharMobile = () => {
    if (window.innerWidth <= 768) {
      setMenuAberto(false);
    }
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${menuAberto ? "visivel" : ""}`} 
        onClick={() => setMenuAberto(false)}
        aria-hidden="true"
      />

      <aside id="sidebar" className={`sidebar-container ${menuAberto ? "aberto" : ""}`}>
        <div className="sidebar-logo">
          <h2>Gaúcho<span>Express</span></h2>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {ITENS_MENU.filter((item) => podeAcessar(perfil, item.to)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-item ativo" : "nav-item")}
              onClick={fecharMobile}
            >
              <span className="nav-label">{item.rotulo}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle-sidebar" onClick={alternarTema}>
            {tema === "light" ? "Modo Escuro" : "Modo Claro"}
          </button>

          <div className="user-profile">
            <div className="avatar" aria-hidden="true">{iniciais}</div>
            <div className="user-info">
              <strong data-testid="text-authenticated-user">{nomeExibido}</strong>
              {perfil && <span>{rotuloDoPerfil(perfil)}</span>}
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}