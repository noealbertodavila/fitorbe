import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root")!;

try {
  createRoot(rootEl).render(<App />);
} catch (err) {
  console.error("Fatal error mounting app:", err);
  rootEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0A0F0D;font-family:Inter,sans-serif;text-align:center;padding:20px">
      <div>
        <h2 style="color:#fff;margin-bottom:8px">Fitorbe</h2>
        <p style="color:#A8B3AE;margin-bottom:20px">Ocurrió un error al iniciar la aplicación.</p>
        <button onclick="location.reload()" style="background:#10B981;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;margin-right:10px">Recargar</button>
        <button onclick="localStorage.removeItem('nahofit_auth_token');location.href='/'" style="background:transparent;color:#A8B3AE;border:1px solid #2B3632;padding:10px 24px;border-radius:6px;cursor:pointer">Ir al login</button>
      </div>
    </div>`;
}
