import { useState, useEffect } from "react";
import { useListClientes, useGetPlanComida, getGetPlanComidaQueryKey, useCreatePlanComida, customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Save, Utensils, Calendar, Info, Edit2, Check, X,
  Loader2, ChevronDown, ChevronUp, Plus, Trash2, RefreshCw,
  History, CheckCircle2, PenLine, Download
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
import { useAuth } from "@/contexts/AuthContext";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface Ingrediente {
  nombre: string;
  gramos: number;
  calorias: number;
  proteinas: number;
  carbos: number;
  grasas: number;
}

interface Comida {
  nombre: string;
  descripcion: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  hora?: string;
  notas?: string;
  completada?: boolean;
  ingredientes?: Ingrediente[];
}

interface DiaComida {
  diaSemana: number;
  comidas: Comida[];
  guardado?: boolean;
}

type PageMode = "view" | "draft" | "manual";
type TipoCreacion = "ia" | "manual";
type Duracion = 1 | 2 | 4;

const ingredienteVacio = (): Ingrediente => ({
  nombre: "", gramos: 0, calorias: 0, proteinas: 0, carbos: 0, grasas: 0,
});

const comidaVacia = (): Comida => ({
  nombre: "",
  descripcion: "",
  calorias: 0,
  proteinas: 0,
  carbohidratos: 0,
  grasas: 0,
  hora: "",
  notas: "",
  completada: false,
  ingredientes: [ingredienteVacio()],
});

const calcTotalesIngredientes = (ingredientes: Ingrediente[]) => ({
  calorias: ingredientes.reduce((s, i) => s + (Number(i.calorias) || 0), 0),
  proteinas: ingredientes.reduce((s, i) => s + (Number(i.proteinas) || 0), 0),
  carbohidratos: ingredientes.reduce((s, i) => s + (Number(i.carbos) || 0), 0),
  grasas: ingredientes.reduce((s, i) => s + (Number(i.grasas) || 0), 0),
  gramos: ingredientes.reduce((s, i) => s + (Number(i.gramos) || 0), 0),
});

const calcTotales = (comidas: Comida[]) => ({
  calorias: comidas.reduce((s, c) => s + (c.calorias || 0), 0),
  proteinas: comidas.reduce((s, c) => s + (c.proteinas || 0), 0),
  carbohidratos: comidas.reduce((s, c) => s + (c.carbohidratos || 0), 0),
  grasas: comidas.reduce((s, c) => s + (c.grasas || 0), 0),
});

export default function CoachNutricion() {
  const { user } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const clienteIdFromUrl = urlParams.get("clienteId") || "";
  const { exportToPdf, isExporting } = usePdfExport();
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [nutricionPrintMode, setNutricionPrintMode] = useState<"print" | "digital">("digital");

  const [selectedCliente, setSelectedCliente] = useState<string>(clienteIdFromUrl);
  const [semanaInicio, setSemanaInicio] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [tipoCreacion, setTipoCreacion] = useState<TipoCreacion>("ia");
  const [duracion, setDuracion] = useState<Duracion>(1);

  // Page
  const [pageMode, setPageMode] = useState<PageMode>("view");
  const [draftDias, setDraftDias] = useState<DiaComida[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedDias, setExpandedDias] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6]));

  // History
  const [historialSemanas, setHistorialSemanas] = useState<{ semanaInicio: string; aprobada: boolean }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // View mode inline edit
  const [viewEditDia, setViewEditDia] = useState<number | null>(null);
  const [viewEditIdx, setViewEditIdx] = useState<number | null>(null);
  const [viewEditData, setViewEditData] = useState<Comida | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clientes, isLoading: isLoadingClientes } = useListClientes({ activo: true });

  useEffect(() => {
    if (clienteIdFromUrl && !selectedCliente) setSelectedCliente(clienteIdFromUrl);
  }, [clienteIdFromUrl]);

  const clienteId = selectedCliente ? parseInt(selectedCliente) : 0;
  const clienteSeleccionado = clientes?.find(c => c.id === clienteId);

  const { data: planes, isLoading: isLoadingPlan, error: errorPlan } = useGetPlanComida(
    clienteId, semanaInicio,
    { query: { queryKey: getGetPlanComidaQueryKey(clienteId, semanaInicio), enabled: !!clienteId && pageMode === "view" } }
  );

  const createMutation = useCreatePlanComida({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/planes-comida/${clienteId}/${semanaInicio}`] });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error al guardar", description: err?.message });
      }
    }
  });

  useEffect(() => {
    if (!clienteId) return;
    customFetch<any>(`/api/planes-comida/semanas/${clienteId}`)
      .then(data => setHistorialSemanas(Array.isArray(data) ? data : []))
      .catch(() => setHistorialSemanas([]));
  }, [clienteId, pageMode]);

  const handleOpenModal = () => {
    if (!clienteId) { toast({ variant: "destructive", title: "Selecciona un cliente primero" }); return; }
    setModalStep(1); setTipoCreacion("ia"); setDuracion(1); setShowModal(true);
  };

  const handleModalConfirm = async () => {
    setShowModal(false);
    if (tipoCreacion === "manual") {
      setDraftDias(Array.from({ length: 7 }, (_, i) => ({ diaSemana: i, comidas: [] })));
      setPageMode("manual");
      setExpandedDias(new Set([0]));
      return;
    }

    setIsGenerating(true);
    setPageMode("draft");

    const semanasAGenerar = Array.from({ length: duracion }, (_, w) =>
      format(addWeeks(new Date(semanaInicio + "T12:00:00"), w), "yyyy-MM-dd")
    );

    try {
      const resultado = await customFetch<any>("/api/planes-comida/generar-ai", {
        method: "POST",
        body: JSON.stringify({ clienteId, semanaInicio: semanasAGenerar[0] }),
      });
      if (resultado?.error) throw new Error(resultado.error);

      const dias: DiaComida[] = (resultado.dias || []).map((d: any) => ({
        diaSemana: d.diaSemana,
        comidas: d.comidas || [],
      }));
      for (let i = 0; i < 7; i++) {
        if (!dias.find(d => d.diaSemana === i)) dias.push({ diaSemana: i, comidas: [] });
      }
      dias.sort((a, b) => a.diaSemana - b.diaSemana);
      setDraftDias(dias);
      setExpandedDias(new Set([0, 1, 2, 3, 4, 5, 6]));
      toast({ title: "¡Plan de nutrición generado!", description: `Revisa y edita el plan de ${clienteSeleccionado?.nombre} antes de publicar.` });
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
      const resultado = await customFetch<any>("/api/planes-comida/generar-ai", {
        method: "POST",
        body: JSON.stringify({ clienteId, semanaInicio }),
      });
      if (resultado?.error) throw new Error(resultado.error);
      const dias: DiaComida[] = (resultado.dias || []).map((d: any) => ({ diaSemana: d.diaSemana, comidas: d.comidas || [] }));
      for (let i = 0; i < 7; i++) { if (!dias.find(d => d.diaSemana === i)) dias.push({ diaSemana: i, comidas: [] }); }
      dias.sort((a, b) => a.diaSemana - b.diaSemana);
      setDraftDias(dias);
      toast({ title: "Nueva versión generada" });
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
      const resultado = await customFetch<any>("/api/planes-comida/generar-ai", {
        method: "POST",
        body: JSON.stringify({ clienteId, semanaInicio }),
      });
      if (resultado?.error) throw new Error(resultado.error);
      const diaGenerado = (resultado.dias || []).find((d: any) => d.diaSemana === diaIdx);
      if (!diaGenerado) throw new Error("El AI no generó ese día");
      setDraftDias(prev => prev.map(d => d.diaSemana === diaIdx ? { ...d, comidas: diaGenerado.comidas || [], guardado: false } : d));
      toast({ title: `${DIAS[diaIdx]} regenerado`, description: "Revisa el nuevo menú antes de guardar." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al regenerar", description: err?.message });
    } finally {
      setRegenerandoDia(null);
    }
  };

  const saveDia = async (diaIdx: number, aprobada = false) => {
    const dia = draftDias.find(d => d.diaSemana === diaIdx);
    if (!dia) return;
    const totales = calcTotales(dia.comidas);
    await createMutation.mutateAsync({
      data: { clienteId, semanaInicio, diaSemana: diaIdx, comidas: dia.comidas, caloriasTotal: totales.calorias, aprobada, notas: "" }
    });
    setDraftDias(prev => prev.map(d => d.diaSemana === diaIdx ? { ...d, guardado: true } : d));
  };

  const saveAll = async (aprobada = false) => {
    for (const dia of draftDias) {
      const totales = calcTotales(dia.comidas);
      await createMutation.mutateAsync({
        data: { clienteId, semanaInicio, diaSemana: dia.diaSemana, comidas: dia.comidas, caloriasTotal: totales.calorias, aprobada, notas: "" }
      });
    }
    toast({ title: aprobada ? "¡Plan publicado!" : "Plan guardado como borrador", description: aprobada ? "Tu cliente ya puede verlo." : "Tu cliente lo verá cuando lo publiques." });
    setPageMode("view");
    queryClient.invalidateQueries({ queryKey: [`/api/planes-comida/${clienteId}/${semanaInicio}`] });
  };

  // Draft editing
  const updateComida = (diaIdx: number, cIdx: number, field: keyof Comida, value: any) => {
    setDraftDias(prev => prev.map(d => {
      if (d.diaSemana !== diaIdx) return d;
      const cs = [...d.comidas];
      cs[cIdx] = { ...cs[cIdx], [field]: value };
      return { ...d, comidas: cs, guardado: false };
    }));
  };

  const addComida = (diaIdx: number) => {
    setDraftDias(prev => prev.map(d =>
      d.diaSemana === diaIdx ? { ...d, comidas: [...d.comidas, comidaVacia()], guardado: false } : d
    ));
  };

  const removeComida = (diaIdx: number, cIdx: number) => {
    setDraftDias(prev => prev.map(d => {
      if (d.diaSemana !== diaIdx) return d;
      const cs = [...d.comidas]; cs.splice(cIdx, 1);
      return { ...d, comidas: cs, guardado: false };
    }));
  };

  const addIngrediente = (diaIdx: number, cIdx: number) => {
    setDraftDias(prev => prev.map(d => {
      if (d.diaSemana !== diaIdx) return d;
      const cs = [...d.comidas];
      const ings = [...(cs[cIdx].ingredientes || []), ingredienteVacio()];
      cs[cIdx] = { ...cs[cIdx], ingredientes: ings };
      return { ...d, comidas: cs, guardado: false };
    }));
  };

  const removeIngrediente = (diaIdx: number, cIdx: number, iIdx: number) => {
    setDraftDias(prev => prev.map(d => {
      if (d.diaSemana !== diaIdx) return d;
      const cs = [...d.comidas];
      const ings = [...(cs[cIdx].ingredientes || [])];
      ings.splice(iIdx, 1);
      const totales = calcTotalesIngredientes(ings);
      cs[cIdx] = { ...cs[cIdx], ingredientes: ings, calorias: totales.calorias, proteinas: totales.proteinas, carbohidratos: totales.carbohidratos, grasas: totales.grasas };
      return { ...d, comidas: cs, guardado: false };
    }));
  };

  const updateIngrediente = (diaIdx: number, cIdx: number, iIdx: number, field: keyof Ingrediente, value: any) => {
    setDraftDias(prev => prev.map(d => {
      if (d.diaSemana !== diaIdx) return d;
      const cs = [...d.comidas];
      const ings = [...(cs[cIdx].ingredientes || [])];
      ings[iIdx] = { ...ings[iIdx], [field]: typeof value === "string" && field !== "nombre" ? parseFloat(value) || 0 : value };
      const totales = calcTotalesIngredientes(ings);
      cs[cIdx] = { ...cs[cIdx], ingredientes: ings, calorias: totales.calorias, proteinas: totales.proteinas, carbohidratos: totales.carbohidratos, grasas: totales.grasas };
      return { ...d, comidas: cs, guardado: false };
    }));
  };

  const toggleDia = (idx: number) => {
    setExpandedDias(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  };

  const startViewEdit = (dia: number, idx: number, c: Comida) => {
    setViewEditDia(dia); setViewEditIdx(idx); setViewEditData({ ...c });
  };

  const saveViewEdit = async () => {
    if (viewEditDia === null || viewEditIdx === null || !viewEditData) return;
    const planDia = Array.isArray(planes) ? planes.find((p: any) => p.diaSemana === viewEditDia) : null;
    if (!planDia) return;
    const comidasActualizadas = ((planDia as any).comidas as Comida[]).map((c, i) => i === viewEditIdx ? viewEditData : c);
    const totales = calcTotales(comidasActualizadas);
    await createMutation.mutateAsync({
      data: { clienteId, semanaInicio, diaSemana: viewEditDia, comidas: comidasActualizadas, caloriasTotal: totales.calorias, aprobada: (planDia as any).aprobada, notas: "" }
    });
    toast({ title: "Comida actualizada" });
    setViewEditDia(null); setViewEditIdx(null); setViewEditData(null);
  };

  const MacroBar = ({ comidas }: { comidas: Comida[] }) => {
    const t = calcTotales(comidas);
    if (t.calorias === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-background/30 rounded-lg border border-border/40 mt-2">
        <span className="text-xs font-semibold text-white">{t.calorias} kcal</span>
        <span className="text-xs text-blue-400">P: {t.proteinas}g</span>
        <span className="text-xs text-yellow-400">C: {t.carbohidratos}g</span>
        <span className="text-xs text-red-400">G: {t.grasas}g</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white">Plan de Nutrición</h1>
          <p className="text-muted-foreground">Asigna y genera planes alimenticios personalizados</p>
        </div>
        {clienteId > 0 && pageMode === "view" && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-4 h-4 mr-1" /> Historial
          </Button>
        )}
      </div>

      {/* Controls */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Cliente</label>
              {isLoadingClientes ? <Skeleton className="h-12 w-full bg-border/50" /> : (
                <Select value={selectedCliente} onValueChange={v => { setSelectedCliente(v); setPageMode("view"); }}>
                  <SelectTrigger className="bg-background/50 h-12"><SelectValue placeholder="Elige un cliente..." /></SelectTrigger>
                  <SelectContent>{clientes?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}</SelectContent>
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
                <Sparkles className="w-5 h-5 mr-2" /> CREAR PLAN
              </Button>
            ) : (
              <Button variant="outline" className="h-12 border-border/50 text-muted-foreground hover:text-white"
                onClick={() => setPageMode("view")}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {showHistory && historialSemanas.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-syne text-base flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Historial — {clienteSeleccionado?.nombre}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {historialSemanas.map(s => (
                <button key={s.semanaInicio}
                  className={`p-3 rounded-lg border text-sm text-left transition-colors ${semanaInicio === s.semanaInicio ? "border-primary bg-primary/10 text-primary" : "border-border/50 hover:border-primary/40 text-muted-foreground hover:text-white"}`}
                  onClick={() => { setSemanaInicio(s.semanaInicio); setPageMode("view"); setShowHistory(false); }}>
                  <div className="font-medium">{format(new Date(s.semanaInicio + "T12:00:00"), "dd MMM", { locale: es })}</div>
                  <div className="text-xs mt-0.5">{s.aprobada ? "✓ Publicado" : "Borrador"}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generating */}
      {isGenerating && (
        <Card className="bg-card border-primary/30 border">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-syne font-bold text-white mb-2">Generando el plan personalizado...</h3>
            <p className="text-muted-foreground text-sm">Creando un plan nutricional adaptado a {clienteSeleccionado?.nombre}. Por favor espera.</p>
          </CardContent>
        </Card>
      )}

      {/* DRAFT / MANUAL MODE */}
      {!isGenerating && (pageMode === "draft" || pageMode === "manual") && (
        <div className="space-y-4">
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
              <Button variant="outline" size="sm" className="border-border/50" onClick={() => saveAll(false)} disabled={createMutation.isPending}>
                <Save className="w-4 h-4 mr-1" /> Guardar borrador
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => saveAll(true)} disabled={createMutation.isPending}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {createMutation.isPending ? "Guardando..." : "Guardar y publicar"}
              </Button>
            </div>
          </div>

          {DIAS.map((dia, idx) => {
            const diaData = draftDias.find(d => d.diaSemana === idx);
            const comidas = diaData?.comidas || [];
            const totales = calcTotales(comidas);
            const isExpanded = expandedDias.has(idx);

            return (
              <Card key={idx} className={`bg-card border-border/50 ${diaData?.guardado ? "border-primary/30" : ""}`}>
                <CardHeader className="pb-2 cursor-pointer hover:bg-white/2" onClick={() => toggleDia(idx)}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-syne text-base flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                      {dia}
                      <span className="text-xs text-muted-foreground font-normal">({comidas.length} comidas)</span>
                      {diaData?.guardado && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </CardTitle>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {totales.calorias > 0 && <span className="text-xs text-muted-foreground">{totales.calorias} kcal</span>}
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
                    {comidas.map((comida, cIdx) => {
                      const ings = comida.ingredientes || [];
                      const totIng = calcTotalesIngredientes(ings);
                      return (
                        <div key={cIdx} className="bg-background/40 rounded-lg border border-border/40 p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <span className="w-6 h-6 rounded-md bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{cIdx + 1}</span>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => removeComida(idx, cIdx)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Nombre de la comida</label>
                              <Input value={comida.nombre} onChange={e => updateComida(idx, cIdx, "nombre", e.target.value)}
                                placeholder="Ej: Desayuno" className="bg-background text-sm h-9" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Hora sugerida</label>
                              <Input value={comida.hora || ""} onChange={e => updateComida(idx, cIdx, "hora", e.target.value)}
                                placeholder="Ej: 7:00 AM" className="bg-background text-sm h-9" />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Descripción del plato</label>
                            <Input value={comida.descripcion} onChange={e => updateComida(idx, cIdx, "descripcion", e.target.value)}
                              placeholder="Ej: Pollo con arroz y ensalada" className="bg-background text-sm h-9" />
                          </div>

                          {/* Ingredients */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-semibold text-primary uppercase tracking-wide">Ingredientes</label>
                              <button onClick={() => addIngrediente(idx, cIdx)}
                                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                                <Plus className="w-3 h-3" /> Agregar
                              </button>
                            </div>
                            <div className="space-y-2">
                              {/* Header row */}
                              <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground/60 px-1">
                                <span className="col-span-4">Ingrediente</span>
                                <span className="col-span-1 text-center">g</span>
                                <span className="col-span-2 text-center">Kcal</span>
                                <span className="col-span-1 text-center">P</span>
                                <span className="col-span-1 text-center">C</span>
                                <span className="col-span-1 text-center">G</span>
                                <span className="col-span-2"></span>
                              </div>
                              {ings.map((ing, iIdx) => (
                                <div key={iIdx} className="grid grid-cols-12 gap-1 items-center">
                                  <Input value={ing.nombre} onChange={e => updateIngrediente(idx, cIdx, iIdx, "nombre", e.target.value)}
                                    placeholder="Pollo..." className="col-span-4 bg-background/60 text-xs h-8 px-2" />
                                  <Input type="number" min={0} value={ing.gramos || ""} onChange={e => updateIngrediente(idx, cIdx, iIdx, "gramos", e.target.value)}
                                    placeholder="0" className="col-span-1 bg-background/60 text-xs h-8 px-1 text-center" />
                                  <Input type="number" min={0} value={ing.calorias || ""} onChange={e => updateIngrediente(idx, cIdx, iIdx, "calorias", e.target.value)}
                                    placeholder="0" className="col-span-2 bg-background/60 text-xs h-8 px-1 text-center" />
                                  <Input type="number" min={0} value={ing.proteinas || ""} onChange={e => updateIngrediente(idx, cIdx, iIdx, "proteinas", e.target.value)}
                                    placeholder="0" className="col-span-1 bg-background/60 text-xs h-8 px-1 text-center" />
                                  <Input type="number" min={0} value={ing.carbos || ""} onChange={e => updateIngrediente(idx, cIdx, iIdx, "carbos", e.target.value)}
                                    placeholder="0" className="col-span-1 bg-background/60 text-xs h-8 px-1 text-center" />
                                  <Input type="number" min={0} value={ing.grasas || ""} onChange={e => updateIngrediente(idx, cIdx, iIdx, "grasas", e.target.value)}
                                    placeholder="0" className="col-span-1 bg-background/60 text-xs h-8 px-1 text-center" />
                                  <button onClick={() => removeIngrediente(idx, cIdx, iIdx)}
                                    className="col-span-2 text-red-400/60 hover:text-red-400 flex items-center justify-center transition-colors">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              {ings.length === 0 && (
                                <p className="text-xs text-muted-foreground/50 italic py-1 px-1">Sin ingredientes — haz clic en Agregar</p>
                              )}
                            </div>
                          </div>

                          {/* Auto-calculated totals */}
                          {ings.length > 0 && (
                            <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-md px-3 py-2 text-xs">
                              <span className="text-muted-foreground">Total:</span>
                              <span className="text-white font-medium">{totIng.gramos}g</span>
                              <span className="text-primary font-bold">{totIng.calorias} kcal</span>
                              <span className="text-blue-400">P: {totIng.proteinas}g</span>
                              <span className="text-yellow-400">C: {totIng.carbohidratos}g</span>
                              <span className="text-red-400">G: {totIng.grasas}g</span>
                            </div>
                          )}

                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
                            <Input value={comida.notas || ""} onChange={e => updateComida(idx, cIdx, "notas", e.target.value)}
                              placeholder="Ej: evitar si hay intolerancia a lactosa" className="bg-background text-sm h-9" />
                          </div>
                        </div>
                      );
                    })}

                    {/* Macro summary */}
                    {comidas.length > 0 && <MacroBar comidas={comidas} />}

                    <div className="flex items-center justify-between pt-1">
                      <Button size="sm" variant="outline" className="border-dashed border-border/60 text-muted-foreground hover:text-primary hover:border-primary/50"
                        onClick={() => addComida(idx)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Agregar comida
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-primary"
                        onClick={() => saveDia(idx)} disabled={createMutation.isPending}>
                        <Save className="w-3.5 h-3.5 mr-1" /> Guardar día
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          <div className="flex flex-wrap gap-3 justify-end pt-2">
            <Button variant="outline" className="border-border/50" onClick={() => saveAll(false)} disabled={createMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> Guardar como borrador
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => saveAll(true)} disabled={createMutation.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {createMutation.isPending ? "Publicando..." : "Guardar y publicar"}
            </Button>
          </div>
        </div>
      )}

      {/* VIEW MODE */}
      {pageMode === "view" && !isGenerating && (
        <>
          {!clienteId ? (
            <div className="text-center py-20 bg-card border border-border/50 rounded-lg">
              <Utensils className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-syne font-bold text-white mb-2">Selecciona un cliente</h3>
              <p className="text-muted-foreground">Elige un cliente para ver o crear su plan alimenticio</p>
            </div>
          ) : isLoadingPlan ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full bg-border/50 rounded-lg" />)}</div>
          ) : errorPlan ? (
            <div className="text-center py-16 bg-card border border-red-500/30 rounded-lg">
              <Info className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-red-400 font-medium">Error al cargar el plan de nutrición</p>
            </div>
          ) : planes && (Array.isArray(planes) ? planes.length > 0 : false) ? (
            <div className="space-y-3">
              {/* Hidden printable panel for PDF export */}
              <div style={{ position: "absolute", left: "-9999px", top: 0, pointerEvents: "none" }}>
                <PrintablePlan
                  tipo="nutricion"
                  clienteNombre={clienteSeleccionado?.nombre || "Cliente"}
                  coachNombre={user?.nombre ?? ""}
                  semanaInicio={semanaInicio}
                  printMode={nutricionPrintMode}
                  dias={(planes as any[]).map((p: any) => ({
                    diaSemana: p.diaSemana,
                    comidas: p.comidas || [],
                    caloriasTotal: p.caloriasTotal,
                    aprobada: p.aprobada,
                  }))}
                />
              </div>
              <PdfModeModal
                open={showPdfModal}
                onClose={() => setShowPdfModal(false)}
                isExporting={isExporting}
                onSelect={async (mode) => {
                  setNutricionPrintMode(mode);
                  setShowPdfModal(false);
                  await new Promise(r => setTimeout(r, 80));
                  await exportToPdf("printable-plan", {
                    filename: `nutricion-${clienteSeleccionado?.nombre?.replace(/\s/g, "-")}-${semanaInicio}`,
                    backgroundColor: mode === "print" ? "#FFFFFF" : "#0A0A0A",
                  });
                }}
              />
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-syne font-bold text-white">Nutrición de {clienteSeleccionado?.nombre}</h2>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">Semana del {format(new Date(semanaInicio + "T12:00:00"), "dd MMM yyyy", { locale: es })}</p>
                  <Button size="sm" variant="outline" className="border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 h-8 text-xs"
                    onClick={() => setShowPdfModal(true)}
                    disabled={isExporting}>
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                    PDF
                  </Button>
                </div>
              </div>

              {DIAS.map((dia, idx) => {
                const planDia = (planes as any[]).find(p => p.diaSemana === idx);
                const comidas: Comida[] = planDia?.comidas || [];
                const totales = calcTotales(comidas);
                const isExpanded = expandedDias.has(idx);

                return (
                  <Card key={idx} className="bg-card border-border/50">
                    <CardHeader className="pb-3 cursor-pointer hover:bg-white/2" onClick={() => toggleDia(idx)}>
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-syne text-base flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                          {dia}
                          <span className="text-xs text-muted-foreground font-normal">({comidas.length} comidas)</span>
                        </CardTitle>
                        <div className="flex items-center gap-3">
                          {planDia?.aprobada && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Publicado</Badge>}
                          {totales.calorias > 0 && <span className="text-xs text-muted-foreground font-medium">{totales.calorias} kcal</span>}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="p-4">
                        {comidas.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic py-2">Sin plan para este día</p>
                        ) : (
                          <div className="space-y-3">
                            {comidas.map((comida, cIdx) => {
                              const isEditing = viewEditDia === idx && viewEditIdx === cIdx;
                              if (isEditing && viewEditData) {
                                const veIngs = viewEditData.ingredientes || [];
                                const veTot = calcTotalesIngredientes(veIngs);
                                const updateVEIng = (iIdx: number, field: keyof Ingrediente, value: any) => {
                                  const ings = [...veIngs];
                                  ings[iIdx] = { ...ings[iIdx], [field]: field !== "nombre" ? parseFloat(value) || 0 : value };
                                  const tot = calcTotalesIngredientes(ings);
                                  setViewEditData({ ...viewEditData, ingredientes: ings, calorias: tot.calorias, proteinas: tot.proteinas, carbohidratos: tot.carbohidratos, grasas: tot.grasas });
                                };
                                return (
                                  <div key={cIdx} className="bg-background/50 rounded-lg border border-primary/40 p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                                        <Input value={viewEditData.nombre} onChange={e => setViewEditData({ ...viewEditData, nombre: e.target.value })} className="bg-background text-sm h-9" />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Hora</label>
                                        <Input value={viewEditData.hora || ""} onChange={e => setViewEditData({ ...viewEditData, hora: e.target.value })} className="bg-background text-sm h-9" />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
                                      <Input value={viewEditData.descripcion} onChange={e => setViewEditData({ ...viewEditData, descripcion: e.target.value })} className="bg-background text-sm h-9" />
                                    </div>
                                    {/* Ingredient editing in view-edit mode */}
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-semibold text-primary uppercase tracking-wide">Ingredientes</label>
                                        <button onClick={() => setViewEditData({ ...viewEditData, ingredientes: [...veIngs, ingredienteVacio()] })}
                                          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                                          <Plus className="w-3 h-3" /> Agregar
                                        </button>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground/60 px-1">
                                          <span className="col-span-4">Ingrediente</span>
                                          <span className="col-span-1 text-center">g</span>
                                          <span className="col-span-2 text-center">Kcal</span>
                                          <span className="col-span-1 text-center">P</span>
                                          <span className="col-span-1 text-center">C</span>
                                          <span className="col-span-1 text-center">G</span>
                                          <span className="col-span-2"></span>
                                        </div>
                                        {veIngs.map((ing, iIdx) => (
                                          <div key={iIdx} className="grid grid-cols-12 gap-1 items-center">
                                            <Input value={ing.nombre} onChange={e => updateVEIng(iIdx, "nombre", e.target.value)} placeholder="Ingrediente" className="col-span-4 bg-background/60 text-xs h-7 px-2" />
                                            <Input type="number" value={ing.gramos || ""} onChange={e => updateVEIng(iIdx, "gramos", e.target.value)} placeholder="0" className="col-span-1 bg-background/60 text-xs h-7 px-1 text-center" />
                                            <Input type="number" value={ing.calorias || ""} onChange={e => updateVEIng(iIdx, "calorias", e.target.value)} placeholder="0" className="col-span-2 bg-background/60 text-xs h-7 px-1 text-center" />
                                            <Input type="number" value={ing.proteinas || ""} onChange={e => updateVEIng(iIdx, "proteinas", e.target.value)} placeholder="0" className="col-span-1 bg-background/60 text-xs h-7 px-1 text-center" />
                                            <Input type="number" value={ing.carbos || ""} onChange={e => updateVEIng(iIdx, "carbos", e.target.value)} placeholder="0" className="col-span-1 bg-background/60 text-xs h-7 px-1 text-center" />
                                            <Input type="number" value={ing.grasas || ""} onChange={e => updateVEIng(iIdx, "grasas", e.target.value)} placeholder="0" className="col-span-1 bg-background/60 text-xs h-7 px-1 text-center" />
                                            <button onClick={() => { const ings = [...veIngs]; ings.splice(iIdx, 1); const t = calcTotalesIngredientes(ings); setViewEditData({ ...viewEditData, ingredientes: ings, calorias: t.calorias, proteinas: t.proteinas, carbohidratos: t.carbohidratos, grasas: t.grasas }); }}
                                              className="col-span-2 text-red-400/60 hover:text-red-400 flex items-center justify-center">
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                      {veIngs.length > 0 && (
                                        <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-md px-3 py-1.5 text-xs mt-2">
                                          <span className="text-primary font-bold">{veTot.calorias} kcal</span>
                                          <span className="text-blue-400">P: {veTot.proteinas}g</span>
                                          <span className="text-yellow-400">C: {veTot.carbohidratos}g</span>
                                          <span className="text-red-400">G: {veTot.grasas}g</span>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
                                      <Input value={viewEditData.notas || ""} onChange={e => setViewEditData({ ...viewEditData, notas: e.target.value })} className="bg-background text-sm h-9" />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" className="bg-primary text-primary-foreground h-8" onClick={saveViewEdit} disabled={createMutation.isPending}>
                                        <Check className="w-3 h-3 mr-1" /> Guardar
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => { setViewEditDia(null); setViewEditIdx(null); setViewEditData(null); }}>
                                        <X className="w-3 h-3 mr-1" /> Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div key={cIdx} className="bg-background/30 rounded-lg px-4 py-3 border border-border/40 hover:border-primary/30 transition-colors group">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-white group-hover:text-primary transition-colors">{comida.nombre}</p>
                                        {comida.hora && <span className="text-xs text-muted-foreground">{comida.hora}</span>}
                                      </div>
                                      {comida.descripcion && <p className="text-sm text-muted-foreground mt-0.5">{comida.descripcion}</p>}
                                      {/* Ingredients list */}
                                      {comida.ingredientes && comida.ingredientes.length > 0 && (
                                        <div className="mt-2 space-y-0.5">
                                          {comida.ingredientes.map((ing, iIdx) => (
                                            <div key={iIdx} className="flex items-center justify-between text-xs py-0.5 border-b border-border/20 last:border-0">
                                              <span className="text-white/80">{ing.nombre}</span>
                                              <div className="flex items-center gap-3 text-muted-foreground/80">
                                                <span className="text-white/60 font-medium">{ing.gramos}g</span>
                                                <span className="text-primary/80">{ing.calorias} kcal</span>
                                                <span className="text-blue-400/70">P:{ing.proteinas}g</span>
                                                <span className="text-yellow-400/70">C:{ing.carbos}g</span>
                                                <span className="text-red-400/70">G:{ing.grasas}g</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {comida.notas && <p className="text-xs text-muted-foreground/60 mt-1 italic">{comida.notas}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0 flex items-start gap-2">
                                      <div>
                                        <p className="text-white font-semibold text-sm">{comida.calorias} kcal</p>
                                        <div className="flex gap-2 mt-1 text-xs">
                                          <span className="text-blue-400">P:{comida.proteinas}g</span>
                                          <span className="text-yellow-400">C:{comida.carbohidratos}g</span>
                                          <span className="text-red-400">G:{comida.grasas}g</span>
                                        </div>
                                      </div>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => startViewEdit(idx, cIdx, comida)}>
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {/* Macro totals */}
                            <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-background/30 rounded-lg border border-border/40 text-xs">
                              <span className="font-semibold text-white">Total día: {totales.calorias} kcal</span>
                              <span className="text-blue-400">Proteínas: {totales.proteinas}g</span>
                              <span className="text-yellow-400">Carbos: {totales.carbohidratos}g</span>
                              <span className="text-red-400">Grasas: {totales.grasas}g</span>
                            </div>
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
              <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-syne font-bold text-white mb-2">Sin plan de nutrición</h3>
              <p className="text-muted-foreground mb-6">
                {clienteSeleccionado ? `${clienteSeleccionado.nombre} no tiene plan para esta semana` : ""}
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
        <DialogContent className="bg-card border-border/50 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="font-syne text-xl">
              {modalStep === 1 ? "¿Cómo deseas crear el plan?" : modalStep === 2 ? "¿Por cuánto tiempo?" : "Confirmar datos del cliente"}
            </DialogTitle>
            <div className="flex items-center gap-1 pt-2">
              {[1,2,3].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= modalStep ? "bg-primary" : "bg-border/50"}`} />
              ))}
            </div>
          </DialogHeader>
          {modalStep === 1 ? (
            <div className="space-y-3 py-2">
              {[
                { value: "ia", label: "Generar con IA", desc: "Automático según el perfil del cliente", icon: Sparkles },
                { value: "manual", label: "Crear manualmente", desc: "Llena cada día tú mismo", icon: PenLine },
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
                    </div>
                  </button>
                );
              })}
              <Button className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setModalStep(2)}>Siguiente →</Button>
            </div>
          ) : modalStep === 2 ? (
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
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setModalStep(3)}>Siguiente →</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Datos nutricionales que el AI usará para <span className="text-white font-medium">{clienteSeleccionado?.nombre}</span>:</p>
              <div className="bg-background/50 rounded-lg border border-border/40 p-4 space-y-2 text-sm">
                {[
                  ["Objetivo", (clienteSeleccionado as any)?.objetivoPrincipal || (clienteSeleccionado as any)?.objetivo || "No especificado"],
                  ["Tipo alimentación", (clienteSeleccionado as any)?.tipoAlimentacion || "No especificado"],
                  ["Comidas al día", (clienteSeleccionado as any)?.comidasAlDia ? `${(clienteSeleccionado as any).comidasAlDia}` : "No especificado"],
                  ["Alergias", (clienteSeleccionado as any)?.alergiasAlimentarias || "Ninguna"],
                  ["No consume", (clienteSeleccionado as any)?.alimentosNoConsume || "Nada restringido"],
                  ["Cocina en", (clienteSeleccionado as any)?.cocinaEnCasa || "No especificado"],
                  ["Presupuesto", (clienteSeleccionado as any)?.presupuestoAlimentacion || "No especificado"],
                ].map(([key, val]) => (
                  <div key={key} className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground flex-shrink-0">{key}:</span>
                    <span className={`text-right ${val === "No especificado" ? "text-muted-foreground/50" : "text-white"}`}>{val}</span>
                  </div>
                ))}
              </div>
              {!(clienteSeleccionado as any)?.tipoAlimentacion && (
                <p className="text-xs text-yellow-500/80">⚠ Perfil nutricional incompleto. Completa el perfil del cliente para mejores resultados de IA.</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-border/50 text-muted-foreground" onClick={() => setModalStep(2)}>← Atrás</Button>
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleModalConfirm}>
                  {tipoCreacion === "ia" ? <><Sparkles className="w-4 h-4 mr-1" />Confirmar y generar</> : <><PenLine className="w-4 h-4 mr-1" />Comenzar</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
