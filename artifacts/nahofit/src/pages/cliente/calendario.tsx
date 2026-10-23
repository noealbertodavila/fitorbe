import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Dumbbell,
  Utensils,
  HeartPulse,
  Sparkles,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  format,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { getFechaHoy, getLunesMT } from "@/lib/date-mt";

function lunesDate(): Date {
  return new Date(getLunesMT() + "T12:00:00");
}
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useNegocio } from "@/hooks/use-negocio";

// ─── Types ────────────────────────────────────────────────────────────────────
type DiaSemana = {
  fecha: string;
  diaSemana: number;
  tieneRutina: boolean;
  tieneNutricion: boolean;
  tieneCheckin: boolean;
  tieneEmocional: boolean;
  porcentajeAdherencia: number | null;
  estado: "completado" | "parcial" | "fallado" | "descanso" | "hoy" | "futuro";
  rutinaNombre: string | null;
  caloriasTotal: number | null;
};

type DetalleDia = {
  fecha: string;
  rutina: {
    existe: boolean;
    nombre: string | null;
    notas: string | null;
    ejercicios: any[];
  };
  nutricion: {
    existe: boolean;
    caloriasTotal: number | null;
    macros: { proteinas: number; carbohidratos: number; grasas: number } | null;
    notas: string | null;
    comidas: any[];
  };
  checkinEmocional: {
    realizado: boolean;
    estadoAnimo: number | null;
    nivelEnergia: number | null;
    horasSueno: number | null;
    factores: string | null;
    notas: string | null;
  };
  checkinDiario: {
    realizado: boolean;
    porcentajeAdherencia: number | null;
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────
const DIAS_CORTOS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const MOOD_MAP: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "😩", label: "Muy mal" },
  2: { emoji: "😔", label: "Mal" },
  3: { emoji: "😐", label: "Regular" },
  4: { emoji: "😊", label: "Bien" },
  5: { emoji: "🤩", label: "Excelente" },
};

const FRASES = [
  "Cada esfuerzo cuenta, aunque nadie lo vea.",
  "El cambio comienza cuando decides no rendirte.",
  "Tu cuerpo puede. Es tu mente la que debes convencer.",
  "Un día a la vez, un rep a la vez.",
  "El progreso, no la perfección, es la meta.",
  "La disciplina de hoy construye el cuerpo de mañana.",
  "Eres más fuerte de lo que crees.",
];

function getFrase() {
  return FRASES[new Date().getDate() % FRASES.length];
}

// ─── Status styling ───────────────────────────────────────────────────────────
function getDiaStyle(estado: string, isSelected: boolean, isTodayCell: boolean): string {
  const selRing = isSelected
    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
    : "";
  const todayBorder = isTodayCell && !isSelected ? "ring-1 ring-primary" : "";

  switch (estado) {
    case "completado":
      return `bg-emerald-500/15 border-emerald-500/50 ${selRing}`;
    case "parcial":
      return `bg-yellow-500/15 border-yellow-500/50 ${selRing}`;
    case "fallado":
      return `bg-red-500/15 border-red-500/40 ${selRing}`;
    case "hoy":
      return `bg-primary/10 border-primary ${todayBorder} ${selRing}`;
    case "futuro":
      return `bg-background/10 border-border/20 opacity-50 ${selRing}`;
    case "descanso":
    default:
      return `bg-background/20 border-border/30 ${selRing}`;
  }
}

function getDiaEmoji(estado: string): string {
  switch (estado) {
    case "completado": return "✅";
    case "parcial": return "🟡";
    case "fallado": return "🔴";
    case "descanso": return "🧘";
    case "hoy": return "🟢";
    case "futuro": return "📅";
    default: return "📅";
  }
}

function getDiaLabel(estado: string): string {
  switch (estado) {
    case "completado": return "Completado";
    case "parcial": return "Parcial";
    case "fallado": return "Fallado";
    case "descanso": return "Descanso";
    case "hoy": return "Hoy";
    case "futuro": return "Planificado";
    default: return "";
  }
}

