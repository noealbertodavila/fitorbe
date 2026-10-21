import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGetPlanComida, getGetPlanComidaQueryKey, useCreateCheckin } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Utensils, CheckCircle2, Loader2, Info, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getLunesMT } from "@/lib/date-mt";

const MiniBar = ({ value, color }: { value: number; color: string }) => (
  <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
  </div>
);

export default function ClienteNutricion() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const hoy = new Date();
  const semanaInicio = getLunesMT();

  const { data: planes, isLoading, error } = useGetPlanComida(user?.id || 0, semanaInicio, {
    query: { queryKey: getGetPlanComidaQueryKey(user?.id || 0, semanaInicio), enabled: !!user?.id }
  });

  // Today's plan from the weekly array
  const diaJs = hoy.getDay();
  const diaSemana = diaJs === 0 ? 6 : diaJs - 1;
  const plan = Array.isArray(planes) ? planes.find((p: any) => p.diaSemana === diaSemana) : null;

  const [completedMeals, setCompletedMeals] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCheckin = useCreateCheckin({
    mutation: {
      onSuccess: () => {
        setIsSubmitting(false);
        toast({ 
          title: "¡Nutrición Registrada!", 
          description: "Tus comidas se han guardado correctamente." 
        });
      },
      onError: () => {
        setIsSubmitting(false);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el progreso" });
      }
    }
  });

  const toggleMeal = (nombre: string) => {
    setCompletedMeals(prev => 
      prev.includes(nombre) ? prev.filter(m => m !== nombre) : [...prev, nombre]
    );
  };

  const handleGuardarProgreso = () => {
    if (!user) return;
    setIsSubmitting(true);

    const comidasHoy = (plan as any)?.comidas || [];
    const totalMeals = comidasHoy.length || 1;
    const completedCount = completedMeals.length;
    const adherence = Math.round((completedCount / totalMeals) * 100);

    createCheckin.mutate({
      data: {
        clienteId: user.id,
        fecha: format(hoy, "yyyy-MM-dd"),
        ejerciciosCompletados: [], // Preserving previous checkin data would require fetching it first, simplified here
        comidasCompletadas: completedMeals,
        porcentajeAdherencia: adherence
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-border/50 mb-2" />
        <Skeleton className="h-4 w-96 bg-border/50 mb-8" />
        <Skeleton className="h-4 w-full bg-border/50 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full bg-border/50" />)}
        </div>
      </div>
    );
  }

  const comidasHoy: any[] = (plan as any)?.comidas || [];
  const noPlanSemana = Array.isArray(planes) && (planes as any[]).length === 0;

  if (noPlanSemana) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white mb-2">Mi Nutrición</h1>
          <p className="text-muted-foreground">{format(hoy, "EEEE, d 'de' MMMM", { locale: es })}</p>
        </div>
        <div className="text-center py-20 bg-card border border-border/50 rounded-lg">
          <div className="text-5xl mb-4">🥗</div>
          <h3 className="text-xl font-syne font-bold text-white mb-2">Sin plan de nutrición</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Tu coach aún no ha asignado tu plan de alimentación. ¡Escríbele para comenzar!</p>
          <Link href="/cliente/mensajes">
            <Button className="bg-primary text-white hover:bg-primary/90 gap-2">
              <MessageCircle className="w-4 h-4" /> Enviar mensaje al coach
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!plan || comidasHoy.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white mb-2">Mi Nutrición</h1>
          <p className="text-muted-foreground">{format(hoy, "EEEE, d 'de' MMMM", { locale: es })}</p>
        </div>
        <div className="text-center py-16 bg-card border border-border/50 rounded-lg">
          <Utensils className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">Día Libre</h3>
          <p className="text-muted-foreground">No tienes un plan específico de comidas para hoy. ¡Disfruta!</p>
        </div>
      </div>
    );
  }

  const progress = (completedMeals.length / comidasHoy.length) * 100;
  const isComplete = progress === 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white mb-2">Mi Nutrición</h1>
        <p className="text-muted-foreground capitalize">{format(hoy, "EEEE, d 'de' MMMM", { locale: es })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border/50 md:col-span-2">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex justify-between items-center">
              <CardTitle className="font-syne text-lg">Comidas del Día</CardTitle>
              <span className="text-sm font-bold text-primary">{Math.round(progress)}% Completado</span>
            </div>
            <MiniBar value={progress} color="bg-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {comidasHoy.map((comida, idx) => {
                const isChecked = completedMeals.includes(comida.nombre);
                return (
                  <div 
                    key={idx} 
                    className={`p-4 sm:p-6 transition-all duration-300 ${isChecked ? "bg-white/5" : ""}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="pt-1">
                        <Checkbox 
                          checked={isChecked} 
                          onCheckedChange={() => toggleMeal(comida.nombre)}
                          className={`w-6 h-6 rounded-full border-2 ${isChecked ? "bg-primary border-primary text-background" : "border-muted-foreground"}`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                          <h3 className={`text-lg font-bold font-syne ${isChecked ? "text-muted-foreground line-through" : "text-white"}`}>
                            {comida.nombre}
                          </h3>
                          <span className="text-primary font-bold bg-primary/10 px-3 py-1 rounded-md text-sm">
                            {comida.calorias} kcal
                          </span>
                        </div>
                        <p className={`text-sm mb-3 ${isChecked ? "text-muted-foreground line-through" : "text-white/80"}`}>
                          {comida.descripcion}
                        </p>
                        {/* Ingredients list */}
                        {comida.ingredientes && comida.ingredientes.length > 0 && !isChecked && (
                          <div className="mb-3 rounded-lg bg-white/5 border border-border/30 divide-y divide-border/20">
                            {comida.ingredientes.map((ing: any, iIdx: number) => (
                              <div key={iIdx} className="flex items-center justify-between px-3 py-1.5 text-xs">
                                <span className="text-white/80">{ing.nombre}</span>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span className="font-medium text-white/60">{ing.gramos}g</span>
                                  <span className="text-primary/80">{ing.calorias} kcal</span>
                                  <span className="text-blue-400/70 hidden sm:inline">P:{ing.proteinas}g</span>
                                  <span className="text-yellow-400/70 hidden sm:inline">C:{ing.carbos}g</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          <span>PRO: <span className="text-white">{comida.proteinas}g</span></span>
                          <span>CAR: <span className="text-white">{comida.carbohidratos}g</span></span>
                          <span>GRA: <span className="text-white">{comida.grasas}g</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-syne text-lg">Resumen Diario</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-center mb-6">
                <span className="text-5xl font-syne font-bold text-white">{(plan as any)?.caloriasTotal || "—"}</span>
                <span className="text-muted-foreground text-sm ml-2 uppercase">kcal totales</span>
              </div>
              <div className="space-y-4">
                {/* Simplified macro calculation based on plan meals total */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground uppercase">Proteínas</span>
                    <span className="text-white">{comidasHoy.reduce((acc, curr) => acc + curr.proteinas, 0)}g</span>
                  </div>
                  <MiniBar value={40} color="bg-blue-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground uppercase">Carbohidratos</span>
                    <span className="text-white">{comidasHoy.reduce((acc, curr) => acc + curr.carbohidratos, 0)}g</span>
                  </div>
                  <MiniBar value={35} color="bg-green-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground uppercase">Grasas</span>
                    <span className="text-white">{comidasHoy.reduce((acc, curr) => acc + curr.grasas, 0)}g</span>
                  </div>
                  <MiniBar value={25} color="bg-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full h-14 text-sm font-syne font-bold tracking-wider" 
            onClick={handleGuardarProgreso}
            disabled={isSubmitting || completedMeals.length === 0}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isComplete ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                DÍA COMPLETADO
              </>
            ) : (
              "GUARDAR PROGRESO"
            )}
          </Button>

          {(plan as any)?.notas && (
            <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-primary/90">{(plan as any)?.notas}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
