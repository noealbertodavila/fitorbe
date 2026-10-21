import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetRutina, getGetRutinaQueryKey,
  useCreateCheckin, useGetCheckin, getGetCheckinQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dumbbell, Info, CheckCircle2, PlayCircle, Loader2, Moon, MessageCircle, Search } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { getFechaHoy, getLunesMT, getHoyMT } from "@/lib/date-mt";

function getYouTubeSearchUrl(nombreEjercicio: string): string {
  const query = encodeURIComponent(`${nombreEjercicio} ejercicio técnica correcta español`);
  return `https://www.youtube.com/results?search_query=${query}`;
}

export default function ClienteRutina() {
  const { user } = useAuth();
  const { toast } = useToast();

  const hoyMT = getHoyMT();
  const hoy = new Date();
  const hoyStr = getFechaHoy();
  const semanaInicio = getLunesMT();
  const diaJs = hoyMT.getUTCDay();
  const diaSemana = diaJs === 0 ? 6 : diaJs - 1;

  const { data: rutinas, isLoading, error } = useGetRutina(
    user?.id || 0,
    semanaInicio,
    { query: { queryKey: getGetRutinaQueryKey(user?.id || 0, semanaInicio), enabled: !!user?.id } }
  );

  // Load today's existing check-in to restore saved exercise state
  const { data: checkinHoy } = useGetCheckin(
    user?.id || 0,
    hoyStr,
    { query: { queryKey: getGetCheckinQueryKey(user?.id || 0, hoyStr), enabled: !!user?.id } }
  );

  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Restore checked exercises from today's check-in (or localStorage cache)
  useEffect(() => {
    if (initialized) return;
    // Try localStorage first for instant UX
    const cached = localStorage.getItem(`ejercicios_${hoyStr}`);
    if (cached) {
      try {
        setCompletedExercises(JSON.parse(cached));
      } catch { /* ignore */ }
    }
    setInitialized(true);
  }, [hoyStr, initialized]);

  useEffect(() => {
    if (!checkinHoy) return;
    const serverCompleted = checkinHoy.ejerciciosCompletados || [];
    setCompletedExercises(serverCompleted);
    localStorage.setItem(`ejercicios_${hoyStr}`, JSON.stringify(serverCompleted));
  }, [checkinHoy, hoyStr]);

  const createCheckin = useCreateCheckin({
    mutation: {
      onSuccess: (data) => {
        setIsSubmitting(false);
        const completed = data?.ejerciciosCompletados || completedExercises;
        localStorage.setItem(`ejercicios_${hoyStr}`, JSON.stringify(completed));
        toast({
          title: "¡Progreso Guardado!",
          description: "Tu progreso de hoy ha sido registrado correctamente.",
        });
      },
      onError: () => {
        setIsSubmitting(false);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el progreso." });
      },
    },
  });

  // Track in-flight saves to show saving indicator
  const [savingExercise, setSavingExercise] = useState<string | null>(null);

  const toggleExercise = async (nombre: string) => {
    // 1. Update state immediately (optimistic UI)
    let updatedList: string[] = [];
    setCompletedExercises(prev => {
      const isChecked = prev.includes(nombre);
      updatedList = isChecked ? prev.filter(e => e !== nombre) : [...prev, nombre];
      localStorage.setItem(`ejercicios_${hoyStr}`, JSON.stringify(updatedList));
      return updatedList;
    });

    // 2. Auto-save to DB in background
    if (!user) return;
    setSavingExercise(nombre);
    try {
      await customFetch("/api/checkin/ejercicio", {
        method: "POST",
        body: JSON.stringify({
          clienteId: user.id,
          fecha: hoyStr,
          ejercicioNombre: nombre,
          completado: !completedExercises.includes(nombre),
        }),
      });
    } catch {
      // Silent fail — localStorage still has the data
    } finally {
      setSavingExercise(null);
    }
  };

  const handleTerminarRutina = () => {
    if (!user) return;
    setIsSubmitting(true);
    const totalExercises = ejerciciosHoy.length || 1;
    const adherence = Math.round((completedExercises.length / totalExercises) * 100);
    createCheckin.mutate({
      data: {
        clienteId: user.id,
        fecha: hoyStr,
        ejerciciosCompletados: completedExercises,
        comidasCompletadas: [],
        porcentajeAdherencia: adherence,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-border/50" />
        <Skeleton className="h-4 w-72 bg-border/50" />
        <Skeleton className="h-6 w-full bg-border/50" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 w-full bg-border/50" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h1 className="text-3xl font-syne font-bold text-white">Mi Rutina</h1>
        <div className="text-center py-16 bg-card border border-red-500/30 rounded-lg">
          <Info className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-400 font-medium">Error al cargar tu rutina</p>
          <p className="text-muted-foreground text-sm mt-1">Verifica tu conexión o contacta a Nahomy</p>
        </div>
      </div>
    );
  }

  const rutinasArr = Array.isArray(rutinas) ? rutinas : [];
  const rutinaDia = rutinasArr.find(r => r.diaSemana === diaSemana);
  const ejerciciosHoy: any[] = rutinaDia?.ejercicios || [];
  const noPlanAsignado = rutinasArr.length === 0;

  if (noPlanAsignado) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white mb-2">Mi Rutina</h1>
          <p className="text-muted-foreground capitalize">
            {format(hoy, "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <div className="text-center py-20 bg-card border border-border/50 rounded-lg">
          <div className="text-5xl mb-4">💪</div>
          <h3 className="text-xl font-syne font-bold text-white mb-2">Sin rutina esta semana</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Tu coach aún no ha asignado tu plan de entrenamiento. ¡Escríbele para comenzar!
          </p>
          <Link href="/cliente/mensajes">
            <Button className="bg-primary text-white hover:bg-primary/90 gap-2">
              <MessageCircle className="w-4 h-4" /> Enviar mensaje al coach
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!rutinaDia || ejerciciosHoy.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white mb-2">Mi Rutina</h1>
          <p className="text-muted-foreground capitalize">
            {format(hoy, "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <div className="text-center py-20 bg-card border border-border/50 rounded-lg">
          <Moon className="w-14 h-14 text-primary mx-auto mb-4 opacity-40" />
          <h3 className="text-xl font-syne font-bold text-white mb-2">Día de Descanso</h3>
          <p className="text-muted-foreground">
            No tienes ejercicios programados para hoy. ¡Descansa y recupérate!
          </p>
        </div>
      </div>
    );
  }

  const progress = ejerciciosHoy.length > 0
    ? (completedExercises.length / ejerciciosHoy.length) * 100
    : 0;
  const isComplete = completedExercises.length === ejerciciosHoy.length && ejerciciosHoy.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white mb-2">Mi Rutina</h1>
        <p className="text-muted-foreground capitalize">
          {format(hoy, "EEEE, d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Progress bar */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Progreso de Hoy — {completedExercises.length}/{ejerciciosHoy.length} ejercicios
            </span>
            <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2.5 bg-border/50" />
          {isComplete && (
            <p className="text-xs text-primary font-medium mt-2 text-center animate-in fade-in">
              ¡Entrenamiento completado! Guarda tu progreso para registrarlo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Exercise list */}
      <div className="space-y-4">
        {ejerciciosHoy.map((ej: any, idx: number) => {
          const isChecked = completedExercises.includes(ej.nombre);
          const hasVideoUrl = ej.videoUrl && !ej.videoUrl.includes("youtube.com/watch?v=INVALID");
          const videoUrl = hasVideoUrl ? ej.videoUrl : null;
          const searchUrl = getYouTubeSearchUrl(ej.nombre);

          return (
            <Card
              key={idx}
              className={`bg-card border transition-all duration-300 ${
                isChecked
                  ? "border-primary/40 bg-primary/5 opacity-70"
                  : "border-border/50 hover:border-primary/30"
              }`}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="pt-1 relative">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleExercise(ej.nombre)}
                      disabled={savingExercise === ej.nombre}
                      className={`w-6 h-6 rounded-full border-2 ${
                        isChecked ? "bg-primary border-primary text-background" : "border-muted-foreground"
                      }`}
                    />
                    {savingExercise === ej.nombre && (
                      <Loader2 className="w-3 h-3 absolute -top-1 -right-1 animate-spin text-primary" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div>
                        <h3 className={`text-lg font-bold font-syne ${isChecked ? "text-muted-foreground line-through" : "text-white"}`}>
                          {ej.nombre}
                        </h3>
                        {ej.grupoMuscular && (
                          <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-md uppercase tracking-wider font-medium mt-1 inline-block">
                            {ej.grupoMuscular}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 bg-background/50 px-3 py-2 rounded-lg border border-border/50 flex-shrink-0">
                        <div className="text-center">
                          <span className="block text-[10px] text-muted-foreground uppercase">Series</span>
                          <span className="font-bold text-white">{ej.series}</span>
                        </div>
                        <div className="w-px h-6 bg-border/50" />
                        <div className="text-center">
                          <span className="block text-[10px] text-muted-foreground uppercase">Reps</span>
                          <span className="font-bold text-white">{ej.repeticiones}</span>
                        </div>
                        {ej.descanso && (
                          <>
                            <div className="w-px h-6 bg-border/50" />
                            <div className="text-center">
                              <span className="block text-[10px] text-muted-foreground uppercase">Descanso</span>
                              <span className="font-bold text-white">{ej.descanso}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {ej.instrucciones && (
                      <div className="bg-background/30 p-3 rounded-md border border-border/50 flex gap-3">
                        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">{ej.instrucciones}</p>
                      </div>
                    )}

                    {/* Video button — always shown */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={videoUrl
                        ? "border-primary/30 text-primary hover:bg-primary/10"
                        : "border-border/50 text-muted-foreground hover:bg-white/5 hover:text-white"
                      }
                      asChild
                    >
                      <a
                        href={videoUrl || searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {videoUrl ? (
                          <>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Ver Video
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Buscar en YouTube
                          </>
                        )}
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save button — updates adherence %, auto-save already handles individual exercises */}
      <div className="pt-4 space-y-2">
        <p className="text-xs text-center text-muted-foreground">
          ✓ Cada ejercicio se guarda automáticamente al marcarlo
        </p>
        <Button
          className="w-full h-14 text-lg font-syne font-bold tracking-wider"
          size="lg"
          onClick={handleTerminarRutina}
          disabled={isSubmitting || completedExercises.length === 0}
        >
          {isSubmitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isComplete ? (
            <>
              <CheckCircle2 className="w-6 h-6 mr-2" />
              TERMINAR ENTRENAMIENTO
            </>
          ) : (
            "REGISTRAR PROGRESO PARCIAL"
          )}
        </Button>
      </div>
    </div>
  );
}
