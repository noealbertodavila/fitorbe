import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { HeartPulse, Dumbbell, Utensils, MessageSquare, DollarSign, Sparkles, ShieldCheck, Smartphone, Store } from "lucide-react";

/**
 * Página de inicio de Fitorbe: la plataforma para coaches de bienestar y entrenamiento.
 * Cada coach se registra, agrega a sus clientes y los acompaña desde aquí.
 */
const em = "#10B981";
const dark = "#0A0F0D";
const dark2 = "#0F1A14";
const syne = "'Syne', sans-serif";

const FUNCIONES = [
  { icon: HeartPulse, t: "Bienestar emocional", d: "Check-in diario de ánimo, energía y sueño, diario personal y alertas cuando un cliente necesita apoyo." },
  { icon: Dumbbell, t: "Rutinas", d: "Arma rutinas semanales o pídele una propuesta a la IA, revísala y apruébala en minutos." },
  { icon: Utensils, t: "Planes de comida", d: "Planes semanales con los alimentos que tu cliente sí come, con calorías y lista de compras." },
  { icon: MessageSquare, t: "Mensajes", d: "Chat directo con cada cliente, en la app, sin mezclar con tu WhatsApp personal." },
  { icon: DollarSign, t: "Pagos", d: "Registra cobros, ve quién está al día y quién debe, e imprime recibos." },
  { icon: Store, t: "Tu marca", d: "Tus clientes ven el nombre y el logo de tu negocio, no el nuestro." },
];

const PASOS = [
  ["Crea tu cuenta", "En 2 minutos, con 14 días gratis y sin tarjeta."],
  ["Agrega a tus clientes", "Les creas su acceso y les compartes sus datos para entrar."],
  ["Acompáñalos", "Ellos registran cómo se sienten y su avance; tú ajustas su plan."],
];

