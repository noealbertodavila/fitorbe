import { useState } from "react";
import { Link } from "wouter";

/**
 * Política de privacidad y Términos de NAHOFIT.LIFE (coaching de Nahomy), en español e inglés.
 * Es un texto base claro; conviene que un abogado lo revise.
 */
type Lang = "es" | "en";
const ACTUALIZADO = "22 de octubre de 2026";
const UPDATED = "October 22, 2026";

type Seccion = { t: string; p: string[] };

const PRIVACIDAD: Record<Lang, { title: string; intro: string; s: Seccion[] }> = {
  es: {
    title: "Política de privacidad",
    intro:
      "NAHOFIT.LIFE es el servicio de coaching en línea de la coach Nahomy, en Salt Lake City, Utah. Aquí explicamos qué datos guardamos, para qué y quién los ve. Tus datos de salud son tuyos: los usamos solo para acompañarte.",
    s: [
      { t: "Qué datos guardamos", p: [
        "Cuenta: nombre, correo, teléfono y contraseña (guardada cifrada).",
        "Perfil: edad, sexo, peso, altura, objetivo, nivel, horario, lugar donde entrenas y equipo.",
        "Salud: lesiones, condiciones médicas, medicamentos, zonas a evitar, alergias y lo que no comes. Son datos sensibles y los tratamos con cuidado especial.",
        "Progreso: fotos de tu cuerpo, medidas y peso que tú subes.",
        "Bienestar: tu ánimo, energía, sueño, diario y notas.",
        "Mensajes con tu coach y con el asistente de IA, y el registro de tus pagos.",
      ]},
      { t: "Para qué los usamos", p: [
        "Para preparar tus rutinas y planes de comida, darte seguimiento, avisarle a tu coach si necesitas apoyo y llevar tus pagos.",
        "No vendemos tus datos ni los usamos para publicidad.",
      ]},
      { t: "Quién los ve", p: [
        "Tú, tu coach (Nahomy) y la persona que administra la plataforma. Otros clientes no ven nada tuyo.",
        "Inteligencia artificial: para proponer rutinas, planes de comida y responder el chat, enviamos tu perfil y tu mensaje a nuestro proveedor de IA (Anthropic). Solo se usa para generar esa respuesta. Tu coach revisa cada rutina y plan antes de que te llegue.",
        "La app y los datos se guardan en servidores de nuestro proveedor de hospedaje en Estados Unidos.",
        "Solo compartiríamos datos si la ley nos obliga o para proteger la vida de alguien en peligro.",
      ]},
      { t: "Tus fotos", p: [
        "Tus fotos de progreso son privadas. Nunca se publican ni se usan en anuncios sin tu permiso por escrito.",
      ]},
      { t: "Cuánto tiempo los guardamos y cómo borrarlos", p: [
        "Mientras tengas tu cuenta. Puedes pedir una copia de tus datos o que los borremos; lo hacemos en un máximo de 30 días, salvo lo que la ley nos pida guardar (por ejemplo, registros de pago).",
      ]},
      { t: "Seguridad", p: [
        "Las contraseñas se guardan cifradas, la conexión es segura (HTTPS) y cada cliente solo puede ver lo suyo. Ningún sistema es 100% seguro: si pasara algo que afecte tus datos, te avisamos.",
      ]},
      { t: "Edad", p: ["El servicio es para mayores de 18 años."] },
      { t: "Cambios y contacto", p: [
        "Si cambiamos esta política te avisamos en la app. Para cualquier pregunta o para pedir tus datos, escríbele a tu coach desde Mensajes en la app.",
      ]},
    ],
  },
  en: {
    title: "Privacy policy",
    intro:
      "NAHOFIT.LIFE is coach Nahomy's online coaching service, based in Salt Lake City, Utah. This explains what data we keep, why, and who sees it. Your health data is yours: we only use it to support you.",
    s: [
      { t: "What we keep", p: [
        "Account: name, email, phone and password (stored encrypted).",
        "Profile: age, sex, weight, height, goal, level, schedule, where you train and your equipment.",
        "Health: injuries, medical conditions, medications, areas to avoid, allergies and foods you don't eat. This is sensitive data and we handle it with special care.",
        "Progress: body photos, measurements and weight you upload.",
        "Wellbeing: your mood, energy, sleep, journal and notes.",
        "Messages with your coach and the AI assistant, and your payment records.",
      ]},
      { t: "Why we use it", p: [
        "To prepare your workouts and meal plans, follow your progress, let your coach know if you need support, and keep track of payments.",
        "We don't sell your data or use it for advertising.",
      ]},
      { t: "Who sees it", p: [
        "You, your coach (Nahomy) and the platform administrator. Other clients can't see anything of yours.",
        "Artificial intelligence: to suggest workouts and meal plans and answer the chat, we send your profile and your message to our AI provider (Anthropic). It is only used to generate that answer. Your coach reviews every workout and plan before you get it.",
        "The app and data are stored on our hosting provider's servers in the United States.",
        "We would only share data if the law requires it or to protect someone's life in danger.",
      ]},
      { t: "Your photos", p: ["Your progress photos are private. They are never published or used in ads without your written permission."] },
      { t: "How long we keep it and how to delete it", p: [
        "While you have your account. You can ask for a copy of your data or for us to delete it; we do it within 30 days, except what the law requires us to keep (for example, payment records).",
      ]},
      { t: "Security", p: [
        "Passwords are stored encrypted, the connection is secure (HTTPS) and each client can only see their own data. No system is 100% secure: if something ever affects your data, we will tell you.",
      ]},
      { t: "Age", p: ["The service is for people 18 and older."] },
      { t: "Changes and contact", p: [
        "If we change this policy we'll let you know in the app. For any question or to request your data, write to your coach from Messages in the app.",
      ]},
    ],
  },
};

