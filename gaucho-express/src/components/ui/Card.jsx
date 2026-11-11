import "../../styles/MinimalUI.css";

export function Card({ children, hoverable = false, onClick, className = "", id, ...rest }) {
  const interativo = typeof onClick === "function";
  const baseClass = ["mds-card", hoverable && "mds-card-hoverable", className].filter(Boolean).join(" ");

  const aoPressionarTecla = (evento) => {
    if (evento.target !== evento.currentTarget) return;
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      onClick(evento);
    }
  };

  return (
    <div
      id={id}
      className={baseClass}
      onClick={onClick}
      role={interativo ? "button" : undefined}
      tabIndex={interativo ? 0 : undefined}
      onKeyDown={interativo ? aoPressionarTecla : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