export default function Landing() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    document.title = "Fitorbe · La app para coaches de bienestar y entrenamiento";
  }, []);
  const panel = user ? (user.rol === "admin" ? "/admin" : user.rol === "coach" ? "/coach" : "/cliente") : null;

  const boton = { background: em, color: "#000", border: "none", borderRadius: 50, padding: "16px 28px", fontWeight: 800, fontSize: 16, cursor: "pointer", textDecoration: "none", display: "inline-block" } as const;
  const h2 = { fontFamily: syne, fontSize: "clamp(26px,3.2vw,38px)", fontWeight: 800, lineHeight: 1.15, margin: "0 0 14px" } as const;
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: dark, color: "#ECFDF5", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`.fo-tres{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:900px){.fo-tres{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.fo-tres{grid-template-columns:1fr}}`}</style>
      <nav aria-label="Principal" style={{ maxWidth: 1150, margin: "0 auto", padding: "18px clamp(16px,4vw,40px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontFamily: syne, fontWeight: 800, fontSize: 24 }}>Fit<span style={{ color: em }}>orbe</span></span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {panel ? (
            <button onClick={() => navigate(panel)} style={{ ...boton, padding: "10px 18px", fontSize: 14 }}>Ir a mi panel →</button>
          ) : (
            <>
              <a href="/login" style={{ color: em, fontWeight: 700, padding: "10px 14px", minHeight: 44, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Iniciar sesión</a>
              <a href="/registro" style={{ ...boton, padding: "10px 18px", fontSize: 14 }}>Prueba gratis</a>
            </>
          )}
        </div>
      </nav>

      <main>
        <section style={{ background: `radial-gradient(ellipse at 75% 10%, ${em}22, transparent 55%)`, padding: "64px clamp(16px,4vw,40px) 80px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <span style={{ display: "inline-block", background: `${em}1F`, border: `1px solid ${em}66`, color: em, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 20 }}>
              PARA COACHES DE BIENESTAR Y ENTRENAMIENTO
            </span>
            <h1 style={{ fontFamily: syne, fontSize: "clamp(32px,4.2vw,52px)", fontWeight: 800, lineHeight: 1.06, margin: "0 0 20px", textWrap: "balance" }}>
              Acompaña a tus clientes en <span style={{ color: em }}>cuerpo y mente</span>, desde una sola app.
            </h1>
            <p style={{ fontSize: "clamp(17px,2vw,20px)", color: "rgba(236,253,245,0.75)", lineHeight: 1.6, maxWidth: 680, margin: "0 auto 28px" }}>
              Rutinas, planes de comida, seguimiento emocional, mensajes y pagos de cada cliente, con tu marca. Tus clientes entran a su propia app y tú ves cómo van.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/registro" style={boton}>Empieza gratis 14 días</a>
              <a href="#funciones" style={{ ...boton, background: "transparent", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)" }}>Ver qué incluye</a>
            </div>
            <p style={{ marginTop: 14, fontSize: 14, color: "rgba(236,253,245,0.55)" }}>Sin tarjeta. En español e inglés.</p>
          </div>
        </section>

        <section id="funciones" style={{ background: "#fff", color: "#0A0F0D", padding: "80px clamp(16px,4vw,40px)", scrollMarginTop: 20 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={h2}>Todo lo que necesitas para acompañar a cada cliente</h2>
            <p style={{ color: "#4B5563", fontSize: 18, maxWidth: 680, margin: "0 0 36px", lineHeight: 1.6 }}>Pensado para coaches que trabajan lo emocional y lo físico juntos.</p>
            <div className="fo-tres" style={{ display: "grid", gap: 18 }}>
              {FUNCIONES.map(({ icon: Icon, t, d }) => (
                <div key={t} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 16, padding: 24 }}>
                  <Icon aria-hidden="true" size={26} color={em} />
                  <h3 style={{ fontFamily: syne, fontSize: 19, fontWeight: 700, margin: "12px 0 8px" }}>{t}</h3>
                  <p style={{ color: "#4B5563", fontSize: 15, lineHeight: 1.6, margin: 0 }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "80px clamp(16px,4vw,40px)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ ...h2, textAlign: "center", marginBottom: 40 }}>Empieza hoy</h2>
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              {PASOS.map(([t, d], i) => (
                <li key={t} style={{ background: dark2, border: `1px solid ${em}33`, borderRadius: 18, padding: 26 }}>
                  <div style={{ fontFamily: syne, color: em, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>0{i + 1}</div>
                  <div style={{ fontWeight: 700, fontSize: 19, marginBottom: 6 }}>{t}</div>
                  <p style={{ color: "rgba(236,253,245,0.7)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section style={{ background: dark2, padding: "64px clamp(16px,4vw,40px)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {[
              [ShieldCheck, "Los datos de tus clientes son tuyos", "Cada coach ve solo a sus clientes. Ni otros coaches ni el equipo de Fitorbe ven sus rutinas, su ánimo, su diario ni sus fotos."],
              [Sparkles, "IA que te ayuda, tú decides", "La inteligencia artificial propone rutinas y planes; tú los revisas y apruebas antes de que le lleguen a tu cliente."],
              [Smartphone, "Funciona en el celular", "Tus clientes la usan desde el teléfono, sin descargar nada de la tienda."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div key={t as string}>
                  <I aria-hidden="true" size={26} color={em} />
                  <h3 style={{ fontWeight: 700, fontSize: 18, margin: "10px 0 6px" }}>{t as string}</h3>
                  <p style={{ color: "rgba(236,253,245,0.7)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>{d as string}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ padding: "80px clamp(16px,4vw,40px)", textAlign: "center" }}>
          <h2 style={h2}>Prueba Fitorbe gratis 14 días</h2>
          <p style={{ color: "rgba(236,253,245,0.7)", fontSize: 17, margin: "0 0 26px" }}>Crea tu cuenta, agrega a tus primeros clientes y ve cómo te funciona.</p>
          <a href="/registro" style={boton}>Crear mi cuenta</a>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid rgba(16,185,129,0.12)", padding: "28px clamp(16px,4vw,40px)", textAlign: "center", fontSize: 13, color: "rgba(236,253,245,0.55)" }}>
        <p style={{ margin: "0 0 8px" }}>Fitorbe es una plataforma para coaches. El servicio de coaching lo da cada coach. No es terapia ni atención médica. Si estás en crisis, llama o escribe al 988.</p>
        <p style={{ margin: 0 }}>© 2026 Fitorbe · <a href="/privacidad" style={{ color: "inherit" }}>Privacidad</a> · <a href="/terminos" style={{ color: "inherit" }}>Términos</a></p>
      </footer>
    </div>
  );
}