const TERMINOS: Record<Lang, { title: string; intro: string; s: Seccion[] }> = {
  es: {
    title: "Términos de uso",
    intro: "Al usar NAHOFIT.LIFE aceptas estos términos. Están escritos para que se entiendan.",
    s: [
      { t: "El servicio", p: ["Coaching en línea de fitness, nutrición y bienestar con la coach Nahomy, con ayuda de herramientas de inteligencia artificial que ella revisa."] },
      { t: "No es consejo médico", p: [
        "NAHOFIT.LIFE no sustituye a tu médico, nutriólogo clínico ni terapeuta. Consulta a tu médico antes de empezar un programa de ejercicio o de alimentación, sobre todo si tienes alguna condición de salud, estás embarazada o tomas medicamentos.",
        "Si sientes dolor fuerte, mareo, falta de aire o cualquier síntoma raro, para y busca atención médica.",
      ]},
      { t: "Si estás en crisis", p: ["Si piensas en hacerte daño, llama o manda mensaje al 988 (Línea de Crisis y Suicidio, 24 horas) o al 911 si estás en peligro inmediato. La app no es un servicio de emergencias."] },
      { t: "Resultados", p: ["Cada cuerpo es distinto. No garantizamos un resultado específico de peso, medidas o salud; depende de muchos factores, incluido seguir el plan."] },
      { t: "El asistente de IA", p: ["El chat con IA da orientación general y puede equivocarse. Lo que diga no es una indicación médica. Ante dudas importantes, pregúntale a tu coach."] },
      { t: "Tu cuenta", p: ["Eres responsable de tu contraseña y de que tus datos sean ciertos (sobre todo los de salud). La cuenta es personal."] },
      { t: "Pagos y cancelación", p: ["El precio y la forma de pago son los de tu plan. Puedes cancelar cuando quieras; el servicio sigue hasta el final del periodo pagado. Lo ya pagado no se reembolsa, salvo que se acuerde con tu coach."] },
      { t: "Contenido", p: ["Las rutinas, planes y materiales son para tu uso personal; no se pueden revender ni publicar."] },
      { t: "Responsabilidad", p: ["Haces los ejercicios y sigues los planes bajo tu propia responsabilidad. En la medida que la ley lo permita, NAHOFIT.LIFE no responde por lesiones o daños derivados de su uso."] },
      { t: "Ley aplicable y cambios", p: ["Estos términos se rigen por las leyes del estado de Utah, EE. UU. Si cambian, te avisamos en la app."] },
    ],
  },
  en: {
    title: "Terms of use",
    intro: "By using NAHOFIT.LIFE you accept these terms. They are written to be easy to understand.",
    s: [
      { t: "The service", p: ["Online fitness, nutrition and wellbeing coaching with coach Nahomy, with help from artificial intelligence tools that she reviews."] },
      { t: "Not medical advice", p: [
        "NAHOFIT.LIFE does not replace your doctor, clinical dietitian or therapist. Talk to your doctor before starting an exercise or eating program, especially if you have a health condition, are pregnant or take medication.",
        "If you feel strong pain, dizziness, shortness of breath or any unusual symptom, stop and seek medical care.",
      ]},
      { t: "If you're in crisis", p: ["If you're thinking about hurting yourself, call or text 988 (Suicide & Crisis Lifeline, 24/7) or 911 if you're in immediate danger. The app is not an emergency service."] },
      { t: "Results", p: ["Every body is different. We don't guarantee a specific weight, measurement or health result; it depends on many factors, including following the plan."] },
      { t: "The AI assistant", p: ["The AI chat gives general guidance and can make mistakes. Nothing it says is medical advice. For important questions, ask your coach."] },
      { t: "Your account", p: ["You're responsible for your password and for your information being accurate (especially health information). The account is personal."] },
      { t: "Payments and cancellation", p: ["The price and payment method are those of your plan. You can cancel anytime; the service continues until the end of the paid period. Amounts already paid are not refunded unless agreed with your coach."] },
      { t: "Content", p: ["Workouts, plans and materials are for your personal use; they can't be resold or published."] },
      { t: "Liability", p: ["You do the exercises and follow the plans at your own risk. To the extent allowed by law, NAHOFIT.LIFE is not liable for injuries or damages arising from their use."] },
      { t: "Governing law and changes", p: ["These terms are governed by the laws of the State of Utah, USA. If they change, we'll let you know in the app."] },
    ],
  },
};

