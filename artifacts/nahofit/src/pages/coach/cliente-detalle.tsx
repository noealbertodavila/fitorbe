import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetCliente, useGetRutina, useGetPlanComida, customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, UserCircle, Target, Activity, Heart, Utensils, Edit2, Save, X, Check, Link as LinkIcon, Dumbbell, Apple, TrendingUp, CreditCard, ExternalLink, AlertCircle, Download } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { DateField } from "@/components/ui/date-field";
import { format, startOfWeek } from "date-fns";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { PrintableProgreso } from "@/components/PrintableProgreso";
import { PdfModeModal } from "@/components/PdfModeModal";

interface PlanPrecio {
  id: number;
  nombre: string;
  precioMensual: number;
  activo: boolean;
}

interface ClienteCompleto {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;
  sexo?: string;
  pais?: string;
  ciudad?: string;
  peso?: number;
  altura?: number;
  grasaCorporalPct?: number;
  complexion?: string;
  objetivo?: string;
  objetivoPrincipal?: string;
  pesoMeta?: number;
  fechaMeta?: string;
  nivelUrgencia?: string;
  lesiones?: string;
  nivelFitness?: string;
  diasDisponibles?: number;
  duracionSesion?: string;
  horarioPreferido?: string;
  lugarEntrenamiento?: string;
  equipamiento?: string;
  condicionesMedicas?: string;
  medicamentos?: string;
  zonasEvitar?: string;
  autorizacionMedica?: string;
  alergiasAlimentarias?: string;
  alimentosNoConsume?: string;
  tipoAlimentacion?: string;
  comidasAlDia?: number;
  cocinaEnCasa?: string;
  presupuestoAlimentacion?: string;
  suplementosActuales?: string;
  aguaDiaria?: number;
  ocupacion?: string;
  horasSueno?: number;
  nivelEstres?: string;
  modalidad?: string;
  planTipo?: string;
  fechaInicio?: string;
  notasCoach?: string;
  estrategiaEntrenamiento?: string;
  prioridadesPrimerMes?: string;
  activo?: boolean;
  adherenciaSemana?: number;
}

