import { useGetAlertasEmocionales, useGetCheckinsEmocionales, getGetCheckinsEmocionalesQueryKey, useListClientes } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, HeartPulse, Send, Smile, Frown, Meh, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const getEmojiForMood = (mood: number) => {
  if (mood >= 4) return <Smile className="w-5 h-5 text-primary" />;
  if (mood === 3) return <Meh className="w-5 h-5 text-yellow-500" />;
  return <Frown className="w-5 h-5 text-red-500" />;
};

const getMoodLabel = (mood: number) => {
  if (mood >= 5) return "Excelente";
  if (mood >= 4) return "Bien";
  if (mood === 3) return "Regular";
  if (mood === 2) return "Bajo";
  return "Muy bajo";
};

export default function CoachEmocional() {
  const urlParams = new URLSearchParams(window.location.search);
  const clienteIdFromUrl = urlParams.get("clienteId") || "all";

  const [selectedCliente, setSelectedCliente] = useState<string>(clienteIdFromUrl);

  const { data: alertas, isLoading: isLoadingAlertas, error: alertasError } = useGetAlertasEmocionales();
  const { data: clientes } = useListClientes({ activo: true });

  const { data: checkins, isLoading: isLoadingCheckins } = useGetCheckinsEmocionales(
    selectedCliente !== "all" ? parseInt(selectedCliente) : 0,
    undefined,
    { query: { queryKey: getGetCheckinsEmocionalesQueryKey(selectedCliente !== "all" ? parseInt(selectedCliente) : 0), enabled: selectedCliente !== "all" && !isNaN(parseInt(selectedCliente)) } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white">Bienestar Emocional</h1>
        <p className="text-muted-foreground">Monitoreo de estado de ánimo y energía de tus clientes</p>
      </div>

      {/* Alertas */}
      <div className="space-y-4">
        <h2 className="text-xl font-syne font-bold text-white flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          Alertas de Bajo Estado de Ánimo
        </h2>

        {isLoadingAlertas ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full bg-border/50 rounded-lg" />)}
          </div>
        ) : alertasError ? (
          <div className="p-6 bg-card border border-border/50 rounded-lg text-center">
            <HeartPulse className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">No se pudieron cargar las alertas</p>
          </div>
        ) : alertas && alertas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertas.map(alerta => (
              <Card key={alerta.clienteId} className="bg-card border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-white block">{alerta.clienteNombre}</span>
                      {(alerta as { riesgo?: boolean }).riesgo && (
                        <span className="text-sm font-semibold text-red-300 mt-1 block">
                          Escribió algo que suena a crisis ({(alerta as { fechaRiesgo?: string }).fechaRiesgo}). Escríbele hoy; si crees que está en peligro, que llame al 988 o al 911.
                        </span>
                      )}
                      {alerta.diasBajos > 0 && (
                        <span className="text-sm text-red-400 mt-1 block">
                          {alerta.diasBajos} días consecutivos bajos
                        </span>
                      )}
                    </div>
                    {alerta.ultimoEstado > 0 && (
                      <Badge variant="outline" className="border-red-500/50 text-red-500 bg-red-500/10">
                        Nivel {alerta.ultimoEstado}/5
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <Link href={`/coach/mensajes?userId=${alerta.clienteId}`} className="w-full">
                      <Button size="sm" className="w-full bg-background border border-border/50 hover:bg-white/5 text-white">
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Apoyo
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-card border border-border/50 rounded-lg text-center">
            <HeartPulse className="w-8 h-8 text-primary mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Todos tus clientes tienen buen estado de ánimo.</p>
          </div>
        )}
      </div>

      {/* Historial por cliente */}
      <div className="pt-4">
        <h2 className="text-xl font-syne font-bold text-white mb-4">Historial por Cliente</h2>

        <div className="mb-6">
          <Select value={selectedCliente} onValueChange={setSelectedCliente}>
            <SelectTrigger className="bg-card border-border/50 w-full md:w-[300px]">
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Seleccionar cliente...</SelectItem>
              {clientes?.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCliente === "all" ? (
          <div className="p-12 bg-card border border-border/50 rounded-lg text-center">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Selecciona un cliente para ver su historial emocional</p>
          </div>
        ) : isLoadingCheckins ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full bg-border/50 rounded-lg" />)}
          </div>
        ) : checkins && checkins.length > 0 ? (
          <div className="space-y-3">
            {checkins.map(checkin => (
              <Card key={checkin.id} className="bg-card border-border/50">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-background/50 rounded-full border border-border/50">
                      {getEmojiForMood(checkin.estadoAnimo)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(checkin.fecha + "T12:00:00").toLocaleDateString('es-ES', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        <span className="text-sm font-medium text-white flex items-center gap-1">
                          {getEmojiForMood(checkin.estadoAnimo)}
                          Ánimo: <span className="text-primary">{getMoodLabel(checkin.estadoAnimo)}</span> ({checkin.estadoAnimo}/5)
                        </span>
                        <span className="text-sm text-muted-foreground">Energía: {checkin.nivelEnergia}/5</span>
                        <span className="text-sm text-muted-foreground">Sueño: {checkin.horasSueno}h</span>
                      </div>
                    </div>
                  </div>
                  {checkin.notas && (
                    <div className="md:w-1/3 text-sm text-muted-foreground italic bg-background/30 p-3 rounded-md border border-border/50">
                      "{checkin.notas}"
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-12 bg-card border border-border/50 rounded-lg text-center">
            <HeartPulse className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-white font-medium mb-1">Sin registros emocionales</p>
            <p className="text-muted-foreground text-sm">
              {clientes?.find(c => c.id === parseInt(selectedCliente))?.nombre || "Este cliente"} aún no ha registrado check-ins emocionales.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
