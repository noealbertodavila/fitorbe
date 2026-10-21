import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateCheckinEmocional, useGetDiario, getGetDiarioQueryKey, useCreateEntradaDiario } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { HeartPulse, Send, Book, Moon, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getFechaHoy } from "@/lib/date-mt";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const MOOD_OPTIONS = [
  { val: 1, emoji: "😩", label: "Muy mal",  color: "text-red-500",    bg: "bg-red-500/20",    border: "border-red-500"    },
  { val: 2, emoji: "😔", label: "Mal",       color: "text-orange-500", bg: "bg-orange-500/20", border: "border-orange-500" },
  { val: 3, emoji: "😐", label: "Regular",   color: "text-yellow-400", bg: "bg-yellow-400/20", border: "border-yellow-400" },
  { val: 4, emoji: "😊", label: "Bien",      color: "text-green-500",  bg: "bg-green-500/20",  border: "border-green-500"  },
  { val: 5, emoji: "🤩", label: "Excelente", color: "text-primary",    bg: "bg-primary/20",    border: "border-primary"    },
];

const FACTORES_TAGS = [
  "Trabajo", "Familia", "Cansancio", "Motivado", "Estrés",
  "Dolor", "Buena alimentación", "Mal sueño", "Logro del día", "Lesión",
];

const checkinSchema = z.object({
  estadoAnimo: z.number().min(1).max(5),
  nivelEnergia: z.number().min(1).max(5),
  horasSueno: z.number().min(0).max(12),
  notas: z.string().optional(),
});

const diarioSchema = z.object({
  contenido: z.string().min(1, "El contenido no puede estar vacío"),
  gratitud: z.string().optional(),
});

