import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import "./index.css";
import "./styles/Layout.css";
import "./styles/Sidebar.css";

try {
  document.documentElement.setAttribute("data-theme", localStorage.getItem("tema") || "light");
} catch {
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);