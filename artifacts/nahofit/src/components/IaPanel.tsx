import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Sparkles, ClipboardCheck } from "lucide-react";

interface UsoIa { plan: string; estado: string; limite: number; usadas: number; quedan: number; renueva: string }

export const CLAVE_USO_IA = ["/api/ia/uso"];

/** Contador de IA del coach: cuántas generaciones le quedan este mes. */
export function UsoIA() {
  const { data } = useQuery({
    queryKey: CLAVE_USO_IA,
    queryFn: () => customFetch<UsoIa>("/api/ia/uso"),
    staleTime: 30_000,
  });
  if (!data) return null;
  if (data.limite === 0) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" /> Tu plan no incluye IA: crea los planes a mano o copia una semana anterior. Con Pro o Estudio la IA te propone borradores.
      </p>
    );
  }
  const poco = data.quedan <= Math.max(5, Math.round(data.limite * 0.1));
  return (
    <p className={`text-xs flex items-center gap-1.5 ${poco ? "text-amber-400" : "text-muted-foreground"}`}>
      <Sparkles className="w-3.5 h-3.5" />
      IA: te quedan {data.quedan} de {data.limite} generaciones este mes{data.estado === "prueba" ? " (prueba gratis)" : ""}. Copiar una semana no gasta.
    </p>
  );
}

/** Lo que la app evaluó y decidió antes de que la IA armara el borrador. */
export function AnalisisIA({ resumen }: { resumen?: string[] | null }) {
  if (!resumen?.length) return null;
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
        <ClipboardCheck className="w-4 h-4 text-primary" /> Evaluación del cliente
      </p>
      <ul className="space-y-1 text-sm text-white/85 list-disc pl-5">
        {resumen.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <p className="text-xs text-muted-foreground mt-2">Revisa y ajusta el borrador antes de publicar: tú tienes la última palabra.</p>
    </div>
  );
}
