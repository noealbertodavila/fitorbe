import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Link } from "wouter";
import { CheckCircle2, Circle, X, Rocket } from "lucide-react";

const KEY = "fitorbe_primeros_pasos_oculto";

type Estado = { logo: boolean; cliente: boolean; rutina: boolean; comida: boolean; mensaje: boolean };

const lista = async (url: string) => {
  try {
    const r = await customFetch<unknown>(url);
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
};

/** Primeros pasos para un coach nuevo (como en Obrix). Desaparece al completarlos o al cerrarlo. */
export function PrimerosPasos() {
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
  });
  const { data } = useQuery<Estado>({
    queryKey: ["/api/primeros-pasos"],
    enabled: !oculto,
    staleTime: 60_000,
    queryFn: async () => {
      const [negocio, clientes, conversaciones] = await Promise.all([
        customFetch<{ logo?: string | null }>("/api/mi-negocio").catch(() => null),
        lista("/api/clientes"),
        lista("/api/mensajes/conversaciones"),
      ]);
      const primero = (clientes as { id: number }[])[0];
      const [rutinas, comidas] = primero
        ? await Promise.all([lista(`/api/rutinas/semanas/${primero.id}`), lista(`/api/planes-comida/semanas/${primero.id}`)])
        : [[], []];
      return { logo: !!negocio?.logo, cliente: clientes.length > 0, rutina: rutinas.length > 0, comida: comidas.length > 0, mensaje: conversaciones.length > 0 };
    },
  });
  if (oculto || !data) return null;

  const pasos = [
    { hecho: data.logo, texto: "Pon el nombre y el logo de tu negocio", href: "/coach/negocio" },
    { hecho: data.cliente, texto: "Agrega a tu primer cliente", href: "/coach/clientes" },
    { hecho: data.rutina, texto: "Prepara y publica su rutina", href: "/coach/rutinas" },
    { hecho: data.comida, texto: "Prepara su plan de comida", href: "/coach/nutricion" },
    { hecho: data.mensaje, texto: "Mándale un mensaje de bienvenida", href: "/coach/mensajes" },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  if (hechos === pasos.length) return null;
  const cerrar = () => { try { localStorage.setItem(KEY, "1"); } catch { /* sin almacenamiento */ } setOculto(true); };

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-5" aria-labelledby="primeros-pasos">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0"><Rocket className="w-5 h-5 text-primary" /></span>
          <div>
            <h2 id="primeros-pasos" className="text-lg font-syne font-bold text-white">Primeros pasos</h2>
            <p className="text-sm text-muted-foreground">{hechos} de {pasos.length} listos</p>
          </div>
        </div>
        <button onClick={cerrar} className="w-10 h-10 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-white/5" aria-label="Ocultar primeros pasos">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 mt-4 overflow-hidden" aria-hidden="true">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(hechos / pasos.length) * 100}%` }} />
      </div>
      <ol className="mt-4 grid gap-1 sm:grid-cols-2">
        {pasos.map((p) => (
          <li key={p.texto}>
            <Link href={p.href} className={`flex items-center gap-3 min-h-[44px] px-2 rounded-md hover:bg-white/5 ${p.hecho ? "text-muted-foreground line-through" : "text-white"}`}>
              {p.hecho ? <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
              <span className="text-sm">{p.texto}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
