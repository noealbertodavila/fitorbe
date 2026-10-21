import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

// ── Translation system ─────────────────────────────────────────────────────────
type Lang = "es" | "en";

const T: Record<Lang, Record<string, string>> = {
  es: {
    nav_feat: "Características", nav_plans: "Planes", nav_about: "Nahomy", nav_contact: "Contacto",
    nav_login: "Iniciar Sesión", nav_cta: "Comenzar", nav_panel: "Ir a mi panel →",
    hero_tag: "✦ COACHING DE ÉLITE CON INTELIGENCIA ARTIFICIAL",
    hero_title1: "Tu mejor versión", hero_title2: "empieza ", hero_title_green: "hoy.",
    hero_sub: "Fitness personalizado, nutrición inteligente y bienestar emocional.\nDiseñado por Nahomy, potenciado por IA.",
    hero_btn1: "🚀 Comenzar mi transformación", hero_btn2: "▶ Ver cómo funciona",
    stat1_label: "Fotos por registro", stat2_label: "Medidas corporales", stat3_label: "Planes", stat4_label: "Idiomas",
    proof_intro: "Coaching en línea en español e inglés · desde Salt Lake City, Utah",
    feat_title: "Todo lo que necesitas para transformar tu vida",
    feat_sub: "Entrenamiento, comida, mente y progreso, todo con Nahomy",
    f1_tag: "🤖 RUTINAS CON IA", f1_title: "Tu plan de entrenamiento perfecto, generado en segundos",
    f1_desc: "La IA analiza tu perfil completo — lesiones, días disponibles, equipamiento y objetivo — y genera una rutina 100% personalizada. Tu coach la revisa y aprueba antes de enviártela.",
    f1_c1: "Adaptado a tus lesiones y limitaciones", f1_c2: "Por grupo muscular, fullbody, HIIT o cardio",
    f1_c3: "Videos de referencia para cada ejercicio", f1_c4: "El coach ajusta cada detalle antes de publicar",
    f2_tag: "🥗 NUTRICIÓN INTELIGENTE", f2_title: "Planes de comida con ingredientes y gramos exactos",
    f2_desc: "Olvídate de las dietas genéricas. La IA calcula tus calorías y macros según tu objetivo, y genera un plan con los ingredientes exactos en gramos para cada comida.",
    f2_c1: "Calorías y macros calculados para ti", f2_c2: "Ingredientes con gramos exactos",
    f2_c3: "Respeta alergias y preferencias", f2_c4: "Varía las comidas cada semana",
    f3_tag: "🧠 BIENESTAR EMOCIONAL", f3_title: "El único coaching que cuida tu mente también",
    f3_desc: "Check-in emocional diario, diario de mentalidad y frases motivacionales generadas por IA según tu estado de ánimo. Porque el progreso físico empieza en la mente.",
    f3_c1: "Check-in diario de ánimo y energía", f3_c2: "Diario de gratitud y reflexión",
    f3_c3: "Frases motivacionales personalizadas por IA", f3_c4: "Tu coach recibe alertas si necesitas apoyo",
    f4_tag: "📸 SEGUIMIENTO FOTOGRÁFICO", f4_title: "Ve tu transformación mes a mes",
    f4_desc: "Sube 6 fotos mensuales en diferentes posiciones. Compara cualquier mes con el slider antes/después y ve exactamente cuánto has cambiado en medidas y composición corporal.",
    f4_c1: "6 posiciones de foto por registro", f4_c2: "Comparación lado a lado con slider",
    f4_c3: "17 medidas corporales completas", f4_c4: "Gráficas de evolución visual",
    video_title: "Mira cómo funciona NAHOFIT.LIFE",
    video_sub: "30 segundos que cambiarán cómo ves el coaching",
    vp1: "🎯 Perfil personalizado", vp2: "🤖 IA genera tu plan", vp3: "📊 Seguimiento real",
    steps_title: "Empieza en 3 simples pasos",
    s1_title: "Crea tu perfil", s1_desc: "Cuéntanos tus objetivos, nivel de fitness, lesiones y preferencias alimenticias. El sistema lo usa para personalizar absolutamente todo.",
    s2_title: "Recibe tu plan", s2_desc: "Nahomy crea tu rutina y plan de nutrición asistida por IA. 100% personalizado, revisado y aprobado por tu coach antes de llegar a ti.",
    s3_title: "Transforma tu vida", s3_desc: "Entrena, come bien, registra tu progreso mensual con fotos y chatea con tu coach cuando lo necesites. Resultados reales, con seguimiento real.",
    about_tag: "✦ FUNDADORA & HEAD COACH",
    about_title1: "Hola, soy", about_title2: "Nahomy 👋",
    about_p1: "Soy coach de fitness y bienestar con pasión por transformar vidas. Creé NAHOFIT.LIFE porque quería darte acceso a coaching de élite sin importar dónde estés, con el poder de la IA para personalizar cada aspecto de tu transformación.",
    about_p2: "Cada plan que ves en la app pasa por mis manos. La IA sugiere, yo reviso, ajusto y apruebo. Así garantizo que lo que recibes es realmente para ti.",
    about_quote: "Tu cuerpo puede. Tu mente decide. Yo te guío.",
    about_btn: "Hablar con Nahomy →",
    badge1: "✓ Entrenamiento personal", badge2: "✓ Nutrición", badge3: "✓ Bienestar emocional",
    plans_title: "Elige tu plan de transformación",
    billing_m: "Mensual", billing_q: "3 meses -10%", billing_s: "6 meses -15%",
    plan_popular: "Más popular", plan_all: "Todo incluido", plan_cta: "Elegir",
    test_title: "Así trabaja Nahomy contigo", test_sub: "Acompañamiento real en cada paso",
    how1_t: "Plan revisado por tu coach", how1_d: "La IA sugiere; Nahomy revisa, ajusta y aprueba cada rutina y plan de comida antes de que llegue a ti.",
    how2_t: "Seguimiento mensual", how2_d: "Cada mes registras fotos y medidas, y comparas tu avance con gráficas claras.",
    how3_t: "Chat directo con tu coach", how3_d: "Resuelve tus dudas con Nahomy y recibe ajustes cuando los necesites.",
    disclaimer: "NAHOFIT.LIFE no sustituye el consejo médico. Consulta a tu médico antes de empezar un programa de ejercicio o nutrición.",
    cta_title: "¿Lista para tu transformación?",
    cta_sub: "Empieza hoy tu cambio con acompañamiento real",
    cta_btn: "Comenzar ahora — es gratis →",
    cta_fine: "Sin contratos · Cancela cuando quieras · Soporte directo con Nahomy",
    footer_tag: "Transformando vidas con coaching inteligente",
    footer_copy: "© 2026 NAHOFIT.LIFE — Elaborado con ❤️ por Nahomy · Salt Lake City, Utah",
  },
  en: {
    nav_feat: "Features", nav_plans: "Plans", nav_about: "Nahomy", nav_contact: "Contact",
    nav_login: "Sign In", nav_cta: "Get Started", nav_panel: "Go to my panel →",
    hero_tag: "✦ ELITE AI-POWERED COACHING",
    hero_title1: "Your best version", hero_title2: "starts ", hero_title_green: "today.",
    hero_sub: "Personalized fitness, smart nutrition and emotional wellness.\nDesigned by Nahomy, powered by AI.",
    hero_btn1: "🚀 Start my transformation", hero_btn2: "▶ See how it works",
    stat1_label: "Photos per check-in", stat2_label: "Body measurements", stat3_label: "Plans", stat4_label: "Languages",
    proof_intro: "Online coaching in English and Spanish · from Salt Lake City, Utah",
    feat_title: "Everything you need to transform your life",
    feat_sub: "Training, food, mindset and progress, all with Nahomy",
    f1_tag: "🤖 AI WORKOUTS", f1_title: "Your perfect training plan, generated in seconds",
    f1_desc: "AI analyzes your full profile — injuries, available days, equipment and goal — and generates a 100% personalized routine. Your coach reviews and approves it before sending it to you.",
    f1_c1: "Adapted to your injuries and limitations", f1_c2: "Muscle groups, fullbody, HIIT or cardio",
    f1_c3: "Reference videos for every exercise", f1_c4: "Coach adjusts every detail before publishing",
    f2_tag: "🥗 SMART NUTRITION", f2_title: "Meal plans with exact ingredients and grams",
    f2_desc: "Forget generic diets. AI calculates your calories and macros based on your goal, and generates a plan with the exact ingredients in grams for each meal.",
    f2_c1: "Calories and macros calculated for you", f2_c2: "Ingredients with exact grams",
    f2_c3: "Respects allergies and preferences", f2_c4: "Varies meals each week",
    f3_tag: "🧠 EMOTIONAL WELLNESS", f3_title: "The only coaching that takes care of your mind too",
    f3_desc: "Daily emotional check-in, mindset journal and AI-generated motivational phrases based on your mood. Because physical progress starts in the mind.",
    f3_c1: "Daily mood and energy check-in", f3_c2: "Gratitude and reflection journal",
    f3_c3: "AI-personalized motivational phrases", f3_c4: "Your coach gets alerts if you need support",
    f4_tag: "📸 PHOTO TRACKING", f4_title: "See your transformation month by month",
    f4_desc: "Upload 6 monthly photos in different positions. Compare any month with a before/after slider and see exactly how much you've changed in measurements and body composition.",
    f4_c1: "6 photo positions per record", f4_c2: "Side-by-side before/after comparison",
    f4_c3: "17 complete body measurements", f4_c4: "Visual evolution charts",
    video_title: "See how NAHOFIT.LIFE works",
    video_sub: "30 seconds that will change how you see coaching",
    vp1: "🎯 Personalized profile", vp2: "🤖 AI generates your plan", vp3: "📊 Real tracking",
    steps_title: "Get started in 3 simple steps",
    s1_title: "Create your profile", s1_desc: "Tell us your goals, fitness level, injuries and dietary preferences. The system uses it to personalize absolutely everything.",
    s2_title: "Get your plan", s2_desc: "Nahomy creates your routine and nutrition plan assisted by AI. 100% personalized, reviewed and approved by your coach before it reaches you.",
    s3_title: "Transform your life", s3_desc: "Train, eat well, record your monthly progress with photos and chat with your coach whenever you need. Real results, with real follow-up.",
    about_tag: "✦ FOUNDER & HEAD COACH",
    about_title1: "Hi, I'm", about_title2: "Nahomy 👋",
    about_p1: "I'm a fitness and wellness coach passionate about transforming lives. I created NAHOFIT.LIFE because I wanted to give you access to elite coaching no matter where you are, with the power of AI to personalize every aspect of your transformation.",
    about_p2: "Every plan you see in the app goes through my hands. AI suggests, I review, adjust and approve. That's how I guarantee that what you receive is truly for you.",
    about_quote: "Your body can. Your mind decides. I guide you.",
    about_btn: "Talk to Nahomy →",
    badge1: "✓ Personal training", badge2: "✓ Nutrition", badge3: "✓ Emotional wellness",
    plans_title: "Choose your transformation plan",
    billing_m: "Monthly", billing_q: "3 months -10%", billing_s: "6 months -15%",
    plan_popular: "Most popular", plan_all: "All included", plan_cta: "Choose",
    test_title: "How Nahomy works with you", test_sub: "Real support at every step",
    how1_t: "Plan reviewed by your coach", how1_d: "AI suggests; Nahomy reviews, adjusts and approves every workout and meal plan before it reaches you.",
    how2_t: "Monthly check-ins", how2_d: "Each month you log photos and measurements and compare your progress with clear charts.",
    how3_t: "Direct chat with your coach", how3_d: "Ask Nahomy your questions and get adjustments when you need them.",
    disclaimer: "NAHOFIT.LIFE is not a substitute for medical advice. Talk to your doctor before starting an exercise or nutrition program.",
    cta_title: "Ready for your transformation?",
    cta_sub: "Start your change today with real support",
    cta_btn: "Start now — it's free →",
    cta_fine: "No contracts · Cancel anytime · Direct support with Nahomy",
    footer_tag: "Transforming lives with intelligent coaching",
    footer_copy: "© 2026 NAHOFIT.LIFE — Made with ❤️ by Nahomy · Salt Lake City, Utah",
  },
};

