import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Si el servidor responde que el servicio está en pausa (prueba vencida,
 * coach suspendido o el coach del cliente en pausa), muestra un aviso claro
 * en lugar de pantallas vacías o errores.
 */
type Pausa = { code: "PRUEBA_VENCIDA" | "COACH_SUSPENDIDO" | "SERVICIO_PAUSADO"; error: string };

let instalado = false;
function instalarDetector() {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await original(...args);
    if (res.status === 403) {
      res
        .clone()
        .json()
        .then((d) => {
          if (d && ["PRUEBA_VENCIDA", "COACH_SUSPENDIDO", "SERVICIO_PAUSADO"].includes(d.code)) {
            window.dispatchEvent(new CustomEvent("fitorbe:pausa", { detail: d }));
          }
        })
        .catch(() => {});
    }
    return res;
  };
}
instalarDetector();

export default function PausaServicio() {
  const { user, logout } = useAuth();
  const [pausa, setPausa] = useState<Pausa | null>(null);
  useEffect(() => {
    const fn = (e: Event) => setPausa((e as CustomEvent<Pausa>).detail);
    window.addEventListener("fitorbe:pausa", fn);
    return () => window.removeEventListener("fitorbe:pausa", fn);
  }, []);
  if (!pausa || !user) return null;
  const titulo =
    pausa.code === "PRUEBA_VENCIDA" ? "Tu prueba gratis terminó" : pausa.code === "COACH_SUSPENDIDO" ? "Tu cuenta está suspendida" : "Servicio en pausa";
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="pausa-titulo" className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 text-center space-y-4">
        <h2 id="pausa-titulo" className="text-xl font-bold text-white">{titulo}</h2>
        <p className="text-muted-foreground">{pausa.error}</p>
        {pausa.code === "PRUEBA_VENCIDA" && (
          <p className="text-sm text-muted-foreground">Muy pronto podrás pagar aquí con tarjeta. Mientras tanto, escríbenos y te activamos la cuenta.</p>
        )}
        <div className="flex flex-col gap-2">
          <a href="mailto:admin@nexuvoltsolutions.com?subject=Fitorbe" className="min-h-[44px] flex items-center justify-center rounded-lg bg-primary text-black font-bold">
            Escribir a Fitorbe
          </a>
          <button onClick={logout} className="min-h-[44px] rounded-lg border border-border text-muted-foreground">Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}