function getDiaLabelColor(estado: string): string {
  switch (estado) {
    case "completado": return "text-emerald-400";
    case "parcial": return "text-yellow-400";
    case "fallado": return "text-red-400";
    case "hoy": return "text-primary";
    case "futuro": return "text-muted-foreground/60";
    default: return "text-muted-foreground/70";
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClienteCalendario() {
  const { marca, coachNombre } = useNegocio();
  const { user } = useAuth();
  const hoyStr = getFechaHoy();

  // Week navigation — Monday of the current week (Mountain Time)
  const [semanaRef, setSemanaRef] = useState<Date>(lunesDate);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(hoyStr);

  const semanaParam = format(semanaRef, "yyyy-MM-dd");

  // ── Fetch week data ──────────────────────────────────────────────────────
  const { data: diasSemana, isLoading: isLoadingSemana } = useQuery<DiaSemana[]>({
    queryKey: ["/api/calendario/semana", user?.id, semanaParam],
    queryFn: () =>
      customFetch<DiaSemana[]>(
        `/api/calendario/semana/${user!.id}?semana=${semanaParam}`
      ),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // ── Fetch selected day detail ────────────────────────────────────────────
  const { data: detalleDia, isLoading: isLoadingDetalle } = useQuery<DetalleDia>({
    queryKey: ["/api/calendario/dia", user?.id, diaSeleccionado],
    queryFn: () =>
      customFetch<DetalleDia>(
        `/api/calendario/dia/${user!.id}?fecha=${diaSeleccionado}`
      ),
    enabled: !!user?.id && !!diaSeleccionado,
    staleTime: 10_000,
  });

  // ── Week label ───────────────────────────────────────────────────────────
  const semanaFin = addWeeks(semanaRef, 1);
  semanaFin.setDate(semanaFin.getDate() - 1);
  const semanaLabel = `${format(semanaRef, "d MMM", { locale: es })} – ${format(semanaFin, "d MMM yyyy", { locale: es })}`;

  // ── Summary stats ────────────────────────────────────────────────────────
  const diasConRutina = diasSemana?.filter(d => d.tieneRutina) || [];
  const diasCompletados = diasConRutina.filter(d => (d.porcentajeAdherencia ?? 0) >= 80).length;
  const diasFallados = diasConRutina.filter(d => d.estado === "fallado").length;
  const checkinsEmocionales = diasSemana?.filter(d => d.tieneEmocional).length ?? 0;
  const adherenciaMedia =
    diasConRutina.length > 0
      ? Math.round(
          diasConRutina.reduce((s, d) => s + (d.porcentajeAdherencia ?? 0), 0) /
          diasConRutina.length
        )
      : null;

  const diaSelObj = diaSeleccionado ? parseISO(diaSeleccionado) : null;
  const isHoySelected = diaSeleccionado === hoyStr;
  const diaSelData = diasSemana?.find(d => d.fecha === diaSeleccionado);
  const isFuturoSelected = diaSelData?.estado === "futuro";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-syne font-bold text-white mb-2">Mi Calendario</h1>
        <p className="text-muted-foreground">Adherencia semanal y registros de bienestar</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── WEEKLY CALENDAR + DAY DETAIL ──────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Week navigation */}
          <Card className="bg-card border-border/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSemanaRef(w => subWeeks(w, 1))}
                  className="text-muted-foreground hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="text-center">
                  <p className="font-syne font-bold text-white text-base">{semanaLabel}</p>
                  <button
                    onClick={() => setSemanaRef(lunesDate())}
                    className="text-xs text-primary hover:underline mt-0.5"
                  >
                    Ir a esta semana
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSemanaRef(w => addWeeks(w, 1))}
                  className="text-muted-foreground hover:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {isLoadingSemana ? (
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl bg-border/30" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {(diasSemana || Array.from({ length: 7 }, (_, i) => null)).map((dia, idx) => {
                    if (!dia) return <Skeleton key={idx} className="h-28 rounded-xl bg-border/30" />;

                    const dateObj = parseISO(dia.fecha);
                    const dayNum = format(dateObj, "d");
                    const isTodayCell = isToday(dateObj);
                    const isSelected = dia.fecha === diaSeleccionado;
                    const isFuturo = dia.estado === "futuro";

                    return (
                      <button
                        key={dia.fecha}
                        onClick={() => setDiaSeleccionado(dia.fecha)}
                        className={`
                          rounded-xl border p-1.5 flex flex-col items-center gap-1
                          transition-all duration-150 hover:scale-105 cursor-pointer
                          min-h-[7rem] relative
                          ${getDiaStyle(dia.estado, isSelected, isTodayCell)}
                        `}
                      >
                        {/* Day name */}
                        <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                          {DIAS_CORTOS[idx]}
                        </span>

                        {/* Day number */}
                        <span className={`text-base sm:text-lg font-syne font-bold leading-none ${
                          isTodayCell ? "text-primary" : isFuturo ? "text-muted-foreground/60" : "text-white"
                        }`}>
                          {dayNum}
                        </span>

                        {/* HOY badge */}
                        {isTodayCell && (
                          <span className="text-[8px] font-bold text-primary uppercase tracking-widest leading-none">
                            HOY
                          </span>
                        )}

                        {/* Status emoji + label */}
                        <div className="flex flex-col items-center mt-auto">
                          <span className="text-base leading-none">{getDiaEmoji(dia.estado)}</span>
                          {dia.estado !== "futuro" && (
                            <span className={`text-[8px] sm:text-[9px] font-semibold leading-none mt-0.5 ${getDiaLabelColor(dia.estado)}`}>
                              {getDiaLabel(dia.estado)}
                            </span>
                          )}
                        </div>

                        {/* Rutina name */}
                        {dia.rutinaNombre && (
                          <p className="text-[8px] sm:text-[9px] text-center leading-tight text-[#4B7A5E] font-medium w-full truncate px-0.5">
                            💪 {dia.rutinaNombre}
                          </p>
                        )}

                        {/* Calories */}
                        {dia.caloriasTotal && (
                          <p className="text-[8px] sm:text-[9px] text-center leading-tight text-[#4B7A5E] font-medium">
                            🥗 {dia.caloriasTotal.toLocaleString()} kcal
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4 justify-center text-[10px] text-muted-foreground border-t border-border/30 pt-3">
                {[
                  { emoji: "✅", label: "Completado" },
                  { emoji: "🟡", label: "Parcial" },
                  { emoji: "🔴", label: "Fallado" },
                  { emoji: "🧘", label: "Descanso" },
                  { emoji: "📅", label: "Planificado" },
                ].map(({ emoji, label }) => (
                  <span key={label} className="flex items-center gap-1">
                    <span>{emoji}</span>{label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── DAY DETAIL PANEL ─────────────────────────────────────────────── */}
          {diaSeleccionado && (
            <div className="animate-in slide-in-from-top-2 duration-300 space-y-3">
              <div className="flex items-center gap-2 px-1">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-white capitalize">
                  {diaSelObj
                    ? format(diaSelObj, "EEEE, d 'de' MMMM yyyy", { locale: es })
                    : diaSeleccionado}
                </span>
              </div>

              {isLoadingDetalle ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-36 w-full bg-border/30" />
                  ))}
                </div>
              ) : detalleDia ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  {/* ── Tarjeta RUTINA ─────────────────────────────── */}
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                          <Dumbbell className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="font-syne font-semibold text-sm text-white">
                          {detalleDia.rutina.nombre || "Rutina del día"}
                        </span>
                        {detalleDia.checkinDiario.porcentajeAdherencia !== null && (
                          <span className={`ml-auto text-xs font-bold ${
                            (detalleDia.checkinDiario.porcentajeAdherencia ?? 0) >= 80
                              ? "text-emerald-400"
                              : (detalleDia.checkinDiario.porcentajeAdherencia ?? 0) >= 40
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}>
                            {detalleDia.checkinDiario.porcentajeAdherencia}%
                          </span>
                        )}
                      </div>

                      {detalleDia.rutina.existe ? (
                        <div className="space-y-1.5">
                          {/* Exercise count */}
                          <p className="text-xs text-muted-foreground">
                            {detalleDia.rutina.ejercicios.length} ejercicios
                          </p>
                          {/* Compact exercise list */}
                          <p className="text-xs text-muted-foreground/80 leading-relaxed">
                            {detalleDia.rutina.ejercicios
                              .slice(0, 4)
                              .map((e: any) => e.nombre)
                              .join(" · ")}
                            {detalleDia.rutina.ejercicios.length > 4 && (
                              <span className="text-muted-foreground/50">
                                {" "}+{detalleDia.rutina.ejercicios.length - 4} más
                              </span>
                            )}
                          </p>
                          {/* Status */}
                          <p className="text-xs mt-1">
                            {detalleDia.checkinDiario.realizado ? (
                              <span className="text-emerald-400">✅ Completada</span>
                            ) : isFuturoSelected ? (
                              <span className="text-muted-foreground/60">📅 Planificada</span>
                            ) : isHoySelected ? (
                              <span className="text-yellow-400">⏳ Pendiente hoy</span>
                            ) : (
                              <span className="text-muted-foreground/60">— Sin registro</span>
                            )}
                          </p>
                          {!isFuturoSelected && (
                            <Link href="/cliente/rutina">
                              <span className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-1.5 cursor-pointer">
                                Ver rutina completa <ChevronRight className="w-3 h-3" />
                              </span>
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <div className="text-2xl mb-1">🧘</div>
                          <p className="text-xs text-muted-foreground">Día de descanso</p>
                          <p className="text-xs text-muted-foreground/50 mt-0.5">
                            Aprovecha para estirar y recuperar
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ── Tarjeta NUTRICIÓN ──────────────────────────── */}
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                          <Utensils className="w-4 h-4 text-yellow-400" />
                        </div>
                        <span className="font-syne font-semibold text-sm text-white">Nutrición del día</span>
                        {detalleDia.nutricion.caloriasTotal && (
                          <span className="ml-auto text-xs font-bold text-yellow-400">
                            {detalleDia.nutricion.caloriasTotal.toLocaleString()} kcal
                          </span>
                        )}
                      </div>

                      {detalleDia.nutricion.existe ? (
                        <div className="space-y-1.5">
                          {/* Macros */}
                          {detalleDia.nutricion.macros && (
                            detalleDia.nutricion.macros.proteinas > 0 ||
                            detalleDia.nutricion.macros.carbohidratos > 0 ||
                            detalleDia.nutricion.macros.grasas > 0
                          ) && (
                            <p className="text-xs text-muted-foreground">
                              P:{detalleDia.nutricion.macros!.proteinas}g ·{" "}
                              C:{detalleDia.nutricion.macros!.carbohidratos}g ·{" "}
                              G:{detalleDia.nutricion.macros!.grasas}g
                            </p>
                          )}
                          {/* Meal names */}
                          <p className="text-xs text-muted-foreground/80">
                            {detalleDia.nutricion.comidas
                              .slice(0, 4)
                              .map((c: any) => {
                                const tipo = c.tipo || c.nombre || "Comida";
                                return tipo.charAt(0).toUpperCase() + tipo.slice(1);
                              })
                              .join(" · ")}
                          </p>
                          <Link href="/cliente/nutricion">
                            <span className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-2 cursor-pointer">
                              Ver plan completo <ChevronRight className="w-3 h-3" />
                            </span>
                          </Link>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-3">
                          Sin plan de nutrición este día
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* ── Tarjeta BIENESTAR — only for past/today ───── */}
                  {!isFuturoSelected && (
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                            <HeartPulse className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="font-syne font-semibold text-sm text-white">Bienestar emocional</span>
                        </div>

                        {detalleDia.checkinEmocional.realizado ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">
                                {MOOD_MAP[detalleDia.checkinEmocional.estadoAnimo ?? 3]?.emoji}
                              </span>
                              <div>
                                <p className="text-xs text-white font-medium">
                                  {MOOD_MAP[detalleDia.checkinEmocional.estadoAnimo ?? 3]?.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Energía {detalleDia.checkinEmocional.nivelEnergia ?? "—"}/5 ·{" "}
                                  {detalleDia.checkinEmocional.horasSueno ?? "—"}h sueño
                                </p>
                              </div>
                            </div>
                            {detalleDia.checkinEmocional.factores && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {String(detalleDia.checkinEmocional.factores)
                                  .split(",")
                                  .filter(Boolean)
                                  .map(f => (
                                    <span
                                      key={f}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300"
                                    >
                                      {f.trim()}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        ) : isHoySelected ? (
                          <div className="text-center py-1">
                            <p className="text-xs text-muted-foreground mb-2">
                              Aún no registraste hoy
                            </p>
                            <Link href="/cliente/emocional">
                              <span className="text-xs text-primary font-medium hover:underline flex items-center justify-center gap-1 cursor-pointer">
                                Hacer check-in <ChevronRight className="w-3 h-3" />
                              </span>
                            </Link>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            No se registró este día
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* ── Frase del día — solo hoy ──────────────────── */}
                  {isHoySelected && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-syne font-semibold text-sm text-white">Tu frase de hoy</span>
                        </div>
                        <blockquote className="text-sm text-white/90 italic leading-relaxed">
                          "{getFrase()}"
                        </blockquote>
                        <p className="text-xs text-primary font-medium mt-2 text-right">— {coachNombre}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ── SIDEBAR SUMMARY ─────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-syne text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Resumen Semanal
              </CardTitle>
              <p className="text-xs text-muted-foreground">{semanaLabel}</p>
            </CardHeader>
            <CardContent>
              {isLoadingSemana ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full bg-border/30" />)}
                </div>
              ) : (
                <>
                  {/* Adherencia big number */}
                  <div className="text-center mb-6 mt-2">
                    <span className="text-5xl font-syne font-bold text-white">
                      {adherenciaMedia !== null ? `${adherenciaMedia}%` : "—"}
                    </span>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mt-1">
                      Adherencia Promedio
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      Solo días con rutina asignada
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-sm p-3 bg-background/50 rounded-md border border-border/50">
                      <span className="text-muted-foreground text-xs">Días con rutina</span>
                      <span className="text-white font-bold">{diasConRutina.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-3 bg-background/50 rounded-md border border-border/50">
                      <span className="text-muted-foreground text-xs">Completados</span>
                      <span className="text-emerald-400 font-bold">{diasCompletados}</span>
                    </div>
                    {diasFallados > 0 && (
                      <div className="flex justify-between items-center text-sm p-3 bg-background/50 rounded-md border border-border/50">
                        <span className="text-muted-foreground text-xs">Fallados</span>
                        <span className="text-red-400 font-bold">{diasFallados}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm p-3 bg-background/50 rounded-md border border-border/50">
                      <span className="text-muted-foreground text-xs">Check-ins emocionales</span>
                      <span className="text-blue-400 font-bold">{checkinsEmocionales}</span>
                    </div>
                  </div>

                  {/* Status legend */}
                  <div className="mt-5 pt-4 border-t border-border/50 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Estados</p>
                    {[
                      { color: "bg-emerald-500/40 border-emerald-500/60", label: "Completado ≥80%" },
                      { color: "bg-yellow-500/40 border-yellow-500/60", label: "Parcial 40–79%" },
                      { color: "bg-red-500/40 border-red-500/60", label: "Fallado (tenía rutina)" },
                      { color: "bg-background/40 border-border/40", label: "Descanso (sin rutina)" },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className={`w-3 h-3 rounded border flex-shrink-0 ${color}`} />
                        {label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