function Pagina({ doc }: { doc: typeof PRIVACIDAD }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("nahofit_idioma") as Lang) || "es");
  const d = doc[lang];
  return (
    <div style={{ minHeight: "100vh", background: "#0A0F0D", color: "#ECFDF5", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
          <Link href="/" style={{ color: "#fff", textDecoration: "none", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20 }}>
            NAHOFIT<span style={{ color: "#10B981" }}>.LIFE</span>
          </Link>
          <div role="group" aria-label="Idioma / Language" style={{ display: "flex", gap: 4 }}>
            {(["es", "en"] as const).map((l) => (
              <button key={l} onClick={() => { setLang(l); localStorage.setItem("nahofit_idioma", l); }} aria-pressed={lang === l}
                style={{ minHeight: 40, padding: "0 14px", borderRadius: 8, border: "1px solid #1F3A2B", background: lang === l ? "#10B981" : "transparent", color: lang === l ? "#000" : "#ECFDF5", fontWeight: 700, cursor: "pointer" }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, margin: "0 0 8px" }}>{d.title}</h1>
        <p style={{ color: "rgba(236,253,245,0.6)", fontSize: 14, margin: "0 0 24px" }}>{lang === "es" ? `Actualizado: ${ACTUALIZADO}` : `Updated: ${UPDATED}`}</p>
        <p style={{ fontSize: 17, lineHeight: 1.7, margin: "0 0 32px" }}>{d.intro}</p>
        {d.s.map((sec) => (
          <section key={sec.t} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px", color: "#6EE7B7" }}>{sec.t}</h2>
            {sec.p.map((p) => (
              <p key={p} style={{ fontSize: 16, lineHeight: 1.7, margin: "0 0 10px", color: "rgba(236,253,245,0.85)" }}>{p}</p>
            ))}
          </section>
        ))}
        <p style={{ marginTop: 40 }}>
          <Link href="/" style={{ color: "#10B981" }}>{lang === "es" ? "← Volver al inicio" : "← Back to home"}</Link>
        </p>
      </main>
    </div>
  );
}

export function Privacidad() {
  return <Pagina doc={PRIVACIDAD} />;
}
export function Terminos() {
  return <Pagina doc={TERMINOS} />;
}
