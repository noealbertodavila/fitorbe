import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { MessageCircle } from "lucide-react";

/**
 * Página de inicio de NAHOFIT.LIFE — "Entrena tu cuerpo, cuida tu mente".
 * Coaching de bienestar emocional + entrenamiento con Nahomy. Ojo: en Utah,
 * sin licencia de salud mental no se puede ofrecer "terapia"; aquí se habla
 * siempre de coaching emocional y se aclara en Preguntas frecuentes.
 */
type Lang = "es" | "en";

const T = {
  es: {
    nav: [["bienestar", "Bienestar emocional"], ["entrenamiento", "Cuerpo"], ["planes", "Planes"], ["sobre-nahomy", "Nahomy"], ["preguntas", "Preguntas"]],
    nav_login: "Iniciar sesión", nav_cta: "Agenda tu sesión", nav_panel: "Ir a mi panel →",
    hero_tag: "COACHING EMOCIONAL · CON ENTRENAMIENTO · EN ESPAÑOL",
    hero_t1: "Cuida tu mente,", hero_t2: "y tu cuerpo ", hero_green: "te sigue.",
    hero_sub: "Coaching emocional con Nahomy, en línea y en español. Empezamos por cómo te sientes —estrés, autoestima, hábitos— y el entrenamiento y la comida acompañan tu proceso.",
    hero_btn1: "Agenda tu primera sesión", hero_btn2: "Ver planes",
    hero_note: "Primera sesión de 30 minutos por video: $35",
    bien_tag: "BIENESTAR EMOCIONAL",
    bien_title: "Lo primero eres tú: cómo te sientes",
    bien_sub: "El cambio que dura empieza por dentro. En las sesiones de coaching emocional trabajas con Nahomy lo que hoy te pesa, en un espacio sin juicios, y construyes hábitos que te ayudan a sentirte mejor.",
    temas: [
      ["Estrés y preocupación", "Herramientas para bajar el ritmo, respirar y ordenar tu día."],
      ["Autoestima y cuerpo", "Hacer las paces con tu cuerpo y hablarte con más cariño."],
      ["Relación con la comida", "Comer con calma y sin culpa, desde los hábitos."],
      ["Sueño y energía", "Rutinas para descansar mejor y tener energía para tu día."],
      ["Motivación y hábitos", "Metas pequeñas y realistas que sí se cumplen."],
      ["Cambios de vida", "Acompañamiento en etapas difíciles: trabajo, familia, mudanzas."],
    ],
    ses_title: "Cómo es una sesión",
    ses: [
      ["45 minutos por video", "Desde tu casa, en español o inglés, en el horario que te acomode."],
      ["Un plan para tu semana", "Sales con 2 o 3 acciones concretas y ejercicios cortos."],
      ["Seguimiento en la app", "Registras tu ánimo y tu diario, y Nahomy ve tu avance entre sesiones."],
    ],
    ent_tag: "Y TU CUERPO ACOMPAÑA",
    ent_title: "Moverte también es cuidarte",
    ent_sub: "Cuando tu mente está en paz, tu cuerpo responde. Por eso tu rutina y tu plan de comida se ajustan a cómo te sientes: si un día amaneces con poca energía o mucho estrés, haces una versión más suave en lugar de rendirte.",
    ent_items: [
      "Check-in diario de ánimo, energía y sueño",
      "Rutinas personalizadas, revisadas por Nahomy",
      "Plan de comida con alimentos que sí comes",
      "Fotos y medidas para ver tu avance mes a mes",
      "Chat directo con Nahomy",
    ],
    how_title: "Así trabaja Nahomy contigo",
    how: [
      ["Te escucha primero", "En la primera sesión conoce tu historia, tus metas y lo que te ha costado."],
      ["Primero lo emocional", "Trabajan lo que te frena por dentro; el entrenamiento y la comida se suman a tu ritmo, porque una cosa afecta a la otra."],
      ["Acompañamiento real", "Una persona revisa tu avance; la inteligencia artificial solo le ayuda a preparar tu plan."],
    ],
    about_tag: "FUNDADORA Y COACH",
    about_t1: "Hola, soy", about_t2: "Nahomy",
    about_p1: "Soy coach de bienestar emocional y entrenamiento. Creé NAHOFIT.LIFE porque vi que muchas mujeres empiezan a entrenar con ganas y lo dejan cuando el estrés, el cansancio o el ánimo les ganan: el problema casi nunca era el cuerpo.",
    about_p2: "Por eso empiezo por la mente: te acompaño a entender cómo te sientes, a manejar el estrés y a hablarte con más cariño. Y desde ahí, a moverte y a comer mejor, paso a paso y sin juicios.",
    about_badges: ["Coaching emocional", "Entrenamiento personal", "Nutrición"],
    about_quote: "Cuando tu mente decide, tu cuerpo puede. Yo te acompaño.",
    plans_title: "Elige cómo quieres empezar",
    plans_sub: "Todos los planes son mensuales y puedes cancelar cuando quieras.",
    popular: "Recomendado", per_month: "/mes", choose: "Lo quiero",
    planes: [
      { id: "cuerpo_mente", name: "Mente y Cuerpo", price: 149, popular: true, items: ["Programa emocional semanal", "Diario y ejercicios de respiración", "Check-in diario de ánimo y energía", "1 sesión grupal de bienestar al mes", "Rutina que se adapta a tu ánimo", "Plan de comida"] },
      { id: "uno_a_uno", name: "Acompañamiento 1:1", price: 279, items: ["Todo lo de Mente y Cuerpo", "2 sesiones individuales al mes (45 min)", "Revisión semanal de tus hábitos", "Prioridad en mensajes"] },
      { id: "cuerpo", name: "Solo entrenamiento", price: 79, items: ["Rutina semanal personalizada", "Check-in diario de ánimo y energía", "Fotos y medidas de tu avance", "Chat con Nahomy"] },
    ],
    extras_title: "¿Prefieres sesiones sueltas?",
    extras: [["Primera sesión (30 min)", "$35"], ["Sesión de coaching emocional (45 min)", "$75"], ["Paquete de 4 sesiones", "$260"], ["Taller grupal mensual", "$25"]],
    faq_title: "Preguntas frecuentes",
    faq: [
      ["¿Esto es terapia?", "No. Es coaching de bienestar emocional: te acompaña a crear hábitos, manejar el estrés y sentirte mejor. No diagnostica ni trata condiciones de salud mental como depresión, ansiedad o trastornos de la alimentación. Si las tienes o crees tenerlas, te recomendamos una terapeuta con licencia, y podemos ayudarte a encontrar una."],
      ["¿Qué pasa en la primera sesión?", "Platicas con Nahomy 30 minutos por video: qué te gustaría cambiar, cómo te has sentido y qué has intentado. Al final te dice qué plan te conviene, sin compromiso."],
      ["¿Puedo solo entrenar?", "Sí. El plan Solo entrenamiento es rutina y seguimiento. Cuando quieras, puedes sumar el coaching emocional."],
      ["¿Las sesiones son en español?", "Sí, en español o en inglés, como te sientas más cómoda."],
      ["¿Qué pasa si estoy en una crisis?", "Si piensas en hacerte daño, llama o escribe al 988 (Línea de Crisis y Suicidio, 24 horas) o al 911 si estás en peligro. Las sesiones no son un servicio de emergencias."],
    ],
    form_title: "Agenda tu primera sesión",
    form_sub: "Déjanos tus datos y Nahomy te escribe para elegir el día y la hora.",
    f_nombre: "Tu nombre", f_tel: "WhatsApp o teléfono", f_email: "Correo", f_interes: "Me interesa",
    f_msg: "¿Algo que quieras contarle a Nahomy? (opcional)",
    f_acepta: "Acepto que Nahomy me contacte por WhatsApp, teléfono o correo.",
    f_btn: "Enviar", f_sending: "Enviando…",
    f_ok: "¡Listo! Nahomy te escribirá pronto para agendar tu sesión.",
    f_err: "No se pudo enviar. Intenta de nuevo.",
    f_need: "Déjanos tu WhatsApp o tu correo para escribirte.",
    intereses: [["primera_sesion", "Primera sesión ($35)"], ["cuerpo_mente", "Plan Mente y Cuerpo"], ["uno_a_uno", "Acompañamiento 1:1"], ["cuerpo", "Plan Solo entrenamiento"], ["otro", "Otra cosa"]],
    footer_tag: "Cuida tu mente, y tu cuerpo te sigue.",
    wa_float: "Escríbele a Nahomy por WhatsApp",
    wa_line: "¿Prefieres WhatsApp?", wa_btn: "Escríbele a Nahomy", wa_txt: "Hola Nahomy, vi tu página y quiero información sobre la primera sesión.",
    footer_copy: "© 2026 NAHOFIT.LIFE · Nahomy · Salt Lake City, Utah",
    disclaimer: "NAHOFIT.LIFE ofrece coaching de bienestar emocional y entrenamiento. No es terapia ni sustituye la atención médica o psicológica. Consulta a tu médico antes de empezar un programa de ejercicio o nutrición. Si estás en crisis, llama o escribe al 988.",
    login: "Entrar a la app", privacy: "Privacidad", terms: "Términos",
  },
  en: {
    nav: [["bienestar", "Emotional wellbeing"], ["entrenamiento", "Body"], ["planes", "Plans"], ["sobre-nahomy", "Nahomy"], ["preguntas", "FAQ"]],
    nav_login: "Sign in", nav_cta: "Book a session", nav_panel: "Go to my dashboard →",
    hero_tag: "EMOTIONAL COACHING · WITH TRAINING · ENGLISH & SPANISH",
    hero_t1: "Care for your mind,", hero_t2: "and your body ", hero_green: "follows.",
    hero_sub: "Emotional coaching with Nahomy, online, in English or Spanish. We start with how you feel —stress, self-esteem, habits— and training and food support your process.",
    hero_btn1: "Book your first session", hero_btn2: "See plans",
    hero_note: "First 30-minute video session: $35",
    bien_tag: "EMOTIONAL WELLBEING",
    bien_title: "You come first: how you feel",
    bien_sub: "Lasting change starts inside. In emotional coaching sessions you work with Nahomy on what weighs on you today, in a space without judgment, and build habits that help you feel better.",
    temas: [
      ["Stress and worry", "Tools to slow down, breathe and organize your day."],
      ["Self-esteem and body", "Make peace with your body and talk to yourself more kindly."],
      ["Relationship with food", "Eat calmly and without guilt, through habits."],
      ["Sleep and energy", "Routines to rest better and have energy for your day."],
      ["Motivation and habits", "Small, realistic goals you actually keep."],
      ["Life changes", "Support through hard seasons: work, family, moving."],
    ],
    ses_title: "What a session looks like",
    ses: [
      ["45 minutes by video", "From home, in English or Spanish, at a time that works for you."],
      ["A plan for your week", "You leave with 2 or 3 concrete actions and short exercises."],
      ["Follow-up in the app", "You log your mood and journal, and Nahomy sees your progress between sessions."],
    ],
    ent_tag: "AND YOUR BODY FOLLOWS",
    ent_title: "Moving is caring for yourself too",
    ent_sub: "When your mind is at peace, your body responds. That's why your workout and meal plan adapt to how you feel: on a low-energy or high-stress day, you do a gentler version instead of giving up.",
    ent_items: ["Daily mood, energy and sleep check-in", "Personalized workouts, reviewed by Nahomy", "Meal plan with foods you actually eat", "Photos and measurements to see your progress", "Direct chat with Nahomy"],
    how_title: "How Nahomy works with you",
    how: [
      ["She listens first", "In your first session she learns your story, your goals and what has been hard."],
      ["Emotions first", "You work on what holds you back inside; training and food come in at your pace, because each one affects the others."],
      ["Real support", "A person reviews your progress; artificial intelligence only helps her prepare your plan."],
    ],
    about_tag: "FOUNDER AND COACH",
    about_t1: "Hi, I'm", about_t2: "Nahomy",
    about_p1: "I'm an emotional wellbeing and training coach. I created NAHOFIT.LIFE because I saw many women start training with excitement and quit when stress, tiredness or mood got the best of them: the problem was rarely the body.",
    about_p2: "That's why I start with the mind: I help you understand how you feel, manage stress and talk to yourself more kindly. And from there, to move and eat better, step by step and without judgment.",
    about_badges: ["Emotional coaching", "Personal training", "Nutrition"],
    about_quote: "When your mind decides, your body can. I'm with you.",
    plans_title: "Choose how you want to start",
    plans_sub: "All plans are monthly and you can cancel anytime.",
    popular: "Recommended", per_month: "/mo", choose: "I want it",
    planes: [
      { id: "cuerpo_mente", name: "Mind & Body", price: 149, popular: true, items: ["Weekly emotional program", "Journal and breathing exercises", "Daily mood and energy check-in", "1 group wellbeing session per month", "Workout that adapts to your mood", "Meal plan"] },
      { id: "uno_a_uno", name: "1:1 Coaching", price: 279, items: ["Everything in Mind & Body", "2 individual sessions per month (45 min)", "Weekly habit review", "Priority messages"] },
      { id: "cuerpo", name: "Training only", price: 79, items: ["Weekly personalized workout", "Daily mood and energy check-in", "Progress photos and measurements", "Chat with Nahomy"] },
    ],
    extras_title: "Prefer single sessions?",
    extras: [["First session (30 min)", "$35"], ["Emotional coaching session (45 min)", "$75"], ["4-session package", "$260"], ["Monthly group workshop", "$25"]],
    faq_title: "Frequently asked questions",
    faq: [
      ["Is this therapy?", "No. It's emotional wellbeing coaching: it helps you build habits, manage stress and feel better. It doesn't diagnose or treat mental health conditions such as depression, anxiety or eating disorders. If you have or think you have one, we recommend a licensed therapist, and we can help you find one."],
      ["What happens in the first session?", "You talk with Nahomy for 30 minutes by video: what you'd like to change, how you've been feeling and what you've tried. At the end she tells you which plan fits you, no commitment."],
      ["Can I just train?", "Yes. The Training only plan is workouts and follow-up. You can add emotional coaching whenever you want."],
      ["Are sessions in Spanish?", "Yes, in Spanish or English, whichever feels more comfortable."],
      ["What if I'm in a crisis?", "If you're thinking about hurting yourself, call or text 988 (Suicide & Crisis Lifeline, 24/7) or 911 if you're in danger. Sessions are not an emergency service."],
    ],
    form_title: "Book your first session",
    form_sub: "Leave your details and Nahomy will reach out to pick a day and time.",
    f_nombre: "Your name", f_tel: "WhatsApp or phone", f_email: "Email", f_interes: "I'm interested in",
    f_msg: "Anything you'd like to tell Nahomy? (optional)",
    f_acepta: "I agree that Nahomy may contact me by WhatsApp, phone or email.",
    f_btn: "Send", f_sending: "Sending…",
    f_ok: "Done! Nahomy will write to you soon to book your session.",
    f_err: "Couldn't send. Please try again.",
    f_need: "Leave your WhatsApp or email so we can reach you.",
    intereses: [["primera_sesion", "First session ($35)"], ["cuerpo_mente", "Mind & Body plan"], ["uno_a_uno", "1:1 Coaching"], ["cuerpo", "Training only plan"], ["otro", "Something else"]],
    footer_tag: "Care for your mind, and your body follows.",
    wa_float: "Message Nahomy on WhatsApp",
    wa_line: "Prefer WhatsApp?", wa_btn: "Message Nahomy", wa_txt: "Hi Nahomy, I saw your page and I'd like information about the first session.",
    footer_copy: "© 2026 NAHOFIT.LIFE · Nahomy · Salt Lake City, Utah",
    disclaimer: "NAHOFIT.LIFE offers emotional wellbeing coaching and training. It is not therapy and does not replace medical or psychological care. Talk to your doctor before starting an exercise or nutrition program. If you're in crisis, call or text 988.",
    login: "Sign in to the app", privacy: "Privacy", terms: "Terms",
  },
} as const;

