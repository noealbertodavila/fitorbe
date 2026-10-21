import { useState, useEffect, useRef } from "react";
import { useGetMensajes, getGetMensajesQueryKey, useListConversaciones, getListConversacionesQueryKey, useCreateMensaje, useMarcarMensajeLeido } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, UserCircle, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function CoachMensajes() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const initialUserId = urlParams.get("userId") ? parseInt(urlParams.get("userId")!) : null;
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(initialUserId);
  const [searchTerm, setSearchTerm] = useState("");
  const [mensajeText, setMensajeText] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversaciones, isLoading: isLoadingConv } = useListConversaciones({
    query: { queryKey: getListConversacionesQueryKey(), refetchInterval: 15000 }
  });

  const { data: mensajes, isLoading: isLoadingMsgs } = useGetMensajes(
    selectedUserId || 0,
    undefined,
    { query: { queryKey: getGetMensajesQueryKey(selectedUserId || 0), enabled: !!selectedUserId, refetchInterval: 15000 } }
  );

  const createMutation = useCreateMensaje({
    mutation: {
      onSuccess: () => {
        setMensajeText("");
        queryClient.invalidateQueries({ queryKey: [`/api/mensajes/${selectedUserId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/mensajes/conversaciones"] });
      }
    }
  });

  const marcarLeidoMutation = useMarcarMensajeLeido();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  // Mark as read when opening a conversation
  useEffect(() => {
    if (selectedUserId && mensajes) {
      const unreadIds = mensajes.filter(m => !m.leido && m.remitenteId === selectedUserId).map(m => m.id);
      if (unreadIds.length > 0) {
        unreadIds.forEach(id => marcarLeidoMutation.mutate({ id }));
        queryClient.invalidateQueries({ queryKey: ["/api/mensajes/conversaciones"] });
      }
    }
  }, [selectedUserId, mensajes]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensajeText.trim() || !selectedUserId) return;
    
    createMutation.mutate({
      data: {
        receptorId: selectedUserId,
        contenido: mensajeText
      }
    });
  };

  const filteredConv = conversaciones?.filter(c => 
    c.usuarioNombre.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const activeUser = conversaciones?.find(c => c.usuarioId === selectedUserId);

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      {/* Sidebar de Conversaciones */}
      <Card className="bg-card border-border/50 md:w-1/3 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h2 className="font-syne font-bold text-lg text-white mb-4">Mensajes</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar cliente..." 
              className="bg-background/50 pl-9 border-border/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {isLoadingConv ? (
            <div className="p-4 space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConv.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay conversaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredConv.map(conv => (
                <div 
                  key={conv.usuarioId}
                  className={`p-4 flex items-start space-x-3 cursor-pointer transition-colors ${
                    selectedUserId === conv.usuarioId ? "bg-white/5 border-l-2 border-primary" : "hover:bg-white/5"
                  }`}
                  onClick={() => setSelectedUserId(conv.usuarioId)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0 relative">
                    {conv.usuarioNombre.charAt(0).toUpperCase()}
                    {conv.noLeidos > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-background text-[10px] font-bold rounded-full flex items-center justify-center">
                        {conv.noLeidos}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-medium text-white truncate pr-2">{conv.usuarioNombre}</h3>
                      {conv.ultimaFecha && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(conv.ultimaFecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${conv.noLeidos > 0 ? "text-white font-medium" : "text-muted-foreground"}`}>
                      {conv.ultimoMensaje || "Sin mensajes"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Área de Chat */}
      <Card className="bg-card border-border/50 flex-1 flex flex-col h-full overflow-hidden">
        {selectedUserId ? (
          <>
            {/* Header del Chat */}
            <div className="p-4 border-b border-border/50 flex items-center space-x-3 bg-background/30">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {activeUser?.usuarioNombre.charAt(0).toUpperCase() || <UserCircle />}
              </div>
              <div>
                <h3 className="font-syne font-bold text-white">{activeUser?.usuarioNombre || 'Cargando...'}</h3>
                <p className="text-xs text-muted-foreground">Cliente</p>
              </div>
            </div>

            {/* Mensajes */}
            <div 
              className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar"
              ref={scrollRef}
            >
              {isLoadingMsgs ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-2/3 ml-auto rounded-t-xl rounded-bl-xl bg-primary/20" />
                  <Skeleton className="h-16 w-2/3 mr-auto rounded-t-xl rounded-br-xl bg-muted/20" />
                </div>
              ) : mensajes?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                  <MessageSquare className="w-12 h-12 mb-4" />
                  <p>No hay mensajes aún.</p>
                  <p className="text-sm">Envía un mensaje para comenzar la conversación.</p>
                </div>
              ) : (
                mensajes?.map((msg) => {
                  const isCoach = msg.remitenteId !== selectedUserId;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isCoach ? "items-end" : "items-start"}`}
                    >
                      <div 
                        className={`max-w-[75%] p-3 text-sm ${
                          isCoach 
                            ? "bg-primary text-primary-foreground rounded-t-xl rounded-bl-xl" 
                            : "bg-muted text-foreground rounded-t-xl rounded-br-xl"
                        }`}
                      >
                        {msg.contenido}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {new Date(msg.creadoEn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        {isCoach && (
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

            {/* Input */}
            <div className="p-4 border-t border-border/50 bg-background/30">
              <form onSubmit={handleSend} className="flex items-center space-x-2">
                <Input
                  placeholder="Escribe un mensaje..."
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
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <MessageSquare className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Selecciona una conversación</p>
            <p className="text-sm">Elige un cliente de la lista para ver sus mensajes</p>
          </div>
        )}
      </Card>
    </div>
  );
}
