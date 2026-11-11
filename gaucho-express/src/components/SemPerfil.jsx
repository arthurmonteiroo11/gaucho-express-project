import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { Button } from "./ui/Button";
import "../styles/Acesso.css";

export function SemPerfil({ usuario }) {
  const sair = async () => {
    try {
      if (auth) await signOut(auth);
    } catch (error) {
      console.error("Falha ao sair:", error);
    }
  };

  return (
    <main className="acesso-container">
      <section className="acesso-card" aria-labelledby="acesso-titulo">
        <p className="acesso-marca">
          Gaúcho<span>Express</span>
        </p>
        <h1 id="acesso-titulo">Acesso ainda não liberado</h1>
        <p className="acesso-texto">
          Sua conta ({usuario?.email}) entrou no sistema, mas ainda não tem um perfil de acesso.
          Peça ao gerente para liberar, informando o código abaixo.
        </p>
        <code className="acesso-codigo" aria-label="Código do usuário">{usuario?.uid}</code>
        <Button variant="secondary" onClick={sair}>
          Sair
        </Button>
      </section>
    </main>
  );
}
