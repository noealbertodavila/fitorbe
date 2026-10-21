import { useState, useEffect, useCallback } from "react";
import { useListClientes, useGetRutina, getGetRutinaQueryKey, useCreateRutina, customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Save, Dumbbell, Calendar, Play, Info, Edit2, Check, X,
  Loader2, ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown,
  RefreshCw, History, Eye, CheckCircle2, PenLine, Download
} from "lucide-react";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { PrintablePlan } from "@/components/PrintablePlan";
import { PdfModeModal } from "@/components/PdfModeModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addWeeks } from "date-fns";
import { es } from "date-fns/locale";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const ORGANIZACION_LABELS: Record<string, string> = {
  grupo_muscular: "💪 Por grupo muscular",
  dia_semana: "📅 Por día de la semana",
  fullbody: "🔄 Fullbody",
  cardio_fuerza: "🏃 Cardio + Fuerza",
  hiit: "⚡ HIIT",
  personalizado: "🎯 Personalizado",
};

interface Ejercicio {
  nombre: string;
  series: number;
  repeticiones: string;
  descanso: string;
  instrucciones: string;
  videoUrl?: string;
  grupoMuscular?: string;
  completado?: boolean;
}

interface DiaRutina {
  diaSemana: number;
  ejercicios: Ejercicio[];
  guardado?: boolean;
}

type PageMode = "view" | "draft" | "manual";
type TipoCreacion = "ia" | "manual";
type Duracion = 1 | 2 | 4;
type Organizacion = "grupo_muscular" | "dia_semana" | "fullbody" | "cardio_fuerza" | "hiit" | "personalizado";

const ejercicioVacio = (): Ejercicio => ({
  nombre: "",
  series: 3,
  repeticiones: "10-12",
  descanso: "60 seg",
  instrucciones: "",
  videoUrl: "",
  grupoMuscular: "",
  completado: false,
});

