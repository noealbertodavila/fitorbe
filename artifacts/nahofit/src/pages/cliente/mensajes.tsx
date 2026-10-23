import { useState, useEffect, useRef } from "react";
import { useGetMensajes, getGetMensajesQueryKey, useCreateMensaje, customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, UserCircle, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNegocio } from "@/hooks/use-negocio";

export default function ClienteMensajes() {
  const { marca, coachNombre } = useNegocio();
  const { user } = useAuth();
  const coachId = user?.coachId;
  const [mensajeText, setMensajeText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: mensajes, isLoading } = useGetMensajes(
    coachId || 0,
    undefined,
    { 
      query: { 
        queryKey: getGetMensajesQueryKey(coachId || 0),
        enabled: !!coachId,
        refetchInterval: 15000 
      } 
    }
  );

  // Mark all messages as read when this page mounts
  useEffect(() => {
    if (!user?.id) return;
    customFetch("/api/mensajes/marcar-leidos", { method: "PUT" })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/mensajes/no-leidos"] });
      })
      .catch(() => {});
  }, [user?.id]);

  const createMutation = useCreateMensaje({
    mutation: {
      onSuccess: () => {
        setMensajeText("");
        queryClient.invalidateQueries({ queryKey: [`/api/mensajes/${coachId}`] });
      }
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensajeText.trim() || !coachId) return;
    
    createMutation.mutate({
      data: {
        receptorId: coachId,
        contenido: mensajeText
      }
    });
  };

  if (!coachId) {
    return (
      <div className="h-[calc(100vh-10rem)] flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium text-white">Sin Coach Asignado</p>
        <p className="text-sm">Por favor, contacta a administración para que te asignen un coach.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] animate-in fade-in duration-500 max-w-4xl mx-auto">
      <Card className="bg-card border-border/50 flex flex-col h-full overflow-hidden shadow-xl">
        <div className="p-4 border-b border-border/50 flex items-center space-x-3 bg-background/30">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-[0_0_10px_rgba(127,255,79,0.2)]">
            N
          </div>
          <div>
            <h3 className="font-syne font-bold text-lg text-white">{coachNombre}</h3>
            <p className="text-xs text-primary font-medium tracking-wider uppercase">Coach Principal</p>
          </div>
        </div>

        <div 
          className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 custom-scrollbar"
          ref={scrollRef}
        >
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-2/3 ml-auto rounded-t-xl rounded-bl-xl bg-primary/20" />
              <Skeleton className="h-16 w-2/3 mr-auto rounded-t-xl rounded-br-xl bg-muted/20" />
              <Skeleton className="h-16 w-2/3 ml-auto rounded-t-xl rounded-bl-xl bg-primary/20" />
            </div>
          ) : mensajes?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="text-5xl mb-4">💬</div>
              <p className="font-syne font-semibold text-white text-lg mb-2">Sin mensajes aún</p>
              <p className="text-muted-foreground text-sm max-w-xs">Escríbele a tu coach para comenzar la conversación. ¡Está aquí para ayudarte!</p>
            </div>
          ) : (
            mensajes?.map((msg) => {
              const isMe = msg.remitenteId === user?.id;
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div 
                    className={`max-w-[85%] md:max-w-[75%] p-3.5 text-sm ${
                      isMe 
                        ? "bg-primary text-primary-foreground rounded-t-xl rounded-bl-xl" 
                        : "bg-muted text-foreground rounded-t-xl rounded-br-xl border border-border/50"
                    }`}
                  >
                    {msg.contenido}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1.5">
                    {new Date(msg.creadoEn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {isMe && (
                      <span className="ml-1 text-primary/70">
                        {msg.leido ? "✓✓" : "✓"}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-border/50 bg-background/30">
          <form onSubmit={handleSend} className="flex items-center space-x-2">
            <Input
              placeholder={`Escribe un mensaje para ${coachNombre}...`}
              value={mensajeText}
              onChange={(e) => setMensajeText(e.target.value)}
              className="flex-1 bg-background/50 border-border/50 focus-visible:ring-primary h-12"
            />
            <Button 
              type="submit" 
              disabled={!mensajeText.trim() || createMutation.isPending}
              className="h-12 w-12 rounded-full p-0 flex-shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
