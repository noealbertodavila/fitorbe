import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { getLunesMT } from "@/lib/date-mt";

/**
 * Qué semana mostrarle al cliente: la actual si su coach ya publicó el plan;
 * si no, la última semana publicada antes de hoy (con anterior = true para avisarle).
 * El servidor solo le da al cliente las semanas publicadas.
 */
export function useSemanaPublicada(tipo: "planes-comida" | "rutinas", clienteId: number) {
  const actual = getLunesMT();
  const { data, isLoading } = useQuery({
    queryKey: [`/api/${tipo}/semanas/${clienteId}`],
    queryFn: () => customFetch<{ semanaInicio: string; aprobada: boolean }[]>(`/api/${tipo}/semanas/${clienteId}`),
    enabled: !!clienteId,
    staleTime: 60_000,
  });
  const semanas = Array.isArray(data) ? data.map((s) => s.semanaInicio) : [];
  if (semanas.includes(actual)) return { semana: actual, anterior: false, cargando: isLoading };
  const previa = semanas.filter((s) => s < actual).sort().pop();
  return previa
    ? { semana: previa, anterior: true, cargando: isLoading }
    : { semana: actual, anterior: false, cargando: isLoading };
}
