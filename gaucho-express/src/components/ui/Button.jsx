import "../../styles/MinimalUI.css";

export function Button({
  children,
  variant = "primary",
  onClick,
  disabled,
  loading,
  className = "",
  type = "button",
  ...rest
}) {
  const baseClass = `mds-btn mds-btn-${variant} ${className}`.trim();

  return (
    <button
      type={type}
      className={baseClass}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? "Processando..." : children}
    </button>
  );
}
