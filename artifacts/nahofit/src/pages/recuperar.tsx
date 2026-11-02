import { useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { Loader2, Eye, EyeOff } from "lucide-react";

/**
 * ¿Olvidaste tu contraseña?
 * - Sin token: la persona escribe su correo y le llega un enlace.
 * - Con ?token=… (el enlace del correo): escribe su contraseña nueva.
 */
export default function Recuperar() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  return (
    <Marco>
      {token ? <NuevaClave token={token} /> : <PedirEnlace />}
    </Marco>
  );
}

function PedirEnlace() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const r = await customFetch<{ mensaje: string }>("/api/auth/recuperar", { method: "POST", body: JSON.stringify({ email }) });
      setListo(r.mensaje);
    } catch (err: any) {
      setError(err?.message || "No se pudo mandar el enlace. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <>
        <h1 style={titulo}>Revisa tu correo</h1>
        <p style={texto}>{listo}</p>
        <a href="/login" style={{ ...boton(false), textDecoration: "none" }}>Volver a entrar</a>
      </>
    );
  }

  return (
    <form onSubmit={enviar} noValidate>
      <h1 style={titulo}>¿Olvidaste tu contraseña?</h1>
      <p style={texto}>Escribe el correo con el que entras a Fitorbe y te mandamos un enlace para crear una nueva.</p>
      {error && <div style={aviso}>{error}</div>}
      <label htmlFor="rec-email" style={etiqueta}>Correo electrónico</label>
      <input
        id="rec-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ ...entrada, marginBottom: 20 }}
      />
      <button type="submit" disabled={enviando || !email.trim()} style={boton(enviando)}>
        {enviando && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
        {enviando ? "Enviando..." : "MANDAR ENLACE"}
      </button>
      <p style={{ ...texto, marginTop: 16, marginBottom: 0, textAlign: "center" }}>
        <a href="/login" style={enlace}>Volver a entrar</a>
      </p>
    </form>
  );
}

function NuevaClave({ token }: { token: string }) {
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (clave.length < 8) return setError("La contraseña necesita al menos 8 caracteres.");
    if (clave !== repetir) return setError("Las dos contraseñas no coinciden.");
    setGuardando(true);
    try {
      const r = await customFetch<{ mensaje: string }>("/api/auth/restablecer", { method: "POST", body: JSON.stringify({ token, password: clave }) });
      setListo(r.mensaje);
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  if (listo) {
    return (
      <>
        <h1 style={titulo}>Contraseña guardada</h1>
        <p style={texto}>{listo}</p>
        <a href="/login" style={{ ...boton(false), textDecoration: "none" }}>ENTRAR</a>
      </>
    );
  }

  return (
    <form onSubmit={guardar} noValidate>
      <h1 style={titulo}>Crea tu contraseña nueva</h1>
      <p style={texto}>Usa al menos 8 caracteres.</p>
      {error && <div style={aviso}>{error}</div>}
      <label htmlFor="rec-clave" style={etiqueta}>Contraseña nueva</label>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <input
          id="rec-clave"
          type={ver ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          style={{ ...entrada, paddingRight: 46 }}
        />
        <button type="button" aria-label={ver ? "Ocultar contraseña" : "Ver contraseña"} onClick={() => setVer((v) => !v)} style={ojo}>
          {ver ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <label htmlFor="rec-repetir" style={etiqueta}>Repite la contraseña</label>
      <input
        id="rec-repetir"
        type={ver ? "text" : "password"}
        autoComplete="new-password"
        required
        value={repetir}
        onChange={(e) => setRepetir(e.target.value)}
        style={{ ...entrada, marginBottom: 20 }}
      />
      <button type="submit" disabled={guardando} style={boton(guardando)}>
        {guardando && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
        {guardando ? "Guardando..." : "GUARDAR CONTRASEÑA"}
      </button>
      <p style={{ ...texto, marginTop: 16, marginBottom: 0, textAlign: "center" }}>
        ¿El enlace venció? <a href="/recuperar" style={enlace}>Pide uno nuevo</a>
      </p>
    </form>
  );
}

/** Mismo fondo, logo y tarjeta que la pantalla de entrada. */
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#0C1311",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px 32px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 8vw, 44px)", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1 }}>
          <span style={{ color: "#ECFDF5" }}>Fit</span>
          <span style={{ color: "#10B981" }}>orbe</span>
        </div>
      </div>
      <div
        style={{
          background: "#161D1A",
          border: "0.5px solid #1A2E20",
          borderRadius: 16,
          padding: "clamp(20px, 5vw, 32px) clamp(18px, 5vw, 28px)",
          width: "100%",
          maxWidth: 400,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #2D5240; }
        input:focus { border-color: #10B981 !important; }
      `}</style>
    </div>
  );
}

const titulo: React.CSSProperties = { color: "#ECFDF5", fontSize: 20, fontWeight: 700, margin: "0 0 8px" };
const texto: React.CSSProperties = { color: "#9CB8A8", fontSize: 14, lineHeight: 1.5, margin: "0 0 18px" };
const etiqueta: React.CSSProperties = { display: "block", fontSize: 12, color: "#4B7A5E", marginBottom: 6, letterSpacing: "0.3px" };
const enlace: React.CSSProperties = { color: "#10B981", fontWeight: 700 };
const entrada: React.CSSProperties = {
  width: "100%",
  background: "#0C1311",
  border: "0.5px solid #1A2E20",
  borderRadius: 10,
  padding: "14px 16px",
  color: "#ECFDF5",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};
const aviso: React.CSSProperties = {
  background: "#EF444415",
  border: "0.5px solid #EF444440",
  color: "#FCA5A5",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 13,
  marginBottom: 16,
  lineHeight: 1.4,
};
const ojo: React.CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  color: "#4B7A5E",
  cursor: "pointer",
  padding: 4,
  display: "flex",
};
const boton = (ocupado: boolean): React.CSSProperties => ({
  width: "100%",
  background: ocupado ? "#059669" : "#10B981",
  color: "#000",
  border: "none",
  borderRadius: 10,
  padding: 15,
  fontSize: 15,
  fontWeight: 700,
  cursor: ocupado ? "not-allowed" : "pointer",
  opacity: ocupado ? 0.8 : 1,
  letterSpacing: "1px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 50,
  boxSizing: "border-box",
});