// ── Fade-in hook ───────────────────────────────────────────────────────────────
function useFade() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(32px)";
    el.style.transition = "opacity 0.65s ease, transform 0.65s ease";
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const em = "#10B981";
const dark = "#0A0F0D";
const dark2 = "#0F1A14";
const white = "#FFFFFF";
const light = "#F9FAFB";
const textDark = "#0A0F0D";
const textGray = "#6B7280";
const textLight = "#ECFDF5";
const textMuted = "rgba(236,253,245,0.55)";

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("nahofit_idioma") as Lang) || "es");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [billing, setBilling] = useState<"m" | "q" | "s">("m");
  const [planes, setPlanes] = useState<any[]>([]);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const t = T[lang];
  // En celular (o con "reducir movimiento") no se baja el video de fondo: pesa varios MB.
  const [heroVideo] = useState(() => typeof window !== "undefined" && window.innerWidth > 768 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const setLang_ = (l: Lang) => { setLang(l); localStorage.setItem("nahofit_idioma", l); };
  const goLogin = () => navigate("/login");
  const scrollTo = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
  const mult = billing === "m" ? 1 : billing === "q" ? 0.9 : 0.85;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    fetch("/api/planes").then(r => r.json()).then(setPlanes).catch(() => {});
  }, []);

  // Section refs for fade
  const fProof = useFade(), fFeat = useFade(), fVideo = useFade(), fSteps = useFade(),
    fAbout = useFade(), fPlans = useFade(), fTest = useFade();

  // Sin testimonios inventados: cómo trabaja la coach (cambiar por testimonios reales con permiso escrito).
  const testimonios = [
    { icon: "🧑‍⚕️", title: t.how1_t, texto: t.how1_d },
    { icon: "📸", title: t.how2_t, texto: t.how2_d },
    { icon: "💬", title: t.how3_t, texto: t.how3_d },
  ];

  const fallbackPlanes = [
    { id: 1, nombre: "Básico", precio: 59, descripcion: "Rutina semanal personalizada\nCheck-in diario\nSeguimiento básico\nChat con coach" },
    { id: 2, nombre: "Premium", precio: 119, descripcion: "Todo lo de Básico\nNutrición con IA\nBienestar emocional\nSeguimiento fotográfico\nReportes PDF mensuales" },
    { id: 3, nombre: "VIP", precio: 249, descripcion: "Todo lo de Premium\nSesiones 1:1 con Nahomy\nAjustes semanales\nAcceso prioritario\nAI Chat 24/7" },
  ];

  // Los planes de la base de datos traen otros nombres de campos (precioMensual, caracteristicasIncluidas)
  // y precios que hay que revisar; mientras tanto se muestran los precios publicados ($59 / $119 / $249).
  const displayPlanes = planes.length > 0 && planes.every(p => typeof p?.precio === "number") ? planes.slice(0, 3) : fallbackPlanes;

  const navLinks = [
    ["caracteristicas", t.nav_feat], ["como-funciona", t.nav_plans],
    ["sobre-nahomy", t.nav_about], ["contacto", t.nav_contact],
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", overflowX: "hidden", background: dark, color: textLight }}>

      {/* ═══ FONT IMPORT ═══ */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .lp-hide-mobile { display: flex; }
        .lp-show-mobile { display: none; }
        @media (max-width: 768px) {
          .lp-hide-mobile { display: none !important; }
          .lp-show-mobile { display: block !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .feat-reverse { direction: ltr !important; }
          .hero-content { text-align: center; align-items: center !important; }
          .hero-btns { justify-content: center !important; }
          .hero-stats { justify-content: center !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .test-grid { grid-template-columns: 1fr !important; }
          .about-grid { grid-template-columns: 1fr !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
          .footer-grid { flex-direction: column; align-items: center; text-align: center; }
        }
      `}</style>

      {/* ═══════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? dark : "transparent",
        boxShadow: scrolled ? "0 1px 0 rgba(16,185,129,0.2)" : "none",
        transition: "background 0.35s ease, box-shadow 0.35s ease",
        padding: "0 clamp(16px,4vw,40px)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", height: 68, gap: 24 }}>
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: "-0.5px", flexShrink: 0 }}>
            <span style={{ color: white }}>NAHOFIT</span><span style={{ color: em }}>.</span><span style={{ color: em }}>LIFE</span>
          </button>

          {/* Desktop links */}
          <div className="lp-hide-mobile" style={{ gap: 28, flex: 1, justifyContent: "center" }}>
            {navLinks.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", color: "rgba(236,253,245,0.65)", fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = textLight} onMouseLeave={e => e.currentTarget.style.color = "rgba(236,253,245,0.65)"}>{label}
              </button>
            ))}
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <div style={{ display: "flex", background: "rgba(16,185,129,0.12)", borderRadius: 8, padding: 3, gap: 2 }}>
              {(["es", "en"] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang_(l)} style={{ background: lang === l ? em : "none", color: lang === l ? "#000" : "rgba(236,253,245,0.6)", border: "none", borderRadius: 6, padding: "3px 9px", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>{l}</button>
              ))}
            </div>
            {user ? (
              <button onClick={() => navigate(user.rol === "admin" ? "/admin" : user.rol === "coach" ? "/coach" : "/cliente")} style={{ background: em, color: "#000", border: "none", borderRadius: 50, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t.nav_panel}</button>
            ) : (
              <>
                <button onClick={goLogin} className="lp-hide-mobile" style={{ background: "none", border: `1.5px solid rgba(16,185,129,0.5)`, color: em, borderRadius: 50, padding: "7px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{t.nav_login}</button>
                <button onClick={goLogin} style={{ background: em, color: "#000", border: "none", borderRadius: 50, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t.nav_cta}</button>
              </>
            )}
            {/* Hamburger */}
            <button className="lp-show-mobile" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ width: 22, height: 2, background: white, borderRadius: 2, transition: "transform 0.25s", transform: menuOpen ? "rotate(45deg) translateY(7px)" : "none" }} />
              <div style={{ width: 22, height: 2, background: white, borderRadius: 2, opacity: menuOpen ? 0 : 1, transition: "opacity 0.2s" }} />
              <div style={{ width: 22, height: 2, background: white, borderRadius: 2, transition: "transform 0.25s", transform: menuOpen ? "rotate(-45deg) translateY(-7px)" : "none" }} />
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: dark, borderTop: "1px solid rgba(16,185,129,0.15)", padding: "12px 24px 20px" }}>
            {navLinks.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", width: "100%", background: "none", border: "none", color: textLight, fontSize: 16, padding: "13px 0", textAlign: "left", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{label}</button>
            ))}
            {!user && <button onClick={goLogin} style={{ display: "block", width: "100%", background: em, color: "#000", border: "none", borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 16 }}>{t.nav_login}</button>}
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════
          HERO — Video background
      ═══════════════════════════════════════ */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* Video */}
        {heroVideo ? (
          <video autoPlay muted loop playsInline preload="metadata" poster="https://images.pexels.com/photos/4761411/pexels-photo-4761411.jpeg?auto=compress&cs=tinysrgb&w=1200" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.32 }}>
            <source src="https://videos.pexels.com/video-files/4761411/4761411-hd_1920_1080_25fps.mp4" type="video/mp4" />
          </video>
        ) : (
          <img src="https://images.pexels.com/photos/4761411/pexels-photo-4761411.jpeg?auto=compress&cs=tinysrgb&w=800" alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.32 }} />
        )}
        {/* Overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(10,15,13,0.88) 0%, rgba(10,15,13,0.62) 100%)" }} />

        {/* Content */}
        <div className="hero-content" style={{ position: "relative", zIndex: 1, maxWidth: 820, padding: "100px 24px 80px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {/* Tag */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 20, padding: "7px 18px", marginBottom: 32, animation: "pulse 3s infinite" }}>
            <span style={{ color: em, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em" }}>{t.hero_tag}</span>
          </div>
          {/* Title */}
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(42px,7vw,80px)", fontWeight: 700, lineHeight: 1.05, marginBottom: 24, color: white }}>
            {t.hero_title1}<br />
            {t.hero_title2}<span style={{ color: em }}>{t.hero_title_green}</span>
          </h1>
          {/* Subtitle */}
          <p style={{ fontSize: "clamp(16px,2vw,20px)", color: textMuted, lineHeight: 1.65, marginBottom: 40, maxWidth: 600, whiteSpace: "pre-line" }}>{t.hero_sub}</p>
          {/* Buttons */}
          <div className="hero-btns" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 56 }}>
            <button onClick={goLogin} style={{ background: em, color: "#000", border: "none", borderRadius: 50, padding: "15px 32px", fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "transform 0.15s, opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
              {t.hero_btn1}
            </button>
            <button onClick={() => scrollTo("como-funciona")} style={{ background: "none", border: `1.5px solid rgba(255,255,255,0.5)`, color: white, borderRadius: 50, padding: "15px 32px", fontWeight: 600, fontSize: 16, cursor: "pointer", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = white} onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"}>
              {t.hero_btn2}
            </button>
          </div>
          {/* Stats */}
          <div className="hero-stats" style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            {[
              { n: 6, s: "", d: 0, label: t.stat1_label },
              { n: 17, s: "", d: 0, label: t.stat2_label },
              { n: 3, s: "", d: 0, label: t.stat3_label },
              { n: 2, s: "", d: 0, label: t.stat4_label },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 34, fontWeight: 900, color: white }}>
                  {stat.n}{stat.s}
                </div>
                <div style={{ fontSize: 13, color: textMuted, marginTop: 3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
          {/* Scroll indicator */}
          <div style={{ marginTop: 64, display: "flex", justifyContent: "center", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animation: "bounce 2s infinite" }}>
              <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, transparent, ${em})` }} />
              <span style={{ fontSize: 20 }}>↓</span>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.75} }
          @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
        `}</style>
      </section>

      {/* ═══════════════════════════════════════
          SOCIAL PROOF STRIP
      ═══════════════════════════════════════ */}
      <section style={{ background: white, padding: "24px clamp(16px,4vw,40px)", overflow: "hidden" }}>
        <div ref={fProof} style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ color: textGray, fontSize: 14, fontWeight: 500, flexShrink: 0 }}>{t.proof_intro}</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES — Alternating
      ═══════════════════════════════════════ */}
      <section id="caracteristicas" style={{ background: white, padding: "100px clamp(16px,4vw,40px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div ref={fFeat} style={{ textAlign: "center", marginBottom: 72 }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px,4vw,46px)", fontWeight: 800, color: textDark, marginBottom: 16 }}>{t.feat_title}</h2>
            <p style={{ color: textGray, fontSize: 18, maxWidth: 520, margin: "0 auto" }}>{t.feat_sub}</p>
          </div>
          {/* Feature rows */}
          {[
            { img: "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=600", tag: t.f1_tag, title: t.f1_title, desc: t.f1_desc, checks: [t.f1_c1, t.f1_c2, t.f1_c3, t.f1_c4], reverse: false },
            { img: "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=600", tag: t.f2_tag, title: t.f2_title, desc: t.f2_desc, checks: [t.f2_c1, t.f2_c2, t.f2_c3, t.f2_c4], reverse: true },
            { img: "https://images.pexels.com/photos/3822356/pexels-photo-3822356.jpeg?auto=compress&cs=tinysrgb&w=600", tag: t.f3_tag, title: t.f3_title, desc: t.f3_desc, checks: [t.f3_c1, t.f3_c2, t.f3_c3, t.f3_c4], reverse: false },
            { img: "https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg?auto=compress&cs=tinysrgb&w=600", tag: t.f4_tag, title: t.f4_title, desc: t.f4_desc, checks: [t.f4_c1, t.f4_c2, t.f4_c3, t.f4_c4], reverse: true },
          ].map((f, i) => (
            <FeatureRow key={i} {...f} />
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          VIDEO DEMO — dark
      ═══════════════════════════════════════ */}
      <section style={{ background: dark, padding: "100px clamp(16px,4vw,40px)" }}>
        <div ref={fVideo} style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(26px,4vw,44px)", fontWeight: 800, color: white, marginBottom: 12 }}>{t.video_title}</h2>
          <p style={{ color: em, fontSize: 18, marginBottom: 48 }}>{t.video_sub}</p>
          <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 0 60px rgba(16,185,129,0.28)", marginBottom: 48 }}>
            <video controls poster="https://images.pexels.com/photos/4761411/pexels-photo-4761411.jpeg?auto=compress&cs=tinysrgb&w=800" style={{ width: "100%", display: "block" }}>
              <source src="https://videos.pexels.com/video-files/4761411/4761411-hd_1920_1080_25fps.mp4" type="video/mp4" />
            </video>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
            {[t.vp1, t.vp2, t.vp3].map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, background: "rgba(16,185,129,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{p.split(" ")[0]}</div>
                <span style={{ color: "rgba(236,253,245,0.75)", fontSize: 15, fontWeight: 500 }}>{p.slice(3)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          STEPS — light gray
      ═══════════════════════════════════════ */}
      <section id="como-funciona" style={{ background: light, padding: "100px clamp(16px,4vw,40px)" }}>
        <div ref={fSteps} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(26px,4vw,44px)", fontWeight: 800, color: textDark, textAlign: "center", marginBottom: 64 }}>{t.steps_title}</h2>
          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
            {[
              { n: "01", icon: "🎯", title: t.s1_title, desc: t.s1_desc, img: "https://images.pexels.com/photos/3822621/pexels-photo-3822621.jpeg?auto=compress&cs=tinysrgb&w=300" },
              { n: "02", icon: "🤖", title: t.s2_title, desc: t.s2_desc, img: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300" },
              { n: "03", icon: "🚀", title: t.s3_title, desc: t.s3_desc, img: "https://images.pexels.com/photos/3757376/pexels-photo-3757376.jpeg?auto=compress&cs=tinysrgb&w=300" },
            ].map((s, i) => (
              <div key={i} style={{ background: white, borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", transition: "transform 0.25s, box-shadow 0.25s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = `0 12px 40px rgba(16,185,129,0.18)`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.07)"; }}>
                <img loading="lazy" decoding="async" src={s.img} alt={s.title} style={{ width: "100%", height: 180, objectFit: "cover" }} />
                <div style={{ padding: 28 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 900, color: em, lineHeight: 1, marginBottom: 8 }}>{s.n}</div>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{s.icon}</div>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: textDark, marginBottom: 12 }}>{s.title}</h3>
                  <p style={{ color: textGray, fontSize: 14, lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          ABOUT NAHOMY — white
      ═══════════════════════════════════════ */}
      <section id="sobre-nahomy" style={{ background: white, padding: "100px clamp(16px,4vw,40px)" }}>
        <div ref={fAbout} style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="about-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 64, alignItems: "center" }}>
            {/* Photo */}
            <div style={{ borderRadius: 20, overflow: "hidden", position: "relative" }}>
              <img loading="lazy" decoding="async" src="https://images.pexels.com/photos/3763872/pexels-photo-3763872.jpeg?auto=compress&cs=tinysrgb&w=500" alt="Coach Nahomy" style={{ width: "100%", height: 500, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", bottom: 20, left: 20, background: "rgba(16,185,129,0.96)", color: "#000", padding: "12px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
                Nahomy · Head Coach & Fundadora
              </div>
            </div>
            {/* Text */}
            <div>
              <div style={{ display: "inline-block", background: `${em}20`, border: `1px solid ${em}50`, borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>
                <span style={{ color: em, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>{t.about_tag}</span>
              </div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px,4vw,48px)", fontWeight: 800, color: textDark, marginBottom: 20, lineHeight: 1.1 }}>
                {t.about_title1}<br />{t.about_title2}
              </h2>
              <p style={{ color: textGray, fontSize: 16, lineHeight: 1.75, marginBottom: 20 }}>{t.about_p1}</p>
              <p style={{ color: textGray, fontSize: 16, lineHeight: 1.75, marginBottom: 28 }}>{t.about_p2}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
                {[t.badge1, t.badge2, t.badge3].map(c => (
                  <span key={c} style={{ background: `${em}15`, border: `1px solid ${em}40`, color: "#059669", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 600 }}>{c}</span>
                ))}
              </div>
              <blockquote style={{ borderLeft: `3px solid ${em}`, paddingLeft: 20, marginBottom: 28 }}>
                <p style={{ color: em, fontStyle: "italic", fontSize: 20, fontWeight: 600 }}>"{t.about_quote}"</p>
              </blockquote>
              <button onClick={goLogin} style={{ background: em, color: "#000", border: "none", borderRadius: 50, padding: "13px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>{t.about_btn}</button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          PRICING — dark
      ═══════════════════════════════════════ */}
      <section id="planes" style={{ background: dark, padding: "100px clamp(16px,4vw,40px)" }}>
        <div ref={fPlans} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(26px,4vw,44px)", fontWeight: 800, color: white, textAlign: "center", marginBottom: 40 }}>{t.plans_title}</h2>
          {/* Toggle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: 4, gap: 4 }}>
              {([["m", t.billing_m], ["q", t.billing_q], ["s", t.billing_s]] as const).map(([v, label]) => (
                <button key={v} onClick={() => setBilling(v)} style={{ background: billing === v ? em : "none", color: billing === v ? "#000" : "rgba(236,253,245,0.6)", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.25s", whiteSpace: "nowrap" }}>{label}</button>
              ))}
            </div>
          </div>
          {/* Cards */}
          <div className="plans-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {displayPlanes.map((plan, i) => {
              const isPop = i === 1;
              const isVip = i === 2;
              const precio = Math.round((plan.precio || 0) * mult);
              const original = plan.precio || 0;
              return (
                <div key={plan.id} style={{
                  background: dark2, borderRadius: 20, padding: 32, position: "relative",
                  border: isPop ? `2px solid ${em}` : isVip ? "1px solid #F59E0B40" : "1px solid #1A2E20",
                  transition: "transform 0.25s, box-shadow 0.25s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = `0 16px 48px rgba(16,185,129,0.18)`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                  {isPop && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: em, color: "#000", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{t.plan_popular}</div>}
                  {isVip && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#F59E0B", color: "#000", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{t.plan_all}</div>}
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: white, marginBottom: 8 }}>{plan.nombre}</h3>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 42, fontWeight: 900, color: isPop ? em : white }}>${precio}</span>
                    <span style={{ color: "rgba(236,253,245,0.5)", fontSize: 15 }}>/mes</span>
                  </div>
                  {billing !== "m" && (
                    <div style={{ color: "rgba(236,253,245,0.4)", fontSize: 13, marginBottom: 20, textDecoration: "line-through" }}>${original}/mes</div>
                  )}
                  <div style={{ marginBottom: 28, marginTop: billing === "m" ? 20 : 0 }}>
                    {(plan.descripcion || "").split("\n").filter(Boolean).map((item: string, j: number) => (
                      <div key={j} style={{ display: "flex", gap: 10, fontSize: 14, color: "rgba(236,253,245,0.7)", marginBottom: 10 }}>
                        <span style={{ color: em, flexShrink: 0, fontWeight: 700 }}>✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={goLogin} style={{ width: "100%", background: isPop ? em : "none", color: isPop ? "#000" : em, border: `1.5px solid ${em}`, borderRadius: 50, padding: "13px", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => { if (!isPop) { e.currentTarget.style.background = em; e.currentTarget.style.color = "#000"; } }}
                    onMouseLeave={e => { if (!isPop) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = em; } }}>
                    {t.plan_cta} {plan.nombre}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          TESTIMONIOS — light
      ═══════════════════════════════════════ */}
      <section style={{ background: light, padding: "100px clamp(16px,4vw,40px)" }}>
        <div ref={fTest} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(26px,4vw,44px)", fontWeight: 800, color: textDark, marginBottom: 10 }}>{t.test_title}</h2>
            <p style={{ color: textGray, fontSize: 17 }}>{t.test_sub}</p>
          </div>
          <div className="test-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {testimonios.map((t_, i) => (
              <div key={i} style={{ background: white, borderRadius: 20, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.07)", transition: "transform 0.25s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-6px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ fontSize: 30, marginBottom: 14 }} aria-hidden="true">{t_.icon}</div>
                <div style={{ fontWeight: 700, color: textDark, fontSize: 17, marginBottom: 10 }}>{t_.title}</div>
                <p style={{ color: textGray, fontSize: 14, lineHeight: 1.7 }}>{t_.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA FINAL — verde con imagen
      ═══════════════════════════════════════ */}
      <section id="contacto" style={{ position: "relative", padding: "100px clamp(16px,4vw,40px)", textAlign: "center", overflow: "hidden", background: em }}>
        <img loading="lazy" decoding="async" src="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18, mixBlendMode: "multiply" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px,5vw,60px)", fontWeight: 900, color: textDark, marginBottom: 16 }}>{t.cta_title}</h2>
          <p style={{ color: "rgba(0,0,0,0.65)", fontSize: 18, marginBottom: 44 }}>{t.cta_sub}</p>
          <button onClick={goLogin} style={{ background: dark, color: em, border: "none", borderRadius: 50, padding: "17px 44px", fontWeight: 800, fontSize: 18, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}>
            {t.cta_btn}
          </button>
          <p style={{ color: "rgba(0,0,0,0.5)", fontSize: 14, marginTop: 18 }}>{t.cta_fine}</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════ */}
      <footer style={{ background: dark, padding: "64px clamp(16px,4vw,40px) 40px", borderTop: "1px solid rgba(16,185,129,0.12)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="footer-grid" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40, marginBottom: 48, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 28, marginBottom: 10 }}>
                <span style={{ color: white }}>NAHOFIT</span><span style={{ color: em }}>.</span><span style={{ color: em }}>LIFE</span>
              </div>
              <p style={{ color: "rgba(236,253,245,0.45)", fontSize: 14, maxWidth: 260, lineHeight: 1.6 }}>{t.footer_tag}</p>
            </div>
            <div style={{ display: "flex", gap: 60, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: white, fontWeight: 700, fontSize: 14, marginBottom: 16, letterSpacing: "0.06em" }}>NAHOFIT.LIFE</div>
                {[["caracteristicas", t.nav_feat], ["planes", t.nav_plans], ["sobre-nahomy", t.nav_about]].map(([id, label]) => (
                  <button key={id} onClick={() => scrollTo(id)} style={{ display: "block", background: "none", border: "none", color: "rgba(236,253,245,0.5)", fontSize: 14, marginBottom: 10, cursor: "pointer", textAlign: "left", transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = textLight} onMouseLeave={e => e.currentTarget.style.color = "rgba(236,253,245,0.5)"}>
                    {label}
                  </button>
                ))}
                <button onClick={goLogin} style={{ display: "block", background: "none", border: "none", color: "rgba(236,253,245,0.5)", fontSize: 14, cursor: "pointer", textAlign: "left", transition: "color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = textLight} onMouseLeave={e => e.currentTarget.style.color = "rgba(236,253,245,0.5)"}>
                  {t.nav_login}
                </button>
              </div>
              <div>
                <div style={{ color: white, fontWeight: 700, fontSize: 14, marginBottom: 16, letterSpacing: "0.06em" }}>CONTACTO</div>
                {[["Instagram", "https://instagram.com"], ["WhatsApp", "https://wa.me/"], ["coach@nahofit.life", "mailto:coach@nahofit.life"]].map(([label, href]) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" style={{ display: "block", color: "rgba(236,253,245,0.5)", fontSize: 14, marginBottom: 10, textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = em} onMouseLeave={e => e.currentTarget.style.color = "rgba(236,253,245,0.5)"}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(16,185,129,0.1)", paddingTop: 24, textAlign: "center", color: "rgba(236,253,245,0.3)", fontSize: 13 }}>
            {t.footer_copy}
            <p style={{ marginTop: 10, maxWidth: 640, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>{t.disclaimer}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Feature Row component ──────────────────────────────────────────────────────
function FeatureRow({ img, tag, title, desc, checks, reverse }: {
  img: string; tag: string; title: string; desc: string; checks: string[]; reverse: boolean;
}) {
  const ref = useFade();
  const em = "#10B981";
  return (
    <div ref={ref} className="feat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", marginBottom: 80, direction: reverse ? "rtl" : "ltr" }}>
      <div style={{ borderRadius: 20, overflow: "hidden", direction: "ltr" }}>
        <img src={img} alt={title} style={{ width: "100%", height: 380, objectFit: "cover", display: "block", transition: "transform 0.4s" }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
      </div>
      <div className="feat-reverse" style={{ direction: "ltr" }}>
        <div style={{ display: "inline-block", background: "#10B98115", border: "1px solid #10B98140", color: em, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 18 }}>{tag}</div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, color: "#0A0F0D", marginBottom: 16, lineHeight: 1.2 }}>{title}</h3>
        <p style={{ color: "#6B7280", fontSize: 16, lineHeight: 1.75, marginBottom: 24 }}>{desc}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {checks.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 22, height: 22, background: em, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#000", fontWeight: 800, flexShrink: 0 }}>✓</div>
              <span style={{ color: "#374151", fontSize: 15 }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