function calcEdad(fechaNacimiento?: string): string {
  if (!fechaNacimiento) return "";
  const diff = Date.now() - new Date(fechaNacimiento).getTime();
  return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} años`;
}

function calcIMC(peso?: number, altura?: number): string {
  if (!peso || !altura) return "";
  const imc = peso / ((altura / 100) ** 2);
  const cat = imc < 18.5 ? "Bajo peso" : imc < 25 ? "Normal" : imc < 30 ? "Sobrepeso" : "Obesidad";
  return `${imc.toFixed(1)} (${cat})`;
}

function LabelValue({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

// ─── Objetivos Checkboxes ─────────────────────────────────────────────────────
const OBJETIVOS_LIST = [
  "Perder grasa corporal",
  "Ganar masa muscular",
  "Tonificar y definir",
  "Mejorar rendimiento atlético",
  "Bienestar general y salud",
  "Rehabilitación y recuperación",
];

function ObjetivosField({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const selected = (value || "").split(",").map(s => s.trim()).filter(Boolean);

  const toggle = (obj: string) => {
    const next = selected.includes(obj)
      ? selected.filter(s => s !== obj)
      : [...selected, obj];
    onChange(next.join(", "));
  };

  return (
    <div className="col-span-2">
      <label className="text-xs text-muted-foreground block mb-2">Objetivo principal</label>
      <div className="grid grid-cols-2 gap-2">
        {OBJETIVOS_LIST.map(obj => {
          const checked = selected.includes(obj);
          return (
            <button
              key={obj}
              type="button"
              onClick={() => toggle(obj)}
              className={cn(
                "flex items-center gap-2 text-left px-3 py-2 rounded-lg border text-sm transition-colors",
                checked
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-background text-muted-foreground hover:border-primary/50"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                checked ? "bg-primary border-primary" : "border-border/50"
              )}>
                {checked && <Check className="w-3 h-3 text-black" />}
              </div>
              {obj}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Edit Dialog ─────────────────────────────────────────────────────────────
function EditarClienteDialog({ cliente, open, onClose }: { cliente: ClienteCompleto; open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<ClienteCompleto>({ ...cliente });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: planes } = useQuery<PlanPrecio[]>({
    queryKey: ["/api/planes"],
    queryFn: () => customFetch<PlanPrecio[]>("/api/planes"),
    staleTime: 0,
    enabled: open,
  });
  const planesActivos = (planes || []).filter(p => p.activo);

  const set = (field: keyof ClienteCompleto, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const imcDisplay = () => {
    if (!form.peso || !form.altura) return null;
    const imc = form.peso / ((form.altura / 100) ** 2);
    const cat = imc < 18.5 ? "Bajo peso" : imc < 25 ? "Normal" : imc < 30 ? "Sobrepeso" : "Obesidad";
    return `${imc.toFixed(1)} — ${cat}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        fechaNacimiento: form.fechaNacimiento,
        sexo: form.sexo,
        pais: form.pais,
        ciudad: form.ciudad,
        peso: form.peso,
        altura: form.altura,
        grasaCorporalPct: form.grasaCorporalPct,
        complexion: form.complexion,
        objetivoPrincipal: form.objetivoPrincipal,
        pesoMeta: form.pesoMeta,
        fechaMeta: form.fechaMeta,
        nivelUrgencia: form.nivelUrgencia,
        lesiones: form.lesiones,
        nivelFitness: form.nivelFitness,
        diasDisponibles: form.diasDisponibles,
        duracionSesion: form.duracionSesion,
        horarioPreferido: form.horarioPreferido,
        lugarEntrenamiento: form.lugarEntrenamiento,
        equipamiento: form.equipamiento,
        condicionesMedicas: form.condicionesMedicas,
        medicamentos: form.medicamentos,
        zonasEvitar: form.zonasEvitar,
        autorizacionMedica: form.autorizacionMedica,
        alergiasAlimentarias: form.alergiasAlimentarias,
        alimentosNoConsume: form.alimentosNoConsume,
        tipoAlimentacion: form.tipoAlimentacion,
        comidasAlDia: form.comidasAlDia,
        cocinaEnCasa: form.cocinaEnCasa,
        presupuestoAlimentacion: form.presupuestoAlimentacion,
        suplementosActuales: form.suplementosActuales,
        aguaDiaria: form.aguaDiaria,
        ocupacion: form.ocupacion,
        horasSueno: form.horasSueno,
        nivelEstres: form.nivelEstres,
        modalidad: form.modalidad,
        planTipo: form.planTipo,
        fechaInicio: form.fechaInicio,
        notasCoach: form.notasCoach,
        estrategiaEntrenamiento: form.estrategiaEntrenamiento,
        prioridadesPrimerMes: form.prioridadesPrimerMes,
      };
      await customFetch(`/api/usuarios/${cliente.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      qc.invalidateQueries({ queryKey: [`/api/usuarios/${cliente.id}`] });
      qc.invalidateQueries({ queryKey: ["/api/usuarios"] });
      qc.invalidateQueries({ queryKey: ["/api/clientes"] });
      toast({ title: "✓ Perfil guardado correctamente", description: `Los datos de ${form.nombre} han sido actualizados.` });
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err?.message || "No se pudo guardar el perfil." });
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, field, type = "text", placeholder = "" }: { label: string; field: keyof ClienteCompleto; type?: string; placeholder?: string }) => (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <Input
        type={type}
        value={(form[field] as string | number) ?? ""}
        onChange={e => set(field, type === "number" ? (parseFloat(e.target.value) || undefined) : e.target.value)}
        placeholder={placeholder}
        className="bg-background text-sm h-9 border-border/50"
      />
    </div>
  );

  const S = ({ label, field, options }: { label: string; field: keyof ClienteCompleto; options: { value: string; label: string }[] }) => (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <Select value={String(form[field] ?? "")} onValueChange={v => set(field, v)}>
        <SelectTrigger className="bg-background h-9 border-border/50 text-sm">
          <SelectValue placeholder="Seleccionar..." />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const T = ({ label, field, placeholder = "" }: { label: string; field: keyof ClienteCompleto; placeholder?: string }) => (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <Textarea
        value={(form[field] as string) || ""}
        onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        className="bg-background text-sm resize-none h-20 border-border/50"
      />
    </div>
  );

  const opts = (arr: string[]) => arr.map(v => ({ value: v, label: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 text-foreground max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-primary" />
            Editar Perfil — {cliente.nombre}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="mt-2">
          <TabsList className="grid grid-cols-5 bg-background/50 mb-4 w-full">
            <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
            <TabsTrigger value="fisico" className="text-xs">Físico</TabsTrigger>
            <TabsTrigger value="fitness" className="text-xs">Fitness</TabsTrigger>
            <TabsTrigger value="nutricion" className="text-xs">Nutrición</TabsTrigger>
            <TabsTrigger value="coach" className="text-xs">Coach</TabsTrigger>
          </TabsList>

          {/* TAB 1: Datos personales */}
          <TabsContent value="personal" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <F label="Nombre completo" field="nombre" placeholder="María García" />
              <F label="Email" field="email" type="email" placeholder="maria@email.com" />
              <F label="Teléfono" field="telefono" placeholder="+58 412-000-0000" />
              <DateField label="Fecha de nacimiento" value={form.fechaNacimiento} onChange={v => set("fechaNacimiento", v)} minYear={1940} maxYear={2010} />
              <S label="Sexo" field="sexo" options={opts(["Masculino", "Femenino"])} />
              <F label="País" field="pais" placeholder="Venezuela" />
              <F label="Ciudad" field="ciudad" placeholder="Caracas" />
            </div>
          </TabsContent>

          {/* TAB 2: Datos físicos + objetivos */}
          <TabsContent value="fisico" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <F label="Peso actual (kg)" field="peso" type="number" placeholder="65" />
              <F label="Altura (cm)" field="altura" type="number" placeholder="165" />
              <F label="% Grasa corporal" field="grasaCorporalPct" type="number" placeholder="22" />
              <S label="Complexión corporal" field="complexion" options={opts(["Ectomorfo", "Mesomorfo", "Endomorfo"])} />
            </div>
            {imcDisplay() && (
              <div className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary font-medium">
                IMC calculado: {imcDisplay()}
              </div>
            )}
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Objetivos</p>
              <div className="grid grid-cols-2 gap-3">
                <ObjetivosField value={form.objetivoPrincipal} onChange={v => set("objetivoPrincipal", v)} />
                <F label="Peso meta (kg)" field="pesoMeta" type="number" placeholder="58" />
                <DateField label="Fecha meta" value={form.fechaMeta} onChange={v => set("fechaMeta", v)} minYear={2024} maxYear={2030} />
                <S label="Nivel de urgencia" field="nivelUrgencia" options={opts(["Tranquilo", "Moderado", "Intensivo"])} />
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Fitness + Salud */}
          <TabsContent value="fitness" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <S label="Nivel de experiencia" field="nivelFitness" options={opts(["Principiante", "Intermedio", "Avanzado"])} />
              <F label="Días disponibles/semana" field="diasDisponibles" type="number" placeholder="5" />
              <S label="Duración máxima por sesión" field="duracionSesion" options={opts(["30min", "45min", "60min", "90min"])} />
              <S label="Horario preferido" field="horarioPreferido" options={opts(["Mañana", "Tarde", "Noche", "Flexible"])} />
              <S label="Lugar de entrenamiento" field="lugarEntrenamiento" options={opts(["Gym", "Casa", "Al aire libre", "Híbrido"])} />
            </div>
            <T label="Equipamiento disponible (si entrena en casa)" field="equipamiento" placeholder="Mancuernas, bandas de resistencia, barra..." />
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Salud y restricciones</p>
              <div className="grid grid-cols-1 gap-3">
                <T label="Lesiones actuales o pasadas" field="lesiones" placeholder="Rodilla derecha, lumbar..." />
                <T label="Condiciones médicas relevantes" field="condicionesMedicas" placeholder="Diabetes, hipertensión..." />
                <F label="Medicamentos que toma" field="medicamentos" placeholder="Metformina 500mg..." />
                <T label="Zonas del cuerpo a evitar o cuidar" field="zonasEvitar" placeholder="Evitar impacto en rodilla derecha..." />
                <S label="¿Tiene autorización médica?" field="autorizacionMedica" options={opts(["Sí", "No", "No aplica"])} />
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: Nutrición + Estilo de vida */}
          <TabsContent value="nutricion" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <S label="Tipo de alimentación" field="tipoAlimentacion" options={opts(["Omnívoro", "Vegetariano", "Vegano", "Keto", "Paleo", "Otro"])} />
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Comidas al día</label>
                <Select
                  value={form.comidasAlDia ? String(form.comidasAlDia) : ""}
                  onValueChange={v => set("comidasAlDia", parseInt(v))}
                >
                  <SelectTrigger className="bg-background h-9 border-border/50 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {["3", "4", "5", "6"].map(n => <SelectItem key={n} value={n}>{n} comidas</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <S label="¿Cocina en casa?" field="cocinaEnCasa" options={opts(["Casa", "Fuera", "Mixto"])} />
              <S label="Presupuesto alimentación" field="presupuestoAlimentacion" options={opts(["Básico", "Moderado", "Sin restricción"])} />
              <F label="Agua diaria (litros)" field="aguaDiaria" type="number" placeholder="2.5" />
            </div>
            <T label="Alergias alimentarias" field="alergiasAlimentarias" placeholder="Gluten, lactosa, mariscos..." />
            <T label="Alimentos que no consume" field="alimentosNoConsume" placeholder="Cerdo, mariscos (por religión)..." />
            <T label="Suplementos que toma actualmente" field="suplementosActuales" placeholder="Proteína whey, creatina..." />
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Estilo de vida</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Ocupación / trabajo" field="ocupacion" placeholder="Oficinista, maestro..." />
                <F label="Horas de sueño/noche" field="horasSueno" type="number" placeholder="7" />
                <S label="Nivel de estrés" field="nivelEstres" options={opts(["Bajo", "Moderado", "Alto", "Muy alto"])} />
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: Coach */}
          <TabsContent value="coach" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Plan asignado</label>
                <Select value={form.planTipo || ""} onValueChange={v => set("planTipo", v)}>
                  <SelectTrigger className="bg-background h-9 border-border/50 text-sm">
                    <SelectValue placeholder="Seleccionar plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {planesActivos.length === 0 ? (
                      <SelectItem value="_none" disabled>No hay planes activos</SelectItem>
                    ) : (
                      planesActivos.map(p => (
                        <SelectItem key={p.id} value={p.nombre.toLowerCase()}>
                          {p.nombre} — ${p.precioMensual}/mes
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <S label="Modalidad de entrenamiento" field="modalidad" options={opts(["Online", "Presencial", "Híbrido"])} />
              <DateField label="Fecha de inicio con Nahomy" value={form.fechaInicio} onChange={v => set("fechaInicio", v)} minYear={2020} maxYear={2030} />
            </div>
            <T label="Observaciones iniciales del coach" field="notasCoach" placeholder="Primera impresión del cliente, actitud, motivación..." />
            <T label="Estrategia de entrenamiento propuesta" field="estrategiaEntrenamiento" placeholder="Fase 1: adaptación (4 semanas), foco en técnica..." />
            <T label="Prioridades del primer mes" field="prioridadesPrimerMes" placeholder="1. Establecer hábito de entrenamiento, 2. Corregir postura..." />
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4 border-t border-border/50">
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar perfil completo"}
          </Button>
          <Button variant="outline" className="border-border/50 text-muted-foreground" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const DIAS_SEMANA = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CoachClienteDetalle({ id }: { id: number }) {
  const { data: cliente, isLoading } = useGetCliente(id, { query: { queryKey: ["/api/clientes/", id] as any, enabled: !!id } });
  const [editOpen, setEditOpen] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [progresoPrintMode, setProgresoPrintMode] = useState<"print" | "digital">("digital");
  const { exportToPdf, isExporting } = usePdfExport();
  const c = cliente as ClienteCompleto | undefined;

  const semanaInicio = useMemo(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"), []);

  const { data: rutinaDias, isLoading: loadingRutina } = useGetRutina(id, semanaInicio, {
    query: { queryKey: [`/api/rutinas/${id}/${semanaInicio}`] as any, enabled: !!id },
  });

  const { data: planDias, isLoading: loadingNutricion } = useGetPlanComida(id, semanaInicio, {
    query: { queryKey: [`/api/planes-comida/${id}/${semanaInicio}`] as any, enabled: !!id },
  });

  const { data: progresoList, isLoading: loadingProgreso } = useQuery<any[]>({
    queryKey: [`/api/progreso/${id}`],
    queryFn: () => customFetch<any[]>(`/api/progreso/${id}`),
    enabled: !!id,
  });

  const { data: pagosList, isLoading: loadingPagos } = useQuery<any[]>({
    queryKey: [`/api/pagos/cliente/${id}`],
    queryFn: () => customFetch<any[]>(`/api/pagos/${id}`),
    enabled: !!id,
  });

  const ultimoProgreso = progresoList?.[0];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32 bg-border/50 mb-6" />
        <div className="flex items-center space-x-6">
          <Skeleton className="h-24 w-24 rounded-full bg-border/50" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-border/50" />
            <Skeleton className="h-4 w-48 bg-border/50" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Skeleton className="h-64 w-full bg-border/50" />
          <Skeleton className="h-64 w-full bg-border/50" />
        </div>
      </div>
    );
  }

  if (!c) return <div className="text-center py-12 text-muted-foreground">Cliente no encontrado</div>;

  const edad = calcEdad(c.fechaNacimiento);
  const imc = calcIMC(c.peso, c.altura);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Link href="/coach/clientes">
        <Button variant="ghost" className="text-muted-foreground hover:text-white -ml-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Clientes
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-syne font-bold text-4xl shadow-[0_0_15px_rgba(127,255,79,0.2)]">
            {c.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-4xl font-syne font-bold text-white mb-2">{c.nombre}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-muted-foreground">{c.email}</p>
              {edad && <span className="text-muted-foreground text-sm">{edad}</span>}
              <Badge variant="outline" className={c.activo ? "border-primary/50 text-primary" : "border-muted text-muted-foreground"}>
                {c.activo ? "Activo" : "Inactivo"}
              </Badge>
              {c.planTipo && (
                <Badge variant="outline" className="border-blue-500/50 text-blue-400 capitalize">{c.planTipo}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link href={`/coach/mensajes?userId=${c.id}`}>
            <Button variant="outline" className="border-border/50 text-white hover:bg-white/5">Enviar Mensaje</Button>
          </Link>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> Editar Perfil
          </Button>
        </div>
      </div>

      {/* ── Tabs: Rutinas / Nutrición / Progreso / Pagos ── */}
      <Tabs defaultValue="rutinas" className="w-full">
        <TabsList className="grid grid-cols-4 bg-card border border-border/50 h-12 w-full">
          <TabsTrigger value="rutinas" className="flex items-center gap-1.5 text-sm">
            <Dumbbell className="w-3.5 h-3.5" /> Rutinas
          </TabsTrigger>
          <TabsTrigger value="nutricion" className="flex items-center gap-1.5 text-sm">
            <Apple className="w-3.5 h-3.5" /> Nutrición
          </TabsTrigger>
          <TabsTrigger value="progreso" className="flex items-center gap-1.5 text-sm">
            <TrendingUp className="w-3.5 h-3.5" /> Progreso
          </TabsTrigger>
          <TabsTrigger value="pagos" className="flex items-center gap-1.5 text-sm">
            <CreditCard className="w-3.5 h-3.5" /> Pagos
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: RUTINAS ─────────────────────────────────── */}
        <TabsContent value="rutinas">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="font-syne text-base flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" /> Rutina — Semana del {new Date(semanaInicio + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
              </CardTitle>
              <Link href={`/coach/rutinas?clienteId=${c.id}`}>
                <Button variant="outline" size="sm" className="border-border/50 text-muted-foreground hover:text-white gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Ver completo
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {loadingRutina ? (
                <div className="space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full bg-border/30" />)}</div>
              ) : !rutinaDias || (rutinaDias as any[]).length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground text-sm">Sin rutina asignada esta semana</p>
                  <Link href={`/coach/rutinas?clienteId=${c.id}`}>
                    <Button size="sm" className="bg-primary text-white hover:bg-primary/90 mt-2">
                      Generar con IA
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {(rutinaDias as any[]).sort((a, b) => a.diaSemana - b.diaSemana).map((dia: any) => (
                    <div key={dia.diaSemana} className={cn(
                      "flex items-start gap-3 px-3 py-2.5 rounded-lg border",
                      dia.aprobada ? "border-primary/20 bg-primary/5" : "border-border/30 bg-background/50"
                    )}>
                      <span className="text-xs font-semibold text-muted-foreground w-8 pt-0.5 flex-shrink-0">
                        {DIAS_SEMANA[dia.diaSemana] ?? `D${dia.diaSemana + 1}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        {dia.ejercicios && dia.ejercicios.length > 0 ? (
                          <p className="text-sm text-white/90 truncate">
                            {dia.ejercicios.map((e: any) => e.nombre || e.ejercicio).filter(Boolean).slice(0, 4).join(" · ")}
                            {dia.ejercicios.length > 4 && <span className="text-muted-foreground"> +{dia.ejercicios.length - 4} más</span>}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Descanso</p>
                        )}
                      </div>
                      {dia.aprobada && <Badge className="bg-primary/20 text-primary border-0 text-xs flex-shrink-0">✓</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: NUTRICIÓN ───────────────────────────────── */}
        <TabsContent value="nutricion">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="font-syne text-base flex items-center gap-2">
                <Apple className="w-4 h-4 text-primary" /> Nutrición — Semana del {new Date(semanaInicio + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
              </CardTitle>
              <Link href={`/coach/nutricion?clienteId=${c.id}`}>
                <Button variant="outline" size="sm" className="border-border/50 text-muted-foreground hover:text-white gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Ver completo
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {loadingNutricion ? (
                <div className="space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full bg-border/30" />)}</div>
              ) : !planDias || (planDias as any[]).length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground text-sm">Sin plan de nutrición esta semana</p>
                  <Link href={`/coach/nutricion?clienteId=${c.id}`}>
                    <Button size="sm" className="bg-primary text-white hover:bg-primary/90 mt-2">
                      Generar con IA
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {(planDias as any[]).sort((a, b) => a.diaSemana - b.diaSemana).map((dia: any) => (
                    <div key={dia.diaSemana} className={cn(
                      "flex items-start gap-3 px-3 py-2.5 rounded-lg border",
                      dia.aprobada ? "border-primary/20 bg-primary/5" : "border-border/30 bg-background/50"
                    )}>
                      <span className="text-xs font-semibold text-muted-foreground w-8 pt-0.5 flex-shrink-0">
                        {DIAS_SEMANA[dia.diaSemana] ?? `D${dia.diaSemana + 1}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        {dia.comidas && dia.comidas.length > 0 ? (
                          <p className="text-sm text-white/90 truncate">
                            {dia.comidas.map((c: any) => c.nombre || c.tipo).filter(Boolean).join(" · ")}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Sin comidas</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {dia.caloriasTotal > 0 && (
                          <span className="text-xs text-muted-foreground">{dia.caloriasTotal} kcal</span>
                        )}
                        {dia.aprobada && <Badge className="bg-primary/20 text-primary border-0 text-xs">✓</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: PROGRESO ────────────────────────────────── */}
        <TabsContent value="progreso">
          <div className="space-y-3">
            {/* Alert: > 35 days without progress */}
            {progresoList && progresoList.length > 0 && (() => {
              const dias = Math.floor((Date.now() - new Date((progresoList[0] as any).fecha + "T12:00:00").getTime()) / 86400000);
              return dias > 35 ? (
                <div className="px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-sm text-yellow-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {c.nombre.split(" ")[0]} lleva <strong className="mx-1">{dias} días</strong> sin registrar progreso
                </div>
              ) : null;
            })()}

            {/* Hidden printable progreso panel */}
            {progresoList && progresoList.length > 0 && (
              <div style={{ position: "absolute", left: "-9999px", top: 0, pointerEvents: "none" }}>
                <PrintableProgreso
                  clienteNombre={c?.nombre || "Cliente"}
                  coachNombre="Nahomy"
                  periodo={new Date((progresoList[0] as any).fecha + "T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                  registroActual={progresoList[0] as any}
                  registroAnterior={progresoList[1] as any || null}
                  printMode={progresoPrintMode}
                />
              </div>
            )}
            <PdfModeModal
              open={showPdfModal}
              onClose={() => setShowPdfModal(false)}
              isExporting={isExporting}
              onSelect={async (mode) => {
                setProgresoPrintMode(mode);
                setShowPdfModal(false);
                await new Promise(r => setTimeout(r, 80));
                await exportToPdf("printable-progreso", {
                  filename: `progreso-${c?.nombre?.replace(/\s/g, "-")}-${new Date().toISOString().slice(0, 7)}`,
                  backgroundColor: mode === "print" ? "#FFFFFF" : "#0A0A0A",
                });
              }}
            />

            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-syne text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Historial de Progreso
                  </CardTitle>
                  {progresoList && progresoList.length > 0 && (
                    <Button size="sm" variant="outline" className="border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 h-7 text-xs"
                      onClick={() => setShowPdfModal(true)}
                      disabled={isExporting}>
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      PDF Progreso
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {loadingProgreso ? (
                  <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-12 w-full bg-border/30" />)}</div>
                ) : !progresoList || progresoList.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground text-sm">Sin registros de progreso aún</p>
                    <p className="text-xs text-muted-foreground">El cliente agrega registros desde "Mi Progreso" en su panel</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {progresoList.map((p: any, i: number) => {
                      const fotos = ["fotoFrente","fotoEspalda","fotoPerfilIzq","fotoPerfilDer","fotoExtra1","fotoExtra2"]
                        .map(f => p[f] as string | null).filter(Boolean);
                      return (
                        <div key={p.id ?? i} className={cn("p-4 rounded-lg border", i === 0 ? "border-primary/30 bg-primary/3" : "border-border/30 bg-background/50")}>
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <span className="text-sm font-semibold text-white">
                                {p.fecha ? new Date(p.fecha + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                              </span>
                              {i === 0 && <Badge className="ml-2 bg-primary/20 text-primary border-0 text-xs">último</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-white/80">
                              {p.pesoKg && <span>⚖️ <strong>{p.pesoKg}kg</strong></span>}
                              {p.grasaCorporal && <span>🫀 <strong>{p.grasaCorporal}%</strong></span>}
                              {p.cinturaCm && <span>📏 Cintura <strong>{p.cinturaCm}cm</strong></span>}
                              {p.masaMuscular && <span>💪 <strong>{p.masaMuscular}kg</strong></span>}
                            </div>
                          </div>
                          {fotos.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {fotos.map((url, fi) => (
                                <img key={fi} src={url ?? undefined} alt="" className="w-14 h-14 object-cover rounded border border-border/50 cursor-pointer hover:opacity-80" onClick={() => window.open(url ?? "", "_blank")} />
                              ))}
                            </div>
                          )}
                          {(p.notasCliente || p.notas) && (
                            <p className="text-xs text-muted-foreground mt-2 italic">"{p.notasCliente || p.notas}"</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB: PAGOS ───────────────────────────────────── */}
        <TabsContent value="pagos">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="font-syne text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Historial de Pagos
              </CardTitle>
              <Link href={`/coach/pagos?clienteId=${c.id}`}>
                <Button variant="outline" size="sm" className="border-border/50 text-muted-foreground hover:text-white gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Registrar pago
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {loadingPagos ? (
                <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-12 w-full bg-border/30" />)}</div>
              ) : !pagosList || pagosList.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground text-sm">Sin pagos registrados</p>
                  <Link href={`/coach/pagos?clienteId=${c.id}`}>
                    <Button size="sm" className="bg-primary text-white hover:bg-primary/90 mt-2">
                      Registrar primer pago
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {pagosList.map((pago: any) => (
                    <div key={pago.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/30 bg-background/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          pago.estado === "pagado" ? "bg-primary" : "bg-yellow-400"
                        )} />
                        <div>
                          <p className="text-sm text-white">{pago.concepto || "Pago mensual"}</p>
                          <p className="text-xs text-muted-foreground">
                            {pago.fecha ? new Date(pago.fecha + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                            {" · "}{pago.metodo}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">${Number(pago.monto).toFixed(2)}</span>
                        <Badge variant="outline" className={cn(
                          "text-xs border",
                          pago.estado === "pagado" ? "border-primary/30 text-primary" : "border-yellow-400/30 text-yellow-400"
                        )}>
                          {pago.estado}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Datos personales + físicos */}
        <div className="space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-syne text-base flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-primary" /> Datos Personales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              <LabelValue label="Sexo" value={c.sexo} />
              <LabelValue label="Edad" value={edad} />
              <LabelValue label="Teléfono" value={c.telefono} />
              <LabelValue label="Ciudad" value={c.ciudad ? `${c.ciudad}, ${c.pais || ""}` : c.pais} />
              <LabelValue label="Modalidad" value={c.modalidad} />
              <LabelValue label="Fecha de inicio" value={c.fechaInicio} />
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-syne text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Medidas Actuales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              {loadingProgreso ? (
                <div className="col-span-2 text-xs text-muted-foreground">Cargando medidas...</div>
              ) : (c.peso || c.altura || c.grasaCorporalPct || ultimoProgreso) ? (
                <>
                  <LabelValue label="Peso" value={(c.peso ?? ultimoProgreso?.peso) ? `${c.peso ?? ultimoProgreso?.peso} kg` : undefined} />
                  <LabelValue label="Altura" value={c.altura ? `${c.altura} cm` : undefined} />
                  <LabelValue label="IMC" value={imc} />
                  <LabelValue label="Grasa corporal" value={(c.grasaCorporalPct ?? ultimoProgreso?.grasaCorporalPct) ? `${c.grasaCorporalPct ?? ultimoProgreso?.grasaCorporalPct}%` : undefined} />
                  <LabelValue label="Complexión" value={c.complexion} />
                  {ultimoProgreso && (
                    <>
                      {ultimoProgreso.cintura && <LabelValue label="Cintura" value={`${ultimoProgreso.cintura} cm`} />}
                      {ultimoProgreso.cadera && <LabelValue label="Cadera" value={`${ultimoProgreso.cadera} cm`} />}
                      {ultimoProgreso.brazo && <LabelValue label="Brazo" value={`${ultimoProgreso.brazo} cm`} />}
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground">Último registro: {ultimoProgreso.fecha ? new Date(ultimoProgreso.fecha + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : ""}</span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="col-span-2 text-center py-3">
                  <p className="text-xs text-muted-foreground">Sin medidas registradas aún</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Col 2: Objetivos + Fitness */}
        <div className="space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-syne text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              <LabelValue label="Objetivo principal" value={c.objetivoPrincipal || c.objetivo} />
              <LabelValue label="Peso meta" value={c.pesoMeta ? `${c.pesoMeta} kg` : undefined} />
              <LabelValue label="Fecha meta" value={c.fechaMeta} />
              <LabelValue label="Urgencia" value={c.nivelUrgencia} />
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-syne text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Plan de Entrenamiento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              <LabelValue label="Nivel" value={c.nivelFitness} />
              <LabelValue label="Días/semana" value={c.diasDisponibles} />
              <LabelValue label="Duración sesión" value={c.duracionSesion} />
              <LabelValue label="Horario" value={c.horarioPreferido} />
              <LabelValue label="Lugar" value={c.lugarEntrenamiento} />
              {c.lesiones && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Lesiones</span>
                  <p className="text-sm text-yellow-400 mt-0.5">{c.lesiones}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Col 3: Nutrición + Notas coach */}
        <div className="space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-syne text-base flex items-center gap-2">
                <Utensils className="w-4 h-4 text-primary" /> Nutrición
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              <LabelValue label="Tipo alimentación" value={c.tipoAlimentacion} />
              <LabelValue label="Comidas/día" value={c.comidasAlDia} />
              <LabelValue label="Cocina en" value={c.cocinaEnCasa} />
              <LabelValue label="Presupuesto" value={c.presupuestoAlimentacion} />
              <LabelValue label="Agua/día" value={c.aguaDiaria ? `${c.aguaDiaria}L` : undefined} />
              {c.alergiasAlimentarias && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Alergias</span>
                  <p className="text-sm text-red-400 mt-0.5">{c.alergiasAlimentarias}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {(c.notasCoach || c.estrategiaEntrenamiento || c.prioridadesPrimerMes) && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="font-syne text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" /> Notas del Coach
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {c.notasCoach && (
                  <div>
                    <span className="text-xs text-muted-foreground">Observaciones</span>
                    <p className="text-sm text-white/80 mt-0.5">{c.notasCoach}</p>
                  </div>
                )}
                {c.estrategiaEntrenamiento && (
                  <div>
                    <span className="text-xs text-muted-foreground">Estrategia</span>
                    <p className="text-sm text-white/80 mt-0.5">{c.estrategiaEntrenamiento}</p>
                  </div>
                )}
                {c.prioridadesPrimerMes && (
                  <div>
                    <span className="text-xs text-muted-foreground">Prioridades del primer mes</span>
                    <p className="text-sm text-white/80 mt-0.5">{c.prioridadesPrimerMes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {c && <EditarClienteDialog cliente={c} open={editOpen} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
