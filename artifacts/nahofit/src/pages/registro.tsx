import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

/** Registro de coaches: crean su cuenta solos con 14 días de prueba gratis, sin tarjeta. */
export default function Registro() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [f, setF] = useState({ nombre: "", negocio: "", email: "", telefono: "", password: "", acepta: false, empresa: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (f.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/auth/registro-coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "No se pudo crear la cuenta. Intenta de nuevo.");
        return;
      }
      login(d.token, d.usuario);
      setLocation("/coach");
    } catch {
      setError("No se pudo crear la cuenta. Revisa tu conexión.");
    } finally {
      setEnviando(false);
    }
  }

  const campo = { width: "100%", minHeight: 48, padding: "10px 14px", borderRadius: 10, border: "1px solid #1F3A2B", background: "#0F1A14", color: "#ECFDF5", fontSize: 16, fontFamily: "inherit" } as const;
  const etiqueta = { display: "block", fontSize: 13, fontWeight: 600, color: "#86B49B", marginBottom: 6 } as const;
  return (
    <div style={{ minHeight: "100vh", background: "#0A0F0D", color: "#ECFDF5", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <main style={{ width: "100%", maxWidth: 460 }}>
        <a href="/" style={{ display: "block", textAlign: "center", textDecoration: "none", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 36, marginBottom: 8 }}>
          <span style={{ color: "#ECFDF5" }}>Fit</span><span style={{ color: "#10B981" }}>orbe</span>
        </a>
        <h1 style={{ textAlign: "center", fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Crea tu cuenta de coach</h1>
        <p style={{ textAlign: "center", color: "#86B49B", margin: "0 0 24px" }}>14 días gratis. Sin tarjeta.</p>
        <form onSubmit={enviar} noValidate style={{ background: "#0F1A14", border: "1px solid #1F3A2B", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label htmlFor="r-nombre" style={etiqueta}>Tu nombre</label><input id="r-nombre" required autoComplete="name" style={campo} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
          <div><label htmlFor="r-negocio" style={etiqueta}>Nombre de tu negocio (lo verán tus clientes)</label><input id="r-negocio" autoComplete="organization" placeholder="Ej.: Coaching con Ana" style={campo} value={f.negocio} onChange={(e) => setF({ ...f, negocio: e.target.value })} /></div>
          <div><label htmlFor="r-email" style={etiqueta}>Correo</label><input id="r-email" type="email" required autoComplete="email" style={campo} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label htmlFor="r-tel" style={etiqueta}>WhatsApp o teléfono (opcional)</label><input id="r-tel" type="tel" autoComplete="tel" style={campo} value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
          <div><label htmlFor="r-pass" style={etiqueta}>Contraseña (mínimo 8 caracteres)</label><input id="r-pass" type="password" required minLength={8} autoComplete="new-password" style={campo} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
          <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="r-empresa">Empresa</label><input id="r-empresa" tabIndex={-1} autoComplete="off" value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} />
          </div>
          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 14, color: "#C6E3D3", lineHeight: 1.5 }}>
            <input type="checkbox" checked={f.acepta} onChange={(e) => setF({ ...f, acepta: e.target.checked })} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#10B981" }} />
            <span>Acepto los <a href="/terminos" target="_blank" style={{ color: "#10B981" }}>Términos</a> y la <a href="/privacidad" target="_blank" style={{ color: "#10B981" }}>Política de privacidad</a>.</span>
          </label>
          {error && <p role="alert" style={{ color: "#F87171", fontSize: 15, fontWeight: 600, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={enviando || !f.acepta || !f.nombre || !f.email}
            style={{ minHeight: 50, borderRadius: 12, border: "none", background: "#10B981", color: "#000", fontWeight: 800, fontSize: 16, cursor: "pointer", opacity: enviando || !f.acepta || !f.nombre || !f.email ? 0.55 : 1 }}>
            {enviando ? "Creando tu cuenta…" : "Empezar gratis"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, color: "#86B49B" }}>¿Ya tienes cuenta? <a href="/login" style={{ color: "#10B981", fontWeight: 700 }}>Inicia sesión</a></p>
      </main>
    </div>
  );
}