export default function ClienteEmocional() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hoy = getFechaHoy();
  const [selectedFactores, setSelectedFactores] = useState<string[]>([]);

  const { data: diarioEntradas, isLoading: isLoadingDiario } = useGetDiario(
    user?.id || 0,
    {},
    { query: { queryKey: getGetDiarioQueryKey(user?.id || 0, {}), enabled: !!user?.id } }
  );

  const createCheckinMutation = useCreateCheckinEmocional({
    mutation: {
      onSuccess: () => {
        toast({ title: "Check-in Registrado ✅", description: "Gracias por compartir cómo te sientes hoy." });
        formCheckin.reset({ estadoAnimo: 3, nivelEnergia: 3, horasSueno: 7, notas: "" });
        setSelectedFactores([]);
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      },
    },
  });

  const createDiarioMutation = useCreateEntradaDiario({
    mutation: {
      onSuccess: () => {
        toast({ title: "Diario Actualizado", description: "Tu entrada ha sido guardada." });
        formDiario.reset();
        queryClient.invalidateQueries({ queryKey: getGetDiarioQueryKey(user?.id || 0, {}) });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      },
    },
  });

  const formCheckin = useForm<z.infer<typeof checkinSchema>>({
    resolver: zodResolver(checkinSchema),
    defaultValues: { estadoAnimo: 3, nivelEnergia: 3, horasSueno: 7, notas: "" },
  });

  const formDiario = useForm<z.infer<typeof diarioSchema>>({
    resolver: zodResolver(diarioSchema),
    defaultValues: { contenido: "", gratitud: "" },
  });

  const toggleFactor = (tag: string) => {
    setSelectedFactores(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const onSubmitCheckin = (values: z.infer<typeof checkinSchema>) => {
    if (!user) return;
    createCheckinMutation.mutate({
      data: {
        clienteId: user.id,
        fecha: hoy,
        ...values,
        factores: selectedFactores.length > 0 ? selectedFactores.join(",") : undefined,
      } as any,
    });
  };

  const onSubmitDiario = (values: z.infer<typeof diarioSchema>) => {
    if (!user) return;
    createDiarioMutation.mutate({ data: { clienteId: user.id, fecha: hoy, ...values } });
  };

  const animoVal = formCheckin.watch("estadoAnimo");
  const selectedMood = MOOD_OPTIONS.find(m => m.val === animoVal);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white mb-2">Bienestar Emocional</h1>
        <p className="text-muted-foreground">Tu salud mental es tan importante como la física</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHECK-IN CARD */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-syne text-lg flex items-center">
              <HeartPulse className="w-5 h-5 text-primary mr-2" />
              Check-in Diario
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </CardHeader>
          <CardContent>
            <Form {...formCheckin}>
              <form onSubmit={formCheckin.handleSubmit(onSubmitCheckin)} className="space-y-6">

                {/* MOOD EMOJI SELECTOR */}
                <FormField
                  control={formCheckin.control}
                  name="estadoAnimo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm">¿Cómo te sientes hoy?</FormLabel>
                      <FormControl>
                        <div className="flex justify-between gap-2 mt-2">
                          {MOOD_OPTIONS.map(opt => {
                            const isSelected = field.value === opt.val;
                            return (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => field.onChange(opt.val)}
                                title={opt.label}
                                className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all duration-200 ${
                                  isSelected
                                    ? `${opt.bg} ${opt.border} scale-105`
                                    : "border-border/50 hover:bg-white/5"
                                }`}
                              >
                                <span className={`text-3xl leading-none ${isSelected ? "" : "grayscale opacity-70"}`}>
                                  {opt.emoji}
                                </span>
                                <span className={`text-xs mt-1 font-medium ${isSelected ? opt.color : "text-muted-foreground"}`}>
                                  {opt.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      {selectedMood && (
                        <p className={`text-xs text-center mt-1 font-medium ${selectedMood.color}`}>
                          Estado de ánimo: {selectedMood.label}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ENERGY SLIDER */}
                <Controller
                  control={formCheckin.control}
                  name="nivelEnergia"
                  render={({ field }) => (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-muted-foreground flex items-center gap-1">
                          <Zap className="w-3 h-3 text-yellow-400" /> Nivel de Energía
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-base font-bold text-white">{"⚡".repeat(field.value)}</span>
                          <span className="text-sm text-muted-foreground ml-1">{field.value}/5</span>
                        </div>
                      </div>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                        <span>Sin energía</span>
                        <span>Lleno de energía</span>
                      </div>
                    </div>
                  )}
                />

                {/* SLEEP SLIDER */}
                <Controller
                  control={formCheckin.control}
                  name="horasSueno"
                  render={({ field }) => (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-muted-foreground flex items-center gap-1">
                          <Moon className="w-3 h-3 text-blue-400" /> Horas de Sueño
                        </label>
                        <span className="text-lg font-bold text-white">{field.value}h</span>
                      </div>
                      <Slider
                        min={0}
                        max={12}
                        step={0.5}
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                        <span>0h</span>
                        <span>6h</span>
                        <span>12h</span>
                      </div>
                    </div>
                  )}
                />

                {/* FACTOR TAGS */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground block">
                    Factores del día <span className="text-xs opacity-60">(opcional, selecciona los que apliquen)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FACTORES_TAGS.map(tag => {
                      const isActive = selectedFactores.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleFactor(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                            isActive
                              ? "bg-primary/20 border-primary text-primary"
                              : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-white"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* NOTES */}
                <FormField
                  control={formCheckin.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Notas para Nahomy <span className="text-xs opacity-60">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Si hay algo que afectó tu entrenamiento o dieta, compártelo aquí..."
                          className="bg-background/50 resize-none h-20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 font-bold tracking-wider"
                  disabled={createCheckinMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  ENVIAR CHECK-IN
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* DIARY CARD */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="font-syne text-lg flex items-center">
              <Book className="w-5 h-5 text-primary mr-2" />
              Mi Diario Personal
            </CardTitle>
            <p className="text-xs text-muted-foreground">Solo tú puedes ver este diario.</p>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...formDiario}>
              <form onSubmit={formDiario.handleSubmit(onSubmitDiario)} className="space-y-4">
                <FormField
                  control={formDiario.control}
                  name="gratitud"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-medium">Hoy agradezco por...</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Haber entrenado a pesar del cansancio..."
                          className="bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={formDiario.control}
                  name="contenido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Reflexiones del día</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escribe lo que sientes, sin filtros..."
                          className="bg-background/50 resize-none h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-primary/50 text-primary hover:bg-primary/10"
                  disabled={createDiarioMutation.isPending}
                >
                  Guardar en mi diario
                </Button>
              </form>
            </Form>

            <div className="mt-8 space-y-4">
              <h3 className="font-syne font-medium text-white mb-2">Entradas Recientes</h3>
              {isLoadingDiario ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full bg-border/50" />
                  <Skeleton className="h-20 w-full bg-border/50" />
                </div>
              ) : diarioEntradas?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-background/30 rounded-lg border border-border/50">
                  Aún no tienes entradas en tu diario.
                </p>
              ) : (
                <div className="space-y-3">
                  {diarioEntradas?.slice(0, 3).map(entrada => (
                    <div key={entrada.id} className="p-3 bg-background/50 rounded-lg border border-border/50">
                      <div className="text-xs text-muted-foreground mb-2">
                        {format(new Date(entrada.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                      </div>
                      {entrada.gratitud && (
                        <p className="text-sm text-primary mb-1">
                          <span className="font-medium">Gratitud:</span> {entrada.gratitud}
                        </p>
                      )}
                      <p className="text-sm text-white/80 line-clamp-2">{entrada.contenido}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
