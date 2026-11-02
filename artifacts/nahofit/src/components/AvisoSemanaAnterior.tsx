import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Info } from "lucide-react";

/** Aviso al cliente cuando ve el plan de una semana anterior porque el de esta semana aún no está publicado. */
export function AvisoSemanaAnterior({ semana, que }: { semana: string; que: string }) {
  return (
    <div className="flex gap-3 items-start rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">
      <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <p className="text-white/90">
        Estás viendo tu {que} de la semana del {format(parseISO(semana), "d 'de' MMMM", { locale: es })}.
        Tu coach todavía no publica el de esta semana; mientras tanto puedes seguir este.
      </p>
    </div>
  );
}
