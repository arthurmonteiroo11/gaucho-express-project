import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, hasFirebaseConfig, missingFirebaseConfig } from "../config/firebase";
import "../styles/Login.css";

const MENSAGENS_ERRO = {
  "auth/invalid-credential": "Não encontramos uma conta com esse e-mail e senha. Confira os dados e tente novamente.",
  "auth/invalid-login-credentials": "Não encontramos uma conta com esse e-mail e senha. Confira os dados e tente novamente.",
  "auth/wrong-password": "Não encontramos uma conta com esse e-mail e senha. Confira os dados e tente novamente.",
  "auth/user-not-found": "Não encontramos uma conta com esse e-mail e senha. Confira os dados e tente novamente.",
  "auth/invalid-email": "Esse e-mail não parece válido. Use o formato nome@empresa.com.",
  "auth/user-disabled": "Esta conta está desativada. Fale com o administrador do sistema.",
  "auth/too-many-requests": "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com o servidor. Verifique a internet e tente de novo.",
};

const MENSAGEM_PADRAO = "Não foi possível entrar agora. Tente novamente em instantes.";

export function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (usuario) => {
      if (usuario) navigate("/", { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");

    if (!auth || !hasFirebaseConfig) {
      setErro(`O Firebase não está configurado. Variáveis faltando: ${missingFirebaseConfig.join(", ")}`);
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Falha no login:", error?.code);
      setErro(MENSAGENS_ERRO[error?.code] ?? MENSAGEM_PADRAO);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Gaúcho<span>Express</span></h1>
          <p>Acesso Corporativo</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {!hasFirebaseConfig && (
            <div className="login-erro" role="alert">
              O Firebase não está configurado. Variáveis faltando: {missingFirebaseConfig.join(", ")}.
              Confira o arquivo .env (ao lado do package.json) ou as variáveis de ambiente da Vercel.
            </div>
          )}
          {erro && hasFirebaseConfig && <div className="login-erro" role="alert">{erro}</div>}

          <div className="input-group">
            <label htmlFor="login-email">E-mail Institucional</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@restaurante.com"
              disabled={!hasFirebaseConfig || loading}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-senha">Senha de Acesso</label>
            <input
              id="login-senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={!hasFirebaseConfig || loading}
              required
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading || !hasFirebaseConfig}>
            {loading ? "Autenticando..." : "Entrar no Sistema"}
          </button>
        </form>
      </div>
    </main>
  );
}
