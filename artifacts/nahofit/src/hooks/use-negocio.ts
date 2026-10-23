import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

/** El negocio del coach (el propio para el coach; el de su coach para el cliente). */
export type Negocio = {
  negocio: string;
  slug: string;
  logo: string | null;
  colorPrimario: string | null;
  coachId: number;
  coachNombre: string;
  estado?: string;
  plan?: string;
  pruebaHasta?: string | null;
};

export function useNegocio() {
  const { user } = useAuth();
  const q = useQuery<Negocio | null>({
    queryKey: ["/api/mi-negocio"],
    queryFn: () => customFetch<Negocio | null>("/api/mi-negocio"),
    enabled: !!user && user.rol !== "admin",
    staleTime: 5 * 60 * 1000,
  });
  const n = q.data ?? null;
  return {
    ...q,
    negocio: n,
    /** Nombre de la marca que se muestra (el negocio del coach, o Fitorbe). */
    marca: n?.negocio || "Fitorbe",
    /** Nombre del coach (para "Escríbele a …", "Elaborado por …"). */
    coachNombre: n?.coachNombre || "tu coach",
  };
}
