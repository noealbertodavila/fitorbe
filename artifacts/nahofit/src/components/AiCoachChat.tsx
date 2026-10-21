import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Sparkles, Loader2, Minus, Maximize2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { AIChatBodyHistorialItem } from "@workspace/api-client-react";

export default function AiCoachChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<AIChatBodyHistorialItem[]>([
    { role: "assistant", content: "¡Hola! Soy tu asistente de NAHOFIT.LIFE. Conozco tu rutina, nutrición y progreso. ¿En qué te puedo ayudar hoy?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isTyping]);

  if (user?.rol !== "cliente") return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isTyping) return;

    const userMessage = message;
    setMessage("");
    const newHistory = [...history, { role: "user", content: userMessage }];
    setHistory(newHistory);
    setIsTyping(true);

    try {
      const token = localStorage.getItem("nahofit_auth_token");
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          clienteId: user.id,
          mensaje: userMessage,
          historial: history
        })
      });

      if (!res.ok || !res.body) {
        throw new Error("No se pudo conectar con el AI Coach");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setHistory([...newHistory, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantMessage += data.content;
                setHistory(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1].content = assistantMessage;
                  return updated;
                });
              }
              if (data.done) {
                setIsTyping(false);
              }
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
      setIsTyping(false);

    } catch (err) {
      setIsTyping(false);
      setHistory(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1].role === "assistant" && !updated[updated.length - 1].content) {
          updated.pop();
        }
        return updated;
      });
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "El AI Coach no está disponible en este momento."
      });
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground p-0 z-50 animate-in fade-in slide-in-from-bottom-10"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className={`fixed z-50 flex flex-col shadow-2xl border-primary/30 transition-all duration-300 ease-in-out ${
          isExpanded 
            ? "inset-4 sm:inset-10 md:inset-20 lg:inset-y-10 lg:inset-x-40" 
            : "bottom-6 right-6 w-full max-w-[350px] h-[500px]"
        }`}>
          <CardHeader className="p-3 border-b border-border/50 bg-background/50 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-syne flex items-center">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2"></div>
              NAHOFIT<span className="text-primary mx-1">.AI</span> Coach
            </CardTitle>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? <Minus className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {history.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                        isUser 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-muted border border-border/50 text-foreground rounded-tl-none"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] p-3 rounded-lg text-sm bg-muted border border-border/50 text-foreground rounded-tl-none flex items-center space-x-2">
                      <span className="animate-pulse">Nahomy está escribiendo</span>
                      <span className="flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border/50 bg-background/50">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  placeholder="Pregunta sobre tu plan..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 bg-background"
                  disabled={isTyping}
                />
                <Button type="submit" size="icon" disabled={!message.trim() || isTyping}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