export default function CoachRutinas() {
  const urlParams = new URLSearchParams(window.location.search);
  const clienteIdFromUrl = urlParams.get("clienteId") || "";
  const { exportToPdf, isExporting } = usePdfExport();
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [rutinaPrintMode, setRutinaPrintMode] = useState<"print" | "digital">("digital");

  const [selectedCliente, setSelectedCliente] = useState<string>(clienteIdFromUrl);
  const [semanaInicio, setSemanaInicio] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1);
  const [tipoCreacion, setTipoCreacion] = useState<TipoCreacion>("ia");
  const [duracion, setDuracion] = useState<Duracion>(1);
  const [organizacion, setOrganizacion] = useState<Organizacion>("grupo_muscular");

  // Page mode & draft
  const [pageMode, setPageMode] = useState<PageMode>("view");
  const [draftDias, setDraftDias] = useState<DiaRutina[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedDias, setExpandedDias] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6]));
  const [editingEj, setEditingEj] = useState<{ dia: number; idx: number } | null>(null);

  // History
  const [historialSemanas, setHistorialSemanas] = useState<{ semanaInicio: string; aprobada: boolean }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clientes, isLoading: isLoadingClientes } = useListClientes({ activo: true });

  useEffect(() => {
    if (clienteIdFromUrl && !selectedCliente) setSelectedCliente(clienteIdFromUrl);
  }, [clienteIdFromUrl]);

  const clienteId = selectedCliente ? parseInt(selectedCliente) : 0;
  const clienteSeleccionado = clientes?.find(c => c.id === clienteId);

  const { data: rutinas, isLoading: isLoadingRutina, error: errorRutina } = useGetRutina(
    clienteId, semanaInicio,
    { query: { queryKey: getGetRutinaQueryKey(clienteId, semanaInicio), enabled: !!clienteId && pageMode === "view" } }
  );

  const createRutinaMutation = useCreateRutina({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/rutinas/${clienteId}/${semanaInicio}`] });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error al guardar", description: err?.message });
      }
    }
  });

  // Load history when cliente changes
  useEffect(() => {
    if (!clienteId) return;
    customFetch<any>(`/api/rutinas/semanas/${clienteId}`)
      .then(data => setHistorialSemanas(Array.isArray(data) ? data : []))
      .catch(() => setHistorialSemanas([]));
  }, [clienteId, pageMode]);

  const handleOpenModal = () => {
    if (!clienteId) {
      toast({ variant: "destructive", title: "Selecciona un cliente primero" });
      return;
    }
    setModalStep(1);
    setTipoCreacion("ia");
    setDuracion(1);
    setOrganizacion("grupo_muscular");
    setShowModal(true);
  };

  const handleModalConfirm = async () => {
    setShowModal(false);
    if (tipoCreacion === "manual") {
      const dias: DiaRutina[] = Array.from({ length: 7 }, (_, i) => ({ diaSemana: i, ejercicios: [] }));
      setDraftDias(dias);
      setPageMode("manual");
      setExpandedDias(new Set([0]));
      return;
    }

    // AI generation
    setIsGenerating(true);
    setPageMode("draft");

    const semanasAGenerar: string[] = [];
    for (let w = 0; w < duracion; w++) {
      const fecha = addWeeks(new Date(semanaInicio + "T12:00:00"), w);
      semanasAGenerar.push(format(fecha, "yyyy-MM-dd"));
    }

    // Generate first week immediately, show draft
    try {
      const resultado = await customFetch<any>("/api/rutinas/generar-ai", {
        method: "POST",
        body: JSON.stringify({ clienteId, semanaInicio: semanasAGenerar[0], organizacion }),
      });
      if (resultado?.error) throw new Error(resultado.error);

      const dias: DiaRutina[] = (resultado.dias || []).map((d: any) => ({
        diaSemana: d.diaSemana,
        ejercicios: d.ejercicios || [],
      }));
      // Fill missing days
      for (let i = 0; i < 7; i++) {
        if (!dias.find(d => d.diaSemana === i)) {
          dias.push({ diaSemana: i, ejercicios: [] });
        }
      }
      dias.sort((a, b) => a.diaSemana - b.diaSemana);
      setDraftDias(dias);
      setExpandedDias(new Set([0, 1, 2, 3, 4, 5, 6]));
      toast({
        title: "¡Plan generado por IA!",
        description: `Revisa y edita la rutina de ${clienteSeleccionado?.nombre} antes de publicar.`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al generar", description: err?.message || "Error desconocido" });
      setPageMode("view");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerear = async () => {
    setIsGenerating(true);
    try {
      const resultado = await customFetch<any>("/api/rutinas/generar-ai", {
        method: "POST",
        body: JSON.stringify({ clienteId, semanaInicio }),
      });
      if (resultado?.error) throw new Error(resultado.error);
      const dias: DiaRutina[] = (resultado.dias || []).map((d: any) => ({
        diaSemana: d.diaSemana,
        ejercicios: d.ejercicios || [],
      }));
      for (let i = 0; i < 7; i++) {
        if (!dias.find(d => d.diaSemana === i)) dias.push({ diaSemana: i, ejercicios: [] });
      }
      dias.sort((a, b) => a.diaSemana - b.diaSemana);
      setDraftDias(dias);
      toast({ title: "Nueva versión generada", description: "La IA generó una rutina diferente." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const [regenerandoDia, setRegenerandoDia] = useState<number | null>(null);
  const regenerarDia = async (diaIdx: number) => {
    setRegenerandoDia(diaIdx);
    try {
      const resultado = await customFetch<any>("/api/rutinas/generar-ai", {
        method: "POST",
        body: JSON.stringify({ clienteId, semanaInicio }),
      });
      if (resultado?.error) throw new Error(resultado.error);
      const diaGenerado = (resultado.dias || []).find((d: any) => d.diaSemana === diaIdx);
      if (!diaGenerado) throw new Error("El AI no generó ese día");
      setDraftDias(prev => prev.map(d => d.diaSemana === diaIdx ? { ...d, ejercicios: diaGenerado.ejercicios || [], guardado: false } : d));
      toast({ title: `${DIAS[diaIdx]} regenerado`, description: "Revisa los nuevos ejercicios antes de guardar." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al regenerar", description: err?.message });
    } finally {
      setRegenerandoDia(null);
    }
  };

  const saveDia = async (diaIdx: number, aprobada = false) => {
    const dia = draftDias.find(d => d.diaSemana === diaIdx);
    if (!dia) return;
    await createRutinaMutation.mutateAsync({
      data: { clienteId, semanaInicio, diaSemana: diaIdx, ejercicios: dia.ejercicios, aprobada, notas: "" }
    });
    setDraftDias(prev => prev.map(d => d.diaSemana === diaIdx ? { ...d, guardado: true } : d));
  };

  const saveAll = async (aprobada = false) => {
    for (const dia of draftDias) {
      await createRutinaMutation.mutateAsync({
        data: { clienteId, semanaInicio, diaSemana: dia.diaSemana, ejercicios: dia.ejercicios, aprobada, notas: "" }
      });
    }
    toast({ title: aprobada ? "¡Rutina publicada!" : "Rutina guardada como borrador", description: `${clienteSeleccionado?.nombre} ya puede verla.` });
    setPageMode("view");
    queryClient.invalidateQueries({ queryKey: [`/api/rutinas/${clienteId}/${semanaInicio}`] });
  };

  // Draft editing helpers
  const updateEjercicio = (diaIdx: number, ejIdx: number, field: keyof Ejercicio, value: any) => {
    setDraftDias(prev => prev.map(d => {
      if (d.diaSemana !== diaIdx) return d;
      const ejs = [...d.ejercicios];
      ejs[ejIdx] = { ...ejs[ejIdx], [field]: value };
      return { ...d, ejercicios: ejs, guardado: false };
    }));
  };

  const addEjercicio = (diaIdx: number) => {
    setDraftDias(prev => prev.map(d =>
      d.diaSemana === diaIdx
        ? { ...d, ejercicios: [...d.ejercicios, ejercicioVacio()], guardado: false }
        : d
    ));
  };

  const removeEjercicio = (diaIdx: number, ejIdx: number) => {
    setDraftDias(prev => prev.map(d => {
      if (d.diaSemana !== diaIdx) return d;
      const ejs = [...d.ejercicios];
      ejs.splice(ejIdx, 1);
      return { ...d, ejercicios: ejs, guardado: false };
    }));
  };

  const moveEjercicio = (diaIdx: number, ejIdx: number, dir: -1 | 1) => {
    setDraftDias(prev => prev.map(d => {
      if (d.diaSemana !== diaIdx) return d;
      const ejs = [...d.ejercicios];
      const newIdx = ejIdx + dir;
      if (newIdx < 0 || newIdx >= ejs.length) return d;
      [ejs[ejIdx], ejs[newIdx]] = [ejs[newIdx], ejs[ejIdx]];
      return { ...d, ejercicios: ejs, guardado: false };
    }));
  };

  const toggleDia = (idx: number) => {
    setExpandedDias(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Inline editing of saved rutinas (view mode)
  const [viewEditDia, setViewEditDia] = useState<number | null>(null);
  const [viewEditEjIdx, setViewEditEjIdx] = useState<number | null>(null);
  const [viewEditData, setViewEditData] = useState<Ejercicio | null>(null);

  const startViewEdit = (dia: number, ejIdx: number, ej: Ejercicio) => {
    setViewEditDia(dia);
    setViewEditEjIdx(ejIdx);
    setViewEditData({ ...ej });
  };

  const saveViewEdit = async () => {
    if (viewEditDia === null || viewEditEjIdx === null || !viewEditData) return;
    const rutinaDia = rutinas?.find(r => r.diaSemana === viewEditDia);
    if (!rutinaDia) return;
    const ejerciciosActualizados = (rutinaDia.ejercicios as Ejercicio[]).map((ej, i) =>
      i === viewEditEjIdx ? viewEditData : ej
    );
    await createRutinaMutation.mutateAsync({
      data: { clienteId, semanaInicio, diaSemana: viewEditDia, ejercicios: ejerciciosActualizados, aprobada: rutinaDia.aprobada, notas: rutinaDia.notas || "" }
    });
    toast({ title: "Ejercicio actualizado" });
    setViewEditDia(null);
    setViewEditEjIdx(null);
    setViewEditData(null);
  };

  const isEditingViewEj = (dia: number, ejIdx: number) => viewEditDia === dia && viewEditEjIdx === ejIdx;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white">Gestión de Rutinas</h1>
          <p className="text-muted-foreground">Asigna y genera planes de entrenamiento personalizados</p>
        </div>
        {clienteId > 0 && pageMode === "view" && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-4 h-4 mr-1" />
            Historial
          </Button>
        )}
      </div>

      {/* Controls bar */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Cliente</label>
              {isLoadingClientes ? <Skeleton className="h-12 w-full bg-border/50" /> : (
                <Select value={selectedCliente} onValueChange={v => { setSelectedCliente(v); setPageMode("view"); }}>
                  <SelectTrigger className="bg-background/50 h-12">
                    <SelectValue placeholder="Elige un cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Semana</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input type="date" className="bg-background/50 h-12 pl-10" value={semanaInicio}
                  onChange={e => { setSemanaInicio(e.target.value); setPageMode("view"); }} />
              </div>
            </div>
            {pageMode === "view" ? (
              <Button className="h-12 w-full font-bold tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!clienteId} onClick={handleOpenModal}>
                <Sparkles className="w-5 h-5 mr-2" />
                CREAR PLAN
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="h-12 flex-1 border-border/50 text-muted-foreground hover:text-white"
                  onClick={() => setPageMode("view")}>
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History panel */}
      {showHistory && historialSemanas.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-syne text-base flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Historial de Planes — {clienteSeleccionado?.nombre}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {historialSemanas.map(s => (
                <button key={s.semanaInicio}
                  className={`p-3 rounded-lg border text-sm text-left transition-colors ${semanaInicio === s.semanaInicio ? "border-primary bg-primary/10 text-primary" : "border-border/50 hover:border-primary/40 text-muted-foreground hover:text-white"}`}
                  onClick={() => { setSemanaInicio(s.semanaInicio); setPageMode("view"); setShowHistory(false); }}>
                  <div className="font-medium">{format(new Date(s.semanaInicio + "T12:00:00"), "dd MMM", { locale: es })}</div>
                  <div className="text-xs mt-0.5">{s.aprobada ? "✓ Publicada" : "Borrador"}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generating spinner */}
      {isGenerating && (
        <Card className="bg-card border-primary/30 border">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-syne font-bold text-white mb-2">Nahomy está generando tu plan personalizado...</h3>
            <p className="text-muted-foreground text-sm">La IA está creando una rutina adaptada al perfil de {clienteSeleccionado?.nombre}. Por favor espera.</p>
          </CardContent>
        </Card>
      )}

      {/* DRAFT / MANUAL MODE */}
      {!isGenerating && (pageMode === "draft" || pageMode === "manual") && (
        <div className="space-y-4">
          {/* Draft header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-syne font-bold text-white flex items-center gap-2">
                {pageMode === "draft" ? <Sparkles className="w-5 h-5 text-primary" /> : <PenLine className="w-5 h-5 text-primary" />}
                {pageMode === "draft" ? "Plan generado por IA — edita antes de publicar" : "Creación manual"}
              </h2>
              <p className="text-sm text-muted-foreground">Semana del {format(new Date(semanaInicio + "T12:00:00"), "dd MMM yyyy", { locale: es })} · {clienteSeleccionado?.nombre}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pageMode === "draft" && (
                <Button variant="outline" size="sm" className="border-border/50 text-muted-foreground hover:text-white"
                  onClick={handleRegenerear} disabled={isGenerating}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Regenerar
                </Button>
              )}
              <Button variant="outline" size="sm" className="border-border/50"
                onClick={() => saveAll(false)} disabled={createRutinaMutation.isPending}>
                <Save className="w-4 h-4 mr-1" /> Guardar borrador
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => saveAll(true)} disabled={createRutinaMutation.isPending}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {createRutinaMutation.isPending ? "Guardando..." : "Guardar y publicar"}
              </Button>
            </div>
          </div>

          {/* Days */}
          {DIAS.map((dia, idx) => {
            const diaData = draftDias.find(d => d.diaSemana === idx);
            const ejercicios = diaData?.ejercicios || [];
            const isExpanded = expandedDias.has(idx);

            return (
              <Card key={idx} className={`bg-card border-border/50 ${diaData?.guardado ? "border-primary/30" : ""}`}>
                <CardHeader className="pb-2 cursor-pointer hover:bg-white/2" onClick={() => toggleDia(idx)}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-syne text-base flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                      {dia}
                      <span className="text-xs text-muted-foreground font-normal">({ejercicios.length} ejercicios)</span>
                      {diaData?.guardado && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </CardTitle>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-primary text-xs"
                        onClick={() => regenerarDia(idx)} disabled={regenerandoDia !== null}>
                        <RefreshCw className={`w-3 h-3 mr-1 ${regenerandoDia === idx ? "animate-spin" : ""}`} />
                        {regenerandoDia === idx ? "..." : "Regenerar IA"}
                      </Button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-4 space-y-3">
                    {ejercicios.map((ej, ejIdx) => (
                      <div key={ejIdx} className="bg-background/40 rounded-lg border border-border/40 p-4 space-y-3">
                        {/* Exercise number + controls */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="w-6 h-6 rounded-md bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{ejIdx + 1}</span>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                              onClick={() => moveEjercicio(idx, ejIdx, -1)} disabled={ejIdx === 0}>
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                              onClick={() => moveEjercicio(idx, ejIdx, 1)} disabled={ejIdx === ejercicios.length - 1}>
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => removeEjercicio(idx, ejIdx)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Nombre del ejercicio</label>
                            <Input value={ej.nombre} onChange={e => updateEjercicio(idx, ejIdx, "nombre", e.target.value)}
                              placeholder="Ej: Sentadilla con barra" className="bg-background text-sm h-9" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Grupo muscular</label>
                            <Input value={ej.grupoMuscular || ""} onChange={e => updateEjercicio(idx, ejIdx, "grupoMuscular", e.target.value)}
                              placeholder="Ej: Cuádriceps" className="bg-background text-sm h-9" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Link YouTube</label>
                            <Input value={ej.videoUrl || ""} onChange={e => updateEjercicio(idx, ejIdx, "videoUrl", e.target.value)}
                              placeholder="https://youtube.com/..." className="bg-background text-sm h-9" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Series</label>
                            <Input type="number" min={1} value={ej.series}
                              onChange={e => updateEjercicio(idx, ejIdx, "series", parseInt(e.target.value) || 3)}
                              className="bg-background text-sm h-9" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Repeticiones</label>
                            <Input value={ej.repeticiones} onChange={e => updateEjercicio(idx, ejIdx, "repeticiones", e.target.value)}
                              placeholder="10-12" className="bg-background text-sm h-9" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Descanso</label>
                            <Input value={ej.descanso} onChange={e => updateEjercicio(idx, ejIdx, "descanso", e.target.value)}
                              placeholder="60 seg" className="bg-background text-sm h-9" />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Instrucciones (técnica, posición, respiración)</label>
                          <Textarea value={ej.instrucciones} onChange={e => updateEjercicio(idx, ejIdx, "instrucciones", e.target.value)}
                            placeholder="Describe la técnica correcta..." className="bg-background text-sm resize-none h-16" />
                        </div>
                      </div>
                    ))}

                    {/* Add exercise + save day */}
                    <div className="flex items-center justify-between pt-1">
                      <Button size="sm" variant="outline" className="border-dashed border-border/60 text-muted-foreground hover:text-primary hover:border-primary/50"
                        onClick={() => addEjercicio(idx)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Agregar ejercicio
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-primary"
                        onClick={() => saveDia(idx)} disabled={createRutinaMutation.isPending}>
                        <Save className="w-3.5 h-3.5 mr-1" /> Guardar día
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Bottom save buttons */}
          <div className="flex flex-wrap gap-3 justify-end pt-2">
            <Button variant="outline" className="border-border/50" onClick={() => saveAll(false)} disabled={createRutinaMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> Guardar como borrador
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => saveAll(true)} disabled={createRutinaMutation.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {createRutinaMutation.isPending ? "Publicando..." : "Guardar y publicar"}
            </Button>
          </div>
        </div>
      )}

      {/* VIEW MODE */}
      {pageMode === "view" && !isGenerating && (
        <>
          {!clienteId ? (
            <div className="text-center py-20 bg-card border border-border/50 rounded-lg">
              <Dumbbell className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-syne font-bold text-white mb-2">Selecciona un cliente</h3>
              <p className="text-muted-foreground">Elige un cliente para ver o crear su rutina semanal</p>
            </div>
          ) : isLoadingRutina ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full bg-border/50 rounded-lg" />)}</div>
          ) : errorRutina ? (
            <div className="text-center py-16 bg-card border border-red-500/30 rounded-lg">
              <Info className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-red-400 font-medium">Error al cargar la rutina</p>
            </div>
          ) : rutinas && rutinas.length > 0 ? (
            <div className="space-y-3">
              {/* Hidden printable panel for PDF export */}
              <div style={{ position: "absolute", left: "-9999px", top: 0, pointerEvents: "none" }}>
                <PrintablePlan
                  tipo="rutina"
                  clienteNombre={clienteSeleccionado?.nombre || "Cliente"}
                  coachNombre="Nahomy"
                  semanaInicio={semanaInicio}
                  printMode={rutinaPrintMode}
                  dias={(rutinas as any[]).map((r: any) => ({
                    diaSemana: r.diaSemana,
                    nombre: r.nombre,
                    descripcion: r.descripcion,
                    ejercicios: r.ejercicios || [],
                  }))}
                />
              </div>
              <PdfModeModal
                open={showPdfModal}
                onClose={() => setShowPdfModal(false)}
                isExporting={isExporting}
                onSelect={async (mode) => {
                  setRutinaPrintMode(mode);
                  setShowPdfModal(false);
                  await new Promise(r => setTimeout(r, 80));
                  await exportToPdf("printable-plan", {
                    filename: `rutina-${clienteSeleccionado?.nombre?.replace(/\s/g, "-")}-${semanaInicio}`,
                    backgroundColor: mode === "print" ? "#FFFFFF" : "#0A0A0A",
                  });
                }}
              />
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-syne font-bold text-white">Rutina de {clienteSeleccionado?.nombre}</h2>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Semana del {format(new Date(semanaInicio + "T12:00:00"), "dd MMM yyyy", { locale: es })}
                  </p>
                  <Button size="sm" variant="outline" className="border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 h-8 text-xs"
                    onClick={() => setShowPdfModal(true)}
                    disabled={isExporting}>
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                    PDF
                  </Button>
                </div>
              </div>

              {DIAS.map((dia, idx) => {
                const rutinaDia = rutinas.find(r => r.diaSemana === idx);
                const ejercicios = (rutinaDia?.ejercicios as Ejercicio[]) || [];
                const isExpanded = expandedDias.has(idx);

                return (
                  <Card key={idx} className="bg-card border-border/50">
                    <CardHeader className="pb-3 cursor-pointer hover:bg-white/2" onClick={() => toggleDia(idx)}>
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-syne text-base flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                          {dia}
                          <span className="text-xs text-muted-foreground font-normal">({ejercicios.length} ejercicios)</span>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {rutinaDia?.aprobada && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Publicada</Badge>}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="p-4">
                        {ejercicios.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic py-2">Descanso / Sin asignar</p>
                        ) : (
                          <div className="space-y-3">
                            {ejercicios.map((ej, ejIdx) => {
                              if (isEditingViewEj(idx, ejIdx) && viewEditData) {
                                return (
                                  <div key={ejIdx} className="bg-background/50 rounded-lg border border-primary/40 p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="col-span-2">
                                        <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                                        <Input value={viewEditData.nombre} onChange={e => setViewEditData({ ...viewEditData, nombre: e.target.value })} className="bg-background text-sm h-9" />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Grupo muscular</label>
                                        <Input value={viewEditData.grupoMuscular || ""} onChange={e => setViewEditData({ ...viewEditData, grupoMuscular: e.target.value })} className="bg-background text-sm h-9" />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Link YouTube</label>
                                        <Input value={viewEditData.videoUrl || ""} onChange={e => setViewEditData({ ...viewEditData, videoUrl: e.target.value })} className="bg-background text-sm h-9" />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Series</label>
                                        <Input type="number" value={viewEditData.series} onChange={e => setViewEditData({ ...viewEditData, series: parseInt(e.target.value) || 3 })} className="bg-background text-sm h-9" />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
                                        <Input value={viewEditData.repeticiones} onChange={e => setViewEditData({ ...viewEditData, repeticiones: e.target.value })} className="bg-background text-sm h-9" />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Descanso</label>
                                        <Input value={viewEditData.descanso} onChange={e => setViewEditData({ ...viewEditData, descanso: e.target.value })} className="bg-background text-sm h-9" />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground mb-1 block">Instrucciones</label>
                                      <Textarea value={viewEditData.instrucciones} onChange={e => setViewEditData({ ...viewEditData, instrucciones: e.target.value })} className="bg-background text-sm resize-none h-16" />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8" onClick={saveViewEdit} disabled={createRutinaMutation.isPending}>
                                        <Check className="w-3 h-3 mr-1" /> Guardar
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => { setViewEditDia(null); setViewEditEjIdx(null); setViewEditData(null); }}>
                                        <X className="w-3 h-3 mr-1" /> Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div key={ejIdx} className="flex items-center justify-between bg-background/30 rounded-lg px-4 py-3 border border-border/40 hover:border-primary/30 transition-colors group">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 mt-0.5">{ejIdx + 1}</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-white group-hover:text-primary transition-colors">{ej.nombre}</p>
                                      <div className="flex flex-wrap gap-3 mt-1">
                                        <span className="text-xs text-muted-foreground">{ej.series} series × {ej.repeticiones}</span>
                                        {ej.descanso && <span className="text-xs text-muted-foreground">Descanso: {ej.descanso}</span>}
                                        {ej.grupoMuscular && <span className="text-xs text-primary/70 font-medium">{ej.grupoMuscular}</span>}
                                      </div>
                                      {ej.instrucciones && <p className="text-xs text-muted-foreground/70 mt-1 italic line-clamp-2">{ej.instrucciones}</p>}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 ml-2 flex-shrink-0">
                                    <a
                                      href={ej.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent((ej.nombre || '') + ' ejercicio técnica correcta español')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      title={ej.videoUrl ? "Ver video" : "Buscar en YouTube"}
                                    >
                                      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 hover:bg-primary/10 rounded-full ${ej.videoUrl ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}>
                                        <Play className="w-4 h-4" />
                                      </Button>
                                    </a>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => startViewEdit(idx, ejIdx, ej)}>
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-card border border-border/50 rounded-lg">
              <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-syne font-bold text-white mb-2">Sin rutina esta semana</h3>
              <p className="text-muted-foreground mb-6">
                {clienteSeleccionado ? `${clienteSeleccionado.nombre} no tiene rutina para la semana del ${format(new Date(semanaInicio + "T12:00:00"), "dd MMM", { locale: es })}` : ""}
              </p>
              <Button onClick={handleOpenModal} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Sparkles className="w-4 h-4 mr-2" /> Crear plan
              </Button>
            </div>
          )}
        </>
      )}

      {/* Pre-creation modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border/50 text-foreground max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-syne text-xl">
              {modalStep === 1
                ? "¿Cómo deseas crear el plan?"
                : modalStep === 2
                ? "¿Por cuánto tiempo?"
                : modalStep === 3
                ? "¿Cómo organizar los ejercicios?"
                : "Confirmar datos del cliente"}
            </DialogTitle>
            <div className="flex items-center gap-1 pt-2">
              {[1, 2, ...(tipoCreacion === "ia" ? [3, 4] : [])].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= modalStep ? "bg-primary" : "bg-border/50"}`} />
              ))}
            </div>
          </DialogHeader>

          {/* Step 1 — Tipo de creación */}
          {modalStep === 1 && (
            <div className="space-y-3 py-2">
              {[
                { value: "ia", label: "🤖 Generar con IA", desc: "El AI diseña el plan completo según el perfil del cliente", icon: Sparkles },
                { value: "manual", label: "✏️ Crear manualmente", desc: "Llena tú mismo cada ejercicio y día", icon: PenLine },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.value} onClick={() => setTipoCreacion(opt.value as TipoCreacion)}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${tipoCreacion === opt.value ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/40"}`}>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${tipoCreacion === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <div className={`font-medium ${tipoCreacion === opt.value ? "text-primary" : "text-white"}`}>{opt.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                      </div>
                      {tipoCreacion === opt.value && <Check className="w-4 h-4 text-primary ml-auto" />}
                    </div>
                  </button>
                );
              })}
              <Button className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setModalStep(2)}>
                Siguiente →
              </Button>
            </div>
          )}

          {/* Step 2 — Duración */}
          {modalStep === 2 && (
            <div className="space-y-3 py-2">
              {[
                { value: 1, label: "1 semana", desc: "7 días de plan" },
                { value: 2, label: "15 días", desc: "2 semanas de plan" },
                { value: 4, label: "1 mes", desc: "4 semanas de plan" },
              ].map(opt => (
                <button key={opt.value} onClick={() => setDuracion(opt.value as Duracion)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${duracion === opt.value ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/40"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-medium ${duracion === opt.value ? "text-primary" : "text-white"}`}>{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                    </div>
                    {duracion === opt.value && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </button>
              ))}
              <div className="flex gap-2 mt-2">
                <Button variant="outline" className="flex-1 border-border/50 text-muted-foreground" onClick={() => setModalStep(1)}>← Atrás</Button>
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setModalStep(tipoCreacion === "ia" ? 3 : 4)}>
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Organización (solo para IA) */}
          {modalStep === 3 && tipoCreacion === "ia" && (
            <div className="space-y-2 py-2">
              {([
                {
                  value: "grupo_muscular",
                  label: "💪 Por grupo muscular",
                  desc: "Lun: Pecho · Mar: Espalda · Mié: Piernas · Jue: Hombros · Vie: Fullbody",
                },
                {
                  value: "dia_semana",
                  label: "📅 Por día de la semana",
                  desc: "Tipo de entrenamiento variado cada día, sin grupo muscular fijo",
                },
                {
                  value: "fullbody",
                  label: "🔄 Fullbody",
                  desc: "Todos los días trabajan el cuerpo completo con ejercicios compuestos",
                },
                {
                  value: "cardio_fuerza",
                  label: "🏃 Cardio + Fuerza",
                  desc: "Alterna días de cardio (LISS/HIIT) con días de entrenamiento de fuerza",
                },
                {
                  value: "hiit",
                  label: "⚡ HIIT",
                  desc: "Circuitos de alta intensidad por intervalos. Incluye trabajo:descanso en cada ejercicio",
                },
                {
                  value: "personalizado",
                  label: "🎯 Personalizado",
                  desc: "La IA genera una estructura base que el coach puede ajustar manualmente",
                },
              ] as { value: Organizacion; label: string; desc: string }[]).map(opt => (
                <button key={opt.value} onClick={() => setOrganizacion(opt.value)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${organizacion === opt.value ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/30"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={`font-medium text-sm ${organizacion === opt.value ? "text-primary" : "text-white"}`}>{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.desc}</div>
                    </div>
                    {organizacion === opt.value && <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                  </div>
                </button>
              ))}
              <div className="flex gap-2 mt-2">
                <Button variant="outline" className="flex-1 border-border/50 text-muted-foreground" onClick={() => setModalStep(2)}>← Atrás</Button>
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setModalStep(4)}>Siguiente →</Button>
              </div>
            </div>
          )}

          {/* Step 4 — Confirmación */}
          {modalStep === 4 && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Datos que el AI usará para generar la rutina de{" "}
                <span className="text-white font-medium">{clienteSeleccionado?.nombre}</span>:
              </p>
              <div className="bg-background/50 rounded-lg border border-border/40 p-4 space-y-2 text-sm">
                {([
                  ["Objetivo", (clienteSeleccionado as any)?.objetivoPrincipal || (clienteSeleccionado as any)?.objetivo || "No especificado"],
                  ["Nivel", (clienteSeleccionado as any)?.nivelFitness || "No especificado"],
                  ["Días disponibles", (clienteSeleccionado as any)?.diasDisponibles ? `${(clienteSeleccionado as any).diasDisponibles} días/semana` : "No especificado"],
                  ["Duración sesión", (clienteSeleccionado as any)?.duracionSesion || "No especificado"],
                  ["Lugar", (clienteSeleccionado as any)?.lugarEntrenamiento || "No especificado"],
                  ["Lesiones", (clienteSeleccionado as any)?.lesiones || "Ninguna"],
                  ...(tipoCreacion === "ia" ? [
                    ["Organización", ORGANIZACION_LABELS[organizacion]],
                  ] : []),
                ] as [string, string][]).map(([key, val]) => (
                  <div key={key} className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground flex-shrink-0">{key}:</span>
                    <span className={`text-right font-medium ${!val || val === "No especificado" ? "text-muted-foreground/50" : "text-white"}`}>{val || "No especificado"}</span>
                  </div>
                ))}
              </div>
              {!(clienteSeleccionado as any)?.nivelFitness && (
                <p className="text-xs text-yellow-500/80">⚠ Algunos datos del perfil no están completados. Completa el perfil del cliente para mejores resultados.</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-border/50 text-muted-foreground"
                  onClick={() => setModalStep(tipoCreacion === "ia" ? 3 : 2)}>← Atrás</Button>
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleModalConfirm}>
                  {tipoCreacion === "ia"
                    ? <><Sparkles className="w-4 h-4 mr-1" />Confirmar y generar</>
                    : <><PenLine className="w-4 h-4 mr-1" />Comenzar</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
