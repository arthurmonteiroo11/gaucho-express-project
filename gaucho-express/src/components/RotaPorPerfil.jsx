import { Navigate } from "react-router-dom";
import { podeAcessar, rotaInicial } from "../config/perfis";

export function RotaPorPerfil({ perfil, caminho, children }) {
  if (podeAcessar(perfil, caminho)) return children;
  const destino = rotaInicial(perfil);
  return destino ? <Navigate to={destino} replace /> : null;
}