// ── Aparece al bajar ───────────────────────────────────────────────────────────
function useFade() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "none"; obs.disconnect(); }
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

const em = "#10B981";
const dark = "#0A0F0D";
const dark2 = "#0F1A14";
const white = "#FFFFFF";
const light = "#F9FAFB";
const textDark = "#0A0F0D";
const textGray = "#4B5563";
const textLight = "#ECFDF5";
const textMuted = "rgba(236,253,245,0.7)";
const syne = "'Syne', sans-serif";
const h2 = (color: string) => ({ fontFamily: syne, fontSize: "clamp(26px,3vw,38px)", fontWeight: 800, color, lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: 14, textWrap: "balance" }) as const;
const tagStyle = { display: "inline-block", background: `${em}1F`, border: `1px solid ${em}66`, color: em, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 18 } as const;
const pad = "96px clamp(16px,4vw,40px)";
// WhatsApp de Nahomy (formato internacional, sin + ni espacios).
const WHATSAPP = "13852300315";
const waLink = (texto: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;

export default function Landing() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("nahofit_idioma") as Lang) || "es");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(0);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const t = T[lang];

  // Formulario
  const [f, setF] = useState({ nombre: "", telefono: "", email: "", interes: "primera_sesion", mensaje: "", acepta: false, empresa: "" });
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "error">("");
  const [error, setError] = useState("");

  const setLang_ = (l: Lang) => { setLang(l); localStorage.setItem("nahofit_idioma", l); document.documentElement.lang = l; };
  const goLogin = () => navigate("/login");
  const scrollTo = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
  const elegir = (interes: string) => { setF((x) => ({ ...x, interes })); scrollTo("contacto"); };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.telefono.trim() && !f.email.trim()) { setError(t.f_need); return; }
    setEstado("enviando");
    try {
      const r = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, idioma: lang }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setError(data.error ?? t.f_err); setEstado("error"); return; }
      setEstado("ok");
    } catch {
      setError(t.f_err);
      setEstado("error");
    }
  }

  const fBien = useFade(), fSes = useFade(), fEnt = useFade(), fHow = useFade(), fAbout = useFade(), fPlans = useFade(), fFaq = useFade(), fForm = useFade();
  const input = { width: "100%", minHeight: 48, padding: "10px 14px", borderRadius: 10, border: "1px solid #D1D5DB", fontSize: 16, fontFamily: "inherit", color: textDark, background: white } as const;
  const label = { display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 } as const;

  return (
    <div lang={lang} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", overflowX: "hidden", background: dark, color: textLight }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .lp-hide-mobile { display: flex; }
        .lp-show-mobile { display: none; }
        .lp-two { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .lp-three { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 20px; }
        .lp-auto { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
        .lp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .lp-hero { grid-template-columns: 1.15fr 0.85fr; }
        .lp-about { grid-template-columns: 0.9fr 1.1fr; }
        .lp-extras { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 40px; }
        .lp-wa { transition: transform 0.2s; }
        .lp-wa:hover { transform: scale(1.05); }
        a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid ${em}; outline-offset: 2px; }
        @media (max-width: 860px) {
          .lp-hide-mobile { display: none !important; }
          .lp-show-mobile { display: flex !important; }
          .lp-two, .lp-three, .lp-form-grid, .lp-hero, .lp-about, .lp-extras { grid-template-columns: 1fr; }
          .lp-hero-text > div { justify-content: center; }
          .lp-wa { padding: 15px !important; }
          .lp-wa-text { display: none; }
          .lp-hero-img { max-width: 340px; width: 100%; margin: 0 auto; }
          .lp-hero-img img { height: 400px !important; }
          .lp-hero-text { text-align: center; align-items: center !important; }
        }
      `}</style>

      {/* ═══ BARRA ═══ */}
      <nav aria-label="Principal" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: scrolled || menuOpen ? dark : "transparent", boxShadow: scrolled ? "0 1px 0 rgba(16,185,129,0.2)" : "none", transition: "background 0.3s", padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", height: 68, gap: 20 }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="NAHOFIT.LIFE, inicio" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: syne, fontWeight: 900, fontSize: 21, flexShrink: 0 }}>
            <span style={{ color: white }}>NAHOFIT</span><span style={{ color: em }}>.LIFE</span>
          </button>
          <div className="lp-hide-mobile" style={{ gap: 22, flex: 1, justifyContent: "center" }}>
            {t.nav.map(([id, l]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", color: "rgba(236,253,245,0.75)", fontSize: 14, fontWeight: 500, cursor: "pointer", minHeight: 40 }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <div role="group" aria-label="Idioma / Language" style={{ display: "flex", background: "rgba(16,185,129,0.12)", borderRadius: 8, padding: 3, gap: 2 }}>
              {(["es", "en"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang_(l)} aria-pressed={lang === l} style={{ background: lang === l ? em : "none", color: lang === l ? "#000" : "rgba(236,253,245,0.7)", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>{l}</button>
              ))}
            </div>
            {user ? (
              <button onClick={() => navigate(user.rol === "admin" ? "/admin" : user.rol === "coach" ? "/coach" : "/cliente")} style={{ background: em, color: "#000", border: "none", borderRadius: 50, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t.nav_panel}</button>
            ) : (
              <>
                <button onClick={goLogin} className="lp-hide-mobile" style={{ background: "none", border: `1.5px solid ${em}80`, color: em, borderRadius: 50, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{t.nav_login}</button>
                <button onClick={() => scrollTo("contacto")} className="lp-hide-mobile" style={{ background: em, color: "#000", border: "none", borderRadius: 50, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t.nav_cta}</button>
              </>
            )}
            <button className="lp-show-mobile" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} style={{ background: "none", border: "none", cursor: "pointer", width: 44, height: 44, flexDirection: "column", gap: 5, alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 22, height: 2, background: white, borderRadius: 2, transform: menuOpen ? "rotate(45deg) translateY(7px)" : "none", transition: "transform 0.25s" }} />
              <span style={{ width: 22, height: 2, background: white, borderRadius: 2, opacity: menuOpen ? 0 : 1 }} />
              <span style={{ width: 22, height: 2, background: white, borderRadius: 2, transform: menuOpen ? "rotate(-45deg) translateY(-7px)" : "none", transition: "transform 0.25s" }} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background: dark, borderTop: "1px solid rgba(16,185,129,0.15)", padding: "8px 24px 20px" }}>
            {t.nav.map(([id, l]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", width: "100%", background: "none", border: "none", color: textLight, fontSize: 16, padding: "14px 0", textAlign: "left", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{l}</button>
            ))}
            <button onClick={() => scrollTo("contacto")} style={{ display: "block", width: "100%", background: em, color: "#000", border: "none", borderRadius: 10, padding: 14, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 16 }}>{t.nav_cta}</button>
            {!user && <button onClick={goLogin} style={{ display: "block", width: "100%", background: "none", color: em, border: `1.5px solid ${em}`, borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 10 }}>{t.nav_login}</button>}
          </div>
        )}
      </nav>

      <main>
        {/* ═══ PORTADA ═══ */}
        <section style={{ background: `radial-gradient(ellipse at 80% 20%, ${em}22, transparent 55%), ${dark}`, padding: "120px clamp(16px,4vw,40px) 80px" }}>
          <div className="lp-two lp-hero" style={{ maxWidth: 1150, margin: "0 auto" }}>
            <div className="lp-hero-text" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 22 }}>
              <span style={{ ...tagStyle, marginBottom: 0 }}>{t.hero_tag}</span>
              <h1 style={{ fontFamily: syne, fontSize: "clamp(36px,4.6vw,60px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.015em", color: white }}>
                {t.hero_t1}<br />{t.hero_t2}<span style={{ color: em }}>{t.hero_green}</span>
              </h1>
              <p style={{ fontSize: "clamp(17px,2vw,20px)", color: textMuted, lineHeight: 1.6, maxWidth: 560 }}>{t.hero_sub}</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={() => elegir("primera_sesion")} style={{ background: em, color: "#000", border: "none", borderRadius: 50, padding: "16px 30px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>{t.hero_btn1}</button>
                <button onClick={() => scrollTo("planes")} style={{ background: "none", border: "1.5px solid rgba(255,255,255,0.5)", color: white, borderRadius: 50, padding: "16px 28px", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>{t.hero_btn2}</button>
              </div>
              <p style={{ fontSize: 14, color: "rgba(236,253,245,0.6)" }}>{t.hero_note}</p>
            </div>
            <div className="lp-hero-img" style={{ borderRadius: 24, overflow: "hidden", border: `1px solid ${em}40`, background: "#F2ECE1" }}>
              <img src="/nahomy-perfil.jpg" width={720} height={1081} alt={lang === "es" ? "Nahomy, coach de NAHOFIT.LIFE" : "Nahomy, NAHOFIT.LIFE coach"} style={{ width: "100%", height: "clamp(380px,60vh,600px)", objectFit: "cover", objectPosition: "50% 12%", display: "block" }} />
            </div>
          </div>
        </section>

        {/* ═══ BIENESTAR EMOCIONAL ═══ */}
        <section id="bienestar" style={{ background: white, padding: pad, scrollMarginTop: 68 }}>
          <div ref={fBien} style={{ maxWidth: 1100, margin: "0 auto" }}>
            <span style={tagStyle}>{t.bien_tag}</span>
            <h2 style={h2(textDark)}>{t.bien_title}</h2>
            <p style={{ color: textGray, fontSize: 18, lineHeight: 1.65, maxWidth: 720, marginBottom: 40 }}>{t.bien_sub}</p>
            <div className="lp-three">
              {t.temas.map(([titulo, texto]) => (
                <div key={titulo} style={{ background: light, border: "1px solid #E5E7EB", borderRadius: 16, padding: 24 }}>
                  <h3 style={{ fontFamily: syne, fontSize: 19, fontWeight: 700, color: textDark, marginBottom: 8 }}>{titulo}</h3>
                  <p style={{ color: textGray, fontSize: 15, lineHeight: 1.6 }}>{texto}</p>
                </div>
              ))}
            </div>
          </div>
          <div ref={fSes} style={{ maxWidth: 1100, margin: "64px auto 0" }}>
            <h3 style={{ fontFamily: syne, fontSize: "clamp(22px,3vw,30px)", fontWeight: 800, color: textDark, marginBottom: 24 }}>{t.ses_title}</h3>
            <ol className="lp-three" style={{ listStyle: "none" }}>
              {t.ses.map(([titulo, texto], i) => (
                <li key={titulo} style={{ borderTop: `3px solid ${em}`, paddingTop: 18 }}>
                  <div style={{ fontFamily: syne, fontWeight: 800, color: em, fontSize: 15, marginBottom: 6 }}>0{i + 1}</div>
                  <div style={{ fontWeight: 700, color: textDark, fontSize: 18, marginBottom: 6 }}>{titulo}</div>
                  <p style={{ color: textGray, fontSize: 15, lineHeight: 1.6 }}>{texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══ ENTRENAMIENTO ═══ */}
        <section id="entrenamiento" style={{ background: light, padding: pad, scrollMarginTop: 68 }}>
          <div ref={fEnt} className="lp-two" style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ borderRadius: 20, overflow: "hidden", background: "#F2ECE1" }}>
              <img loading="lazy" decoding="async" src="/nahomy-plan.jpg" width={660} height={555} alt={lang === "es" ? "Nahomy preparando un plan" : "Nahomy preparing a plan"} style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
            <div>
              <span style={tagStyle}>{t.ent_tag}</span>
              <h2 style={h2(textDark)}>{t.ent_title}</h2>
              <p style={{ color: textGray, fontSize: 17, lineHeight: 1.7, marginBottom: 24 }}>{t.ent_sub}</p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {t.ent_items.map((c) => (
                  <li key={c} style={{ display: "flex", gap: 12, alignItems: "flex-start", color: "#374151", fontSize: 16 }}>
                    <span aria-hidden="true" style={{ width: 22, height: 22, background: em, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#000", fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ═══ CÓMO TRABAJA ═══ */}
        <section style={{ background: dark2, padding: pad }}>
          <div ref={fHow} style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ ...h2(white), textAlign: "center", marginBottom: 40 }}>{t.how_title}</h2>
            <div className="lp-three">
              {t.how.map(([titulo, texto]) => (
                <div key={titulo} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${em}33`, borderRadius: 18, padding: 26 }}>
                  <h3 style={{ fontFamily: syne, fontSize: 20, fontWeight: 700, color: white, marginBottom: 10 }}>{titulo}</h3>
                  <p style={{ color: textMuted, fontSize: 15, lineHeight: 1.65 }}>{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ NAHOMY ═══ */}
        <section id="sobre-nahomy" style={{ background: white, padding: pad, scrollMarginTop: 68 }}>
          <div ref={fAbout} className="lp-two lp-about" style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ borderRadius: 20, overflow: "hidden", background: "#F2ECE1" }}>
              <img loading="lazy" decoding="async" src="/nahomy-perfil.jpg" width={720} height={1081} alt="Nahomy" style={{ width: "100%", height: 520, objectFit: "cover", objectPosition: "50% 12%", display: "block" }} />
            </div>
            <div>
              <span style={tagStyle}>{t.about_tag}</span>
              <h2 style={h2(textDark)}>{t.about_t1}<br />{t.about_t2}</h2>
              <p style={{ color: textGray, fontSize: 17, lineHeight: 1.75, marginBottom: 16 }}>{t.about_p1}</p>
              <p style={{ color: textGray, fontSize: 17, lineHeight: 1.75, marginBottom: 22 }}>{t.about_p2}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                {t.about_badges.map((c) => (
                  <span key={c} style={{ background: `${em}15`, border: `1px solid ${em}55`, color: "#047857", borderRadius: 20, padding: "6px 14px", fontSize: 14, fontWeight: 600 }}>{c}</span>
                ))}
              </div>
              <blockquote style={{ borderLeft: `3px solid ${em}`, paddingLeft: 18 }}>
                <p style={{ color: "#047857", fontStyle: "italic", fontSize: 20, fontWeight: 600 }}>"{t.about_quote}"</p>
              </blockquote>
            </div>
          </div>
        </section>

        {/* ═══ PLANES ═══ */}
        <section id="planes" style={{ background: dark, padding: pad, scrollMarginTop: 68 }}>
          <div ref={fPlans} style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ ...h2(white), textAlign: "center" }}>{t.plans_title}</h2>
            <p style={{ textAlign: "center", color: textMuted, fontSize: 17, marginBottom: 44 }}>{t.plans_sub}</p>
            <div className="lp-three" style={{ alignItems: "stretch" }}>
              {t.planes.map((p) => {
                const pop = "popular" in p && p.popular;
                return (
                  <div key={p.id} style={{ background: pop ? em : dark2, color: pop ? "#000" : textLight, border: `1px solid ${pop ? em : "rgba(16,185,129,0.25)"}`, borderRadius: 22, padding: 30, display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
                    {pop && <span style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#000", color: em, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>{t.popular}</span>}
                    <h3 style={{ fontFamily: syne, fontSize: 19, fontWeight: 800, whiteSpace: "nowrap" }}>{p.name}</h3>
                    <div><span style={{ fontFamily: syne, fontSize: 46, fontWeight: 800 }}>${p.price}</span><span style={{ opacity: 0.75 }}>{t.per_month}</span></div>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                      {p.items.map((it) => (
                        <li key={it} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: 1.45 }}><span aria-hidden="true" style={{ fontWeight: 800 }}>✓</span>{it}</li>
                      ))}
                    </ul>
                    <button onClick={() => elegir(p.id)} style={{ background: pop ? "#000" : em, color: pop ? em : "#000", border: "none", borderRadius: 50, padding: "14px 20px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>{t.choose}</button>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 40, border: "1px solid rgba(16,185,129,0.25)", borderRadius: 18, padding: "22px 24px" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: white, marginBottom: 14 }}>{t.extras_title}</h3>
              <div className="lp-extras">
                {t.extras.map(([n, pr]) => (
                  <div key={n} style={{ display: "flex", justifyContent: "space-between", gap: 12, color: textMuted, fontSize: 15, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
                    <span>{n}</span><span style={{ color: em, fontWeight: 700 }}>{pr}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ PREGUNTAS ═══ */}
        <section id="preguntas" style={{ background: white, padding: pad, scrollMarginTop: 68 }}>
          <div ref={fFaq} style={{ maxWidth: 820, margin: "0 auto" }}>
            <h2 style={{ ...h2(textDark), marginBottom: 28 }}>{t.faq_title}</h2>
            {t.faq.map(([q, a], i) => (
              <div key={q} style={{ borderBottom: "1px solid #E5E7EB" }}>
                <h3 style={{ margin: 0 }}>
                  <button onClick={() => setAbierta(abierta === i ? null : i)} aria-expanded={abierta === i} aria-controls={`faq-${i}`}
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, background: "none", border: "none", padding: "20px 0", fontSize: 18, fontWeight: 700, color: textDark, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                    {q}<span aria-hidden="true" style={{ color: em, fontSize: 24 }}>{abierta === i ? "−" : "+"}</span>
                  </button>
                </h3>
                {abierta === i && <p id={`faq-${i}`} style={{ color: textGray, fontSize: 16, lineHeight: 1.7, paddingBottom: 20 }}>{a}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ AGENDA ═══ */}
        <section id="contacto" style={{ background: light, padding: pad, scrollMarginTop: 68 }}>
          <div ref={fForm} style={{ maxWidth: 720, margin: "0 auto", background: white, borderRadius: 24, padding: "clamp(24px,4vw,44px)", boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}>
            <h2 style={h2(textDark)}>{t.form_title}</h2>
            <p style={{ color: textGray, fontSize: 17, lineHeight: 1.6, marginBottom: 16 }}>{t.form_sub}</p>
            <p style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, color: textGray, fontSize: 15, marginBottom: 28 }}>
              {t.wa_line}
              <a href={waLink(t.wa_txt)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#25D366", color: "#062A17", borderRadius: 50, padding: "8px 16px", fontWeight: 700, textDecoration: "none" }}>
                <span aria-hidden="true">💬</span>{t.wa_btn}
              </a>
            </p>
            {estado === "ok" ? (
              <p role="status" style={{ background: `${em}18`, border: `1px solid ${em}`, color: "#065F46", borderRadius: 14, padding: 20, fontSize: 17, fontWeight: 600 }}>{t.f_ok}</p>
            ) : (
              <form onSubmit={enviar} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label htmlFor="c-nombre" style={label}>{t.f_nombre}</label>
                  <input id="c-nombre" required autoComplete="name" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} style={input} />
                </div>
                <div className="lp-form-grid">
                  <div>
                    <label htmlFor="c-tel" style={label}>{t.f_tel}</label>
                    <input id="c-tel" type="tel" autoComplete="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} style={input} />
                  </div>
                  <div>
                    <label htmlFor="c-email" style={label}>{t.f_email}</label>
                    <input id="c-email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={input} />
                  </div>
                </div>
                <div>
                  <label htmlFor="c-interes" style={label}>{t.f_interes}</label>
                  <select id="c-interes" value={f.interes} onChange={(e) => setF({ ...f, interes: e.target.value })} style={input}>
                    {t.intereses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="c-msg" style={label}>{t.f_msg}</label>
                  <textarea id="c-msg" rows={3} value={f.mensaje} onChange={(e) => setF({ ...f, mensaje: e.target.value })} style={{ ...input, minHeight: 96, resize: "vertical" }} />
                </div>
                {/* Campo trampa para robots (oculto para personas) */}
                <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
                  <label htmlFor="c-empresa">Empresa</label>
                  <input id="c-empresa" tabIndex={-1} autoComplete="off" value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} />
                </div>
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15, color: "#374151", lineHeight: 1.5 }}>
                  <input type="checkbox" required checked={f.acepta} onChange={(e) => setF({ ...f, acepta: e.target.checked })} style={{ width: 20, height: 20, marginTop: 2, accentColor: em }} />
                  {t.f_acepta}
                </label>
                {error && <p role="alert" style={{ color: "#B91C1C", fontSize: 15, fontWeight: 600 }}>{error}</p>}
                <button type="submit" disabled={estado === "enviando" || !f.nombre.trim() || !f.acepta}
                  style={{ background: em, color: "#000", border: "none", borderRadius: 50, padding: "16px 24px", fontWeight: 700, fontSize: 17, cursor: "pointer", opacity: estado === "enviando" || !f.nombre.trim() || !f.acepta ? 0.55 : 1 }}>
                  {estado === "enviando" ? t.f_sending : t.f_btn}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* ═══ PIE ═══ */}
      <footer style={{ background: dark, padding: "56px clamp(16px,4vw,40px) 36px", borderTop: "1px solid rgba(16,185,129,0.12)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: syne, fontWeight: 900, fontSize: 26, marginBottom: 6 }}>
                <span style={{ color: white }}>NAHOFIT</span><span style={{ color: em }}>.LIFE</span>
              </div>
              <p style={{ color: "rgba(236,253,245,0.6)", fontSize: 15 }}>{t.footer_tag}</p>
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <button onClick={() => scrollTo("contacto")} style={{ background: "none", border: "none", color: em, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>{t.nav_cta}</button>
              <a href={waLink(t.wa_txt)} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(236,253,245,0.7)", fontSize: 15 }}>WhatsApp</a>
              <button onClick={goLogin} style={{ background: "none", border: "none", color: "rgba(236,253,245,0.7)", fontSize: 15, cursor: "pointer" }}>{t.login}</button>
              <a href="/privacidad" style={{ color: "rgba(236,253,245,0.7)", fontSize: 15 }}>{t.privacy}</a>
              <a href="/terminos" style={{ color: "rgba(236,253,245,0.7)", fontSize: 15 }}>{t.terms}</a>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(16,185,129,0.1)", paddingTop: 20, color: "rgba(236,253,245,0.55)", fontSize: 13, lineHeight: 1.6, textAlign: "center" }}>
            <p>{t.disclaimer}</p>
            <p style={{ marginTop: 8 }}>{t.footer_copy}</p>
          </div>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp */}
      <a href={waLink(t.wa_txt)} target="_blank" rel="noopener noreferrer" aria-label={t.wa_float} title={t.wa_float} className="lp-wa"
        style={{ position: "fixed", right: "max(16px, env(safe-area-inset-right))", bottom: "max(16px, env(safe-area-inset-bottom))", zIndex: 900, display: "flex", alignItems: "center", gap: 10, background: "#25D366", color: "#062A17", borderRadius: 999, padding: "14px 18px", fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
        <MessageCircle size={24} strokeWidth={2.4} aria-hidden="true" />
        <span className="lp-wa-text">WhatsApp</span>
      </a>
    </div>
  );
}
