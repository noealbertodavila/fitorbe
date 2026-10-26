import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root")!;

try {
  createRoot(rootEl).render(<App />);
} catch (err) {
  console.error("Fatal error mounting app:", err);
  const w = window as unknown as { fitorbeError?: (t: string, m: string) => void };
  if (w.fitorbeError) w.fitorbeError("Fitorbe", "Ocurrió un error al iniciar la aplicación.");
  else rootEl.textContent = "Ocurrió un error al iniciar la aplicación. Recarga la página.";
}
