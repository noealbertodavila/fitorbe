import { Phone, MessageCircle, X } from "lucide-react";

/**
 * Se muestra cuando la persona escribe algo que suena a crisis (hacerse daño o
 * quitarse la vida). Dice con calma dónde pedir ayuda ahora mismo.
 */
export function ApoyoCrisis({ onClose }: { onClose?: () => void }) {
  const en = (localStorage.getItem("nahofit_idioma") ?? "es") === "en";
  const T = en
    ? {
        title: "You're not alone",
        body: "It sounds like you're going through something really hard. If you're thinking about hurting yourself, please reach out right now. People are available 24/7, in English and Spanish.",
        call: "Call 988",
        text: "Text 988",
        emergency: "If you're in immediate danger, call 911.",
        coach: "Nahomy will also see this so she can check in with you.",
        close: "Close",
      }
    : {
        title: "No estás sola",
        body: "Parece que estás pasando por algo muy difícil. Si estás pensando en hacerte daño, por favor pide ayuda ahora mismo. Hay personas disponibles las 24 horas, en español e inglés.",
        call: "Llamar al 988",
        text: "Mensaje al 988",
        emergency: "Si estás en peligro inmediato, llama al 911.",
        coach: "Nahomy también verá esto para poder escribirte.",
        close: "Cerrar",
      };
  return (
    <div role="alertdialog" aria-labelledby="apoyo-titulo" aria-describedby="apoyo-texto"
      className="relative rounded-2xl border-2 border-sky-300 bg-sky-50 p-5 text-sky-950 shadow-sm dark:bg-sky-950/40 dark:text-sky-50">
      {onClose && (
        <button onClick={onClose} aria-label={T.close} className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-sky-100 dark:hover:bg-sky-900">
          <X size={18} />
        </button>
      )}
      <h2 id="apoyo-titulo" className="pr-10 text-lg font-bold">{T.title}</h2>
      <p id="apoyo-texto" className="mt-2 text-sm leading-relaxed">{T.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="tel:988" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-sky-700 px-4 font-semibold text-white hover:bg-sky-800">
          <Phone size={16} /> {T.call}
        </a>
        <a href="sms:988" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-sky-400 px-4 font-semibold hover:bg-sky-100 dark:hover:bg-sky-900">
          <MessageCircle size={16} /> {T.text}
        </a>
      </div>
      <p className="mt-3 text-sm font-medium">{T.emergency}</p>
      <p className="mt-1 text-xs opacity-80">{T.coach}</p>
    </div>
  );
}
