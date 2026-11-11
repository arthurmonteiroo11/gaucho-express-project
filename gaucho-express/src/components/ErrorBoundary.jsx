import "../styles/MinimalUI.css";
import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { erro: null };

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error("Falha de renderização:", erro, info?.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="loading-screen" role="alert">
        <p>Algo deu errado ao exibir esta tela. Seus dados não foram alterados.</p>
        <button type="button" className="mds-btn mds-btn-primary" onClick={() => window.location.reload()}>
          Recarregar a página
        </button>
      </div>
    );
  }
}
