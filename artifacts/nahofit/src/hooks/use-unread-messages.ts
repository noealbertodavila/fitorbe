import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadMessages() {
  const { user } = useAuth();
  // Cliente y coach: número en "Mensajes" y en la pestaña del navegador.
  const enabled = !!user && (user.rol === "cliente" || user.rol === "coach");

  const { data } = useQuery({
    queryKey: ["/api/mensajes/no-leidos"],
    queryFn: () => customFetch<{ cantidad: number }>("/api/mensajes/no-leidos"),
    enabled,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  return { cantidad: data?.cantidad ?? 0 };
}
