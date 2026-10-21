import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadMessages() {
  const { user } = useAuth();
  const enabled = !!user && user.rol === "cliente";

  const { data } = useQuery({
    queryKey: ["/api/mensajes/no-leidos"],
    queryFn: () => customFetch<{ cantidad: number }>("/api/mensajes/no-leidos"),
    enabled,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  return { cantidad: data?.cantidad ?? 0 };
}
