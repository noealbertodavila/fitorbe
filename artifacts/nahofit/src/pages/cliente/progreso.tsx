import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, differenceInDays, startOfMonth, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { getFechaHoy } from "@/lib/date-mt";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Plus, Camera, ChevronRight, ChevronLeft, Scale, Activity, TrendingDown, TrendingUp,
  AlertCircle, ImageIcon, GitCompareArrows, BarChart3, Clock, X, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RegistroProgreso {
  id: number;
  clienteId: number;
  registradoPor?: number;
  fecha: string;
  pesoKg?: number | null;
  grasaCorporal?: number | null;
  imc?: number | null;
  cuelloCm?: number | null;
  pechoCm?: number | null;
  cinturaCm?: number | null;
  caderaCm?: number | null;
  brazoDerCm?: number | null;
  brazoIzqCm?: number | null;
  musloDerCm?: number | null;
  musloIzqCm?: number | null;
  pantorrillaDerCm?: number | null;
  pantorrillaIzqCm?: number | null;
  masaMuscular?: number | null;
  masaGrasaKg?: number | null;
  aguaCorporal?: number | null;
  metabolismoBasal?: number | null;
  edadMetabolica?: number | null;
  fotoFrente?: string | null;
  fotoEspalda?: string | null;
  fotoPerfilIzq?: string | null;
  fotoPerfilDer?: string | null;
  fotoExtra1?: string | null;
  fotoExtra2?: string | null;
  notasCliente?: string | null;
  notasCoach?: string | null;
  notas?: string | null;
  creadoEn?: string;
}

const FOTO_POSITIONS = [
  { field: "fotoFrente", label: "Frente" },
  { field: "fotoEspalda", label: "Espalda" },
  { field: "fotoPerfilIzq", label: "Perfil Izq." },
  { field: "fotoPerfilDer", label: "Perfil Der." },
  { field: "fotoExtra1", label: "Extra 1" },
  { field: "fotoExtra2", label: "Extra 2" },
] as const;

// ─── Foto Uploader ────────────────────────────────────────────────────────────
function FotoUploader({
  label, file, preview, onChange,
}: { label: string; file: File | null; preview: string | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground text-center">{label}</span>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={cn(
          "relative w-full aspect-square rounded-lg border-2 border-dashed transition-colors overflow-hidden",
          preview ? "border-primary/50" : "border-border/50 hover:border-primary/40"
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Camera className="w-6 h-6" />
            <span className="text-xs">Subir</span>
          </div>
        )}
      </button>
      {file && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(null); }}
          className="text-xs text-red-400 hover:text-red-300 text-center"
        >
          Eliminar
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0] ?? null;
          if (f && f.size > 5 * 1024 * 1024) { alert("Máximo 5MB por foto"); return; }
          onChange(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Nuevo Registro Modal ─────────────────────────────────────────────────────
function NuevoRegistroModal({
  open, onClose, clienteId, alturaCliente, onSuccess,
}: { open: boolean; onClose: () => void; clienteId: number; alturaCliente?: number; onSuccess: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  const [fotos, setFotos] = useState<Record<string, File | null>>({});
  const [previews, setPreviews] = useState<Record<string, string | null>>({});

  const [medidas, setMedidas] = useState({
    pesoKg: "", grasaCorporal: "", cuelloCm: "", pechoCm: "",
    cinturaCm: "", caderaCm: "", brazoDerCm: "", brazoIzqCm: "",
    musloDerCm: "", musloIzqCm: "", pantorrillaDerCm: "", pantorrillaIzqCm: "",
    masaMuscular: "", masaGrasaKg: "", aguaCorporal: "", metabolismoBasal: "", edadMetabolica: "",
  });
  const [notas, setNotas] = useState("");

  const setFoto = useCallback((field: string, file: File | null) => {
    setFotos(p => ({ ...p, [field]: file }));
    setPreviews(p => ({ ...p, [field]: file ? URL.createObjectURL(file) : null }));
  }, []);

  const imcCalc = () => {
    if (medidas.pesoKg && alturaCliente) {
      return (parseFloat(medidas.pesoKg) / ((alturaCliente / 100) ** 2)).toFixed(1);
    }
    return "";
  };

  const handleSave = async () => {
    if (!medidas.pesoKg) { toast({ variant: "destructive", title: "El peso es obligatorio" }); setStep(2); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("clienteId", String(clienteId));
      fd.append("fecha", getFechaHoy());
      if (notas) fd.append("notasCliente", notas);

      const imc = imcCalc();
      if (imc) fd.append("imc", imc);

      Object.entries(medidas).forEach(([k, v]) => { if (v) fd.append(k, v); });
      Object.entries(fotos).forEach(([k, f]) => { if (f) fd.append(k, f); });

      const token = localStorage.getItem("nahofit_auth_token");
      const resp = await fetch("/api/progreso", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!resp.ok) throw new Error(await resp.text());

      toast({ title: "✓ Registro guardado", description: "Tu progreso del mes ha sido guardado." });
      onSuccess();
      onClose();
      setStep(1);
      setFotos({});
      setPreviews({});
      setMedidas({ pesoKg: "", grasaCorporal: "", cuelloCm: "", pechoCm: "", cinturaCm: "", caderaCm: "", brazoDerCm: "", brazoIzqCm: "", musloDerCm: "", musloIzqCm: "", pantorrillaDerCm: "", pantorrillaIzqCm: "", masaMuscular: "", masaGrasaKg: "", aguaCorporal: "", metabolismoBasal: "", edadMetabolica: "" });
      setNotas("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const M = ({ label, field, placeholder = "" }: { label: string; field: keyof typeof medidas; placeholder?: string }) => (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <Input
        type="number" step="0.1" placeholder={placeholder}
        value={medidas[field]}
        onChange={e => setMedidas(p => ({ ...p, [field]: e.target.value }))}
        className="bg-background text-sm h-9 border-border/50"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Registro Mensual de Progreso
          </DialogTitle>
        </DialogHeader>

        {/* Steps */}
        <div className="flex gap-2 mb-4">
          {[
            { n: 1, label: "Fotos" },
            { n: 2, label: "Medidas" },
            { n: 3, label: "Notas" },
          ].map(s => (
            <button
              key={s.n}
              type="button"
              onClick={() => setStep(s.n as any)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-colors border",
                step === s.n
                  ? "bg-primary text-white border-primary"
                  : step > s.n
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground border-border/50"
              )}
            >
              {step > s.n ? <span>✓ </span> : null}{s.n}. {s.label}
            </button>
          ))}
        </div>

        {/* Step 1: Photos */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Sube hasta 6 fotos de cuerpo completo. Todas son opcionales.</p>
            <div className="grid grid-cols-3 gap-3">
              {FOTO_POSITIONS.map(pos => (
                <FotoUploader
                  key={pos.field}
                  label={pos.label}
                  file={fotos[pos.field] ?? null}
                  preview={previews[pos.field] ?? null}
                  onChange={f => setFoto(pos.field, f)}
                />
              ))}
            </div>
            <Button onClick={() => setStep(2)} className="w-full bg-primary text-white hover:bg-primary/90">
              Continuar a Medidas <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Measurements */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Básicas</p>
              <div className="grid grid-cols-3 gap-3">
                <M label="Peso (kg) *" field="pesoKg" placeholder="65.5" />
                <M label="% Grasa corporal" field="grasaCorporal" placeholder="20" />
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">IMC (auto)</label>
                  <Input value={imcCalc() || "—"} readOnly className="bg-background/30 text-sm h-9 border-border/50 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Circunferencias (cm)</p>
              <div className="grid grid-cols-3 gap-3">
                <M label="Cuello" field="cuelloCm" placeholder="37" />
                <M label="Pecho/Busto" field="pechoCm" placeholder="90" />
                <M label="Cintura" field="cinturaCm" placeholder="78" />
                <M label="Cadera" field="caderaCm" placeholder="95" />
                <M label="Brazo der." field="brazoDerCm" placeholder="32" />
                <M label="Brazo izq." field="brazoIzqCm" placeholder="31" />
                <M label="Muslo der." field="musloDerCm" placeholder="55" />
                <M label="Muslo izq." field="musloIzqCm" placeholder="54" />
                <M label="Pantorrilla der." field="pantorrillaDerCm" placeholder="36" />
                <M label="Pantorrilla izq." field="pantorrillaIzqCm" placeholder="35" />
              </div>
            </div>
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Bioimpedancia (opcional)</p>
              <div className="grid grid-cols-3 gap-3">
                <M label="Masa muscular (kg)" field="masaMuscular" placeholder="28" />
                <M label="Masa grasa (kg)" field="masaGrasaKg" placeholder="12" />
                <M label="Agua corporal (%)" field="aguaCorporal" placeholder="55" />
                <M label="Met. basal (kcal)" field="metabolismoBasal" placeholder="1500" />
                <M label="Edad metabólica" field="edadMetabolica" placeholder="28" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="border-border/50">
                <ChevronLeft className="w-4 h-4 mr-1" /> Fotos
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1 bg-primary text-white hover:bg-primary/90">
                Continuar a Notas <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Notes */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-2">¿Cómo te sentiste este mes? (opcional)</label>
              <Textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Escribe cómo fue tu mes, cómo te sientes, tus logros y dificultades..."
                className="bg-background resize-none h-28 border-border/50"
              />
            </div>
            <div className="p-3 bg-background/50 rounded-lg border border-border/30 text-sm text-muted-foreground">
              <span className="font-medium text-white">Fecha del registro: </span>
              {format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="border-border/50">
                <ChevronLeft className="w-4 h-4 mr-1" /> Medidas
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-white hover:bg-primary/90">
                <Check className="w-4 h-4 mr-2" />
                {saving ? "Guardando..." : "Guardar registro mensual"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Comparación Modal ────────────────────────────────────────────────────────
function ComparacionModal({
  open, onClose, registros,
}: { open: boolean; onClose: () => void; registros: RegistroProgreso[] }) {
  const [r1Id, setR1Id] = useState<number | null>(null);
  const [r2Id, setR2Id] = useState<number | null>(null);

  const r1 = registros.find(r => r.id === r1Id);
  const r2 = registros.find(r => r.id === r2Id);

  const diff = (a?: number | null, b?: number | null) => {
    if (!a || !b) return null;
    const d = a - b;
    return { value: Math.abs(d).toFixed(1), positive: d < 0, zero: d === 0 };
  };

  const COMPARABLES = [
    { label: "Peso (kg)", key: "pesoKg" as keyof RegistroProgreso, lowerBetter: true },
    { label: "Grasa corporal (%)", key: "grasaCorporal" as keyof RegistroProgreso, lowerBetter: true },
    { label: "Cintura (cm)", key: "cinturaCm" as keyof RegistroProgreso, lowerBetter: true },
    { label: "Cadera (cm)", key: "caderaCm" as keyof RegistroProgreso, lowerBetter: true },
    { label: "Pecho (cm)", key: "pechoCm" as keyof RegistroProgreso, lowerBetter: false },
    { label: "Brazo der. (cm)", key: "brazoDerCm" as keyof RegistroProgreso, lowerBetter: false },
    { label: "Masa muscular (kg)", key: "masaMuscular" as keyof RegistroProgreso, lowerBetter: false },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 text-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5 text-primary" /> Comparar Registros
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Registro 1 (anterior)</label>
            <select
              value={r1Id ?? ""}
              onChange={e => setR1Id(Number(e.target.value) || null)}
              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">— Seleccionar —</option>
              {registros.map(r => (
                <option key={r.id} value={r.id}>
                  {format(new Date(r.fecha + "T12:00:00"), "MMMM yyyy", { locale: es })} — {r.pesoKg ? `${r.pesoKg}kg` : "sin peso"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Registro 2 (reciente)</label>
            <select
              value={r2Id ?? ""}
              onChange={e => setR2Id(Number(e.target.value) || null)}
              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">— Seleccionar —</option>
              {registros.map(r => (
                <option key={r.id} value={r.id}>
                  {format(new Date(r.fecha + "T12:00:00"), "MMMM yyyy", { locale: es })} — {r.pesoKg ? `${r.pesoKg}kg` : "sin peso"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {r1 && r2 && (
          <>
            {/* Side-by-side photos */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {FOTO_POSITIONS.map(pos => {
                const img1 = r1[pos.field as keyof RegistroProgreso] as string | null;
                const img2 = r2[pos.field as keyof RegistroProgreso] as string | null;
                if (!img1 && !img2) return null;
                return (
                  <div key={pos.field} className="space-y-1">
                    <span className="text-xs text-muted-foreground block text-center">{pos.label}</span>
                    <div className="grid grid-rows-2 gap-1">
                      {img1 ? <img src={img1} className="w-full aspect-square object-cover rounded" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; (e.currentTarget.nextElementSibling as HTMLElement)?.style && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'); }} /> : null}
                      <div className={`w-full aspect-square rounded bg-background/50 border border-border/30 flex items-center justify-center ${img1 ? 'hidden' : 'flex'}`}><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
                      {img2 ? <img src={img2} className="w-full aspect-square object-cover rounded border-2 border-primary/50" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; (e.currentTarget.nextElementSibling as HTMLElement)?.style && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'); }} /> : null}
                      <div className={`w-full aspect-square rounded bg-background/50 border-2 border-primary/30 flex items-center justify-center ${img2 ? 'hidden' : 'flex'}`}><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Measurement comparison */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Resumen de cambios</p>
              <div className="grid grid-cols-2 gap-2">
                {COMPARABLES.map(comp => {
                  const v1 = r1[comp.key] as number | undefined;
                  const v2 = r2[comp.key] as number | undefined;
                  if (!v1 && !v2) return null;
                  const d = diff(v2, v1);
                  return (
                    <div key={comp.key} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/30 bg-background/50">
                      <span className="text-xs text-muted-foreground">{comp.label}</span>
                      <span className="text-sm text-white font-medium">
                        {v1 ?? "—"} → {v2 ?? "—"}
                        {d && !d.zero && (
                          <span className={cn("ml-2 text-xs font-bold", (d.positive === comp.lowerBetter) ? "text-primary" : "text-red-400")}>
                            {d.positive ? "−" : "+"}{d.value}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {(!r1 || !r2) && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Selecciona dos registros para ver la comparación
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClienteProgreso() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNuevo, setShowNuevo] = useState(false);
  const [showComparacion, setShowComparacion] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const { data: registros = [], isLoading } = useQuery<RegistroProgreso[]>({
    queryKey: [`/api/progreso/${user?.id}`],
    queryFn: () => customFetch<RegistroProgreso[]>(`/api/progreso/${user?.id}`),
    enabled: !!user?.id,
  });

  const registrosOrdenados = [...registros].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const registrosCrono = [...registros].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const ultimo = registrosOrdenados[0];
  const penultimo = registrosOrdenados[1];

  const hoy = new Date();
  const tieneRegistroEsteMes = registrosOrdenados.some(r => isSameMonth(new Date(r.fecha + "T12:00:00"), hoy));
  const diasSinRegistro = ultimo ? differenceInDays(hoy, new Date(ultimo.fecha + "T12:00:00")) : null;

  const fmtFecha = (fecha: string) =>
    format(new Date(fecha + "T12:00:00"), "MMMM yyyy", { locale: es });

  const trend = (curr?: number | null, prev?: number | null) => {
    if (!curr || !prev) return null;
    if (curr < prev) return <TrendingDown className="w-4 h-4 text-primary ml-1 inline" />;
    if (curr > prev) return <TrendingUp className="w-4 h-4 text-red-400 ml-1 inline" />;
    return null;
  };

  const detalleReg = registrosOrdenados.find(r => r.id === detalleId);

  // Chart data
  const chartData = registrosCrono.map(r => ({
    fecha: r.fecha,
    label: format(new Date(r.fecha + "T12:00:00"), "MMM yy", { locale: es }),
    peso: r.pesoKg,
    grasa: r.grasaCorporal,
    cintura: r.cinturaCm,
    cadera: r.caderaCm,
    pecho: r.pechoCm,
    muscular: r.masaMuscular,
    masaGrasa: r.masaGrasaKg,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white mb-1">Mi Progreso</h1>
          <p className="text-muted-foreground text-sm">Seguimiento mensual de medidas y fotos corporales</p>
        </div>
        <div className="flex gap-2">
          {registrosOrdenados.length >= 2 && (
            <Button variant="outline" onClick={() => setShowComparacion(true)} className="border-border/50 text-muted-foreground hover:text-white gap-2">
              <GitCompareArrows className="w-4 h-4" /> Comparar
            </Button>
          )}
          <Button
            onClick={() => setShowNuevo(true)}
            disabled={tieneRegistroEsteMes}
            className="bg-primary text-white hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" />
            {tieneRegistroEsteMes ? "Ya registraste este mes" : "Agregar registro del mes"}
          </Button>
        </div>
      </div>

      {tieneRegistroEsteMes && (
        <div className="px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-sm text-primary">
          ✓ Ya tienes registro este mes. El próximo registro estará disponible el {format(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1), "1 'de' MMMM", { locale: es })}.
        </div>
      )}

      {diasSinRegistro !== null && diasSinRegistro > 35 && (
        <div className="px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-sm text-yellow-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Llevas {diasSinRegistro} días sin registrar tu progreso. ¡Es hora de agregar un nuevo registro!
        </div>
      )}

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 bg-border/30" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                <Scale className="w-3.5 h-3.5 text-primary" /> Peso actual
              </div>
              <div className="text-3xl font-syne font-bold text-white">
                {ultimo?.pesoKg ? `${ultimo.pesoKg} kg` : "—"}
              </div>
              {penultimo?.pesoKg && ultimo?.pesoKg && (
                <p className="text-xs text-muted-foreground mt-1">
                  vs {penultimo.pesoKg}kg {trend(ultimo.pesoKg, penultimo.pesoKg)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                <Activity className="w-3.5 h-3.5 text-primary" /> Grasa
              </div>
              <div className="text-3xl font-syne font-bold text-white">
                {ultimo?.grasaCorporal ? `${ultimo.grasaCorporal}%` : "—"}
              </div>
              {penultimo?.grasaCorporal && ultimo?.grasaCorporal && (
                <p className="text-xs text-muted-foreground mt-1">
                  vs {penultimo.grasaCorporal}% {trend(ultimo.grasaCorporal, penultimo.grasaCorporal)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                <Clock className="w-3.5 h-3.5 text-primary" /> Último registro
              </div>
              <div className="text-xl font-syne font-bold text-white">
                {ultimo ? fmtFecha(ultimo.fecha) : "Sin registros"}
              </div>
              {diasSinRegistro !== null && (
                <p className="text-xs text-muted-foreground mt-1">Hace {diasSinRegistro} días</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-primary" /> Registros
              </div>
              <div className="text-3xl font-syne font-bold text-white">{registros.length}</div>
              <p className="text-xs text-muted-foreground mt-1">registros totales</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline */}
      {!isLoading && (
        <>
          {registrosOrdenados.length === 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="p-12 text-center">
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-syne text-white mb-2">Aún no hay registros</p>
                <p className="text-muted-foreground text-sm mb-6">¡Agrega tu primer registro mensual hoy! 📸</p>
                <Button onClick={() => setShowNuevo(true)} className="bg-primary text-white hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" /> Agregar primer registro
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-syne font-bold text-white">Línea de tiempo</h2>
              {registrosOrdenados.map((reg, idx) => {
                const fotos = FOTO_POSITIONS.map(p => reg[p.field as keyof RegistroProgreso] as string | null).filter(Boolean);
                const isExpanded = detalleId === reg.id;
                const diasAtras = differenceInDays(hoy, new Date(reg.fecha + "T12:00:00"));
                return (
                  <Card key={reg.id} className={cn("bg-card border-border/50 transition-all", idx === 0 && "border-primary/30")}>
                    <CardHeader className="pb-3 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="font-syne text-base capitalize flex items-center gap-2">
                            {idx === 0 && <Badge className="bg-primary/20 text-primary border-0 text-xs">Más reciente</Badge>}
                            {fmtFecha(reg.fecha)}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {diasAtras === 0 ? "Hoy" : `Hace ${diasAtras} día${diasAtras !== 1 ? "s" : ""}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetalleId(isExpanded ? null : reg.id)}
                          className="text-muted-foreground hover:text-white"
                        >
                          {isExpanded ? "Ocultar" : "Ver detalle"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {/* Quick stats */}
                      <div className="flex flex-wrap gap-4 mb-3">
                        {reg.pesoKg && <span className="text-sm text-white">Peso: <strong>{reg.pesoKg}kg</strong></span>}
                        {reg.cinturaCm && <span className="text-sm text-white">Cintura: <strong>{reg.cinturaCm}cm</strong></span>}
                        {reg.grasaCorporal && <span className="text-sm text-white">Grasa: <strong>{reg.grasaCorporal}%</strong></span>}
                        {reg.masaMuscular && <span className="text-sm text-white">Músculo: <strong>{reg.masaMuscular}kg</strong></span>}
                      </div>
                      {/* Photo thumbnails */}
                      {fotos.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {fotos.map((url, i) => (
                            <img key={i} src={url ?? undefined} alt="" className="w-16 h-16 object-cover rounded border border-border/50 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(url ?? "", "_blank")} />
                          ))}
                        </div>
                      )}
                      {fotos.length === 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Sin fotos en este registro</p>
                      )}

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                          {/* All 6 photos */}
                          {fotos.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {FOTO_POSITIONS.map(pos => {
                                const url = reg[pos.field as keyof RegistroProgreso] as string | null;
                                return (
                                  <div key={pos.field} className="space-y-1">
                                    <span className="text-xs text-muted-foreground block text-center">{pos.label}</span>
                                    {url ? (
                                      <>
                                        <img
                                          src={url}
                                          className="w-full aspect-square object-cover rounded cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(url, "_blank")}
                                          onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                            const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
                                            if (sib) sib.style.display = "flex";
                                          }}
                                        />
                                        <div className="w-full aspect-square rounded bg-background/50 border border-red-500/30 flex-col items-center justify-center text-center gap-1 hidden">
                                          <span className="text-2xl">⚠️</span>
                                          <span className="text-[10px] text-red-400">Foto no disponible</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-full aspect-square rounded bg-background/50 border border-border/30 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-muted-foreground" /></div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {/* Full measurements */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              ["Peso", reg.pesoKg, "kg"], ["Grasa corporal", reg.grasaCorporal, "%"],
                              ["IMC", reg.imc, ""], ["Cuello", reg.cuelloCm, "cm"],
                              ["Pecho", reg.pechoCm, "cm"], ["Cintura", reg.cinturaCm, "cm"],
                              ["Cadera", reg.caderaCm, "cm"], ["Brazo der.", reg.brazoDerCm, "cm"],
                              ["Brazo izq.", reg.brazoIzqCm, "cm"], ["Muslo der.", reg.musloDerCm, "cm"],
                              ["Muslo izq.", reg.musloIzqCm, "cm"], ["Pantorrilla der.", reg.pantorrillaDerCm, "cm"],
                              ["Pantorrilla izq.", reg.pantorrillaIzqCm, "cm"], ["Masa muscular", reg.masaMuscular, "kg"],
                              ["Masa grasa", reg.masaGrasaKg, "kg"], ["Agua corporal", reg.aguaCorporal, "%"],
                              ["Met. basal", reg.metabolismoBasal, "kcal"], ["Edad metabólica", reg.edadMetabolica, "años"],
                            ].filter(([, v]) => v !== null && v !== undefined).map(([l, v, u]) => (
                              <div key={String(l)} className="text-center p-2 rounded bg-background/50 border border-border/30">
                                <span className="text-xs text-muted-foreground block">{String(l)}</span>
                                <span className="text-sm font-bold text-white">{String(v)}{u}</span>
                              </div>
                            ))}
                          </div>
                          {(reg.notasCliente || reg.notas) && (
                            <div className="p-3 bg-background/50 rounded-lg border border-border/30">
                              <span className="text-xs text-muted-foreground block mb-1">Notas</span>
                              <p className="text-sm text-white/80 italic">"{reg.notasCliente || reg.notas}"</p>
                            </div>
                          )}
                          {reg.notasCoach && (
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                              <span className="text-xs text-primary block mb-1">Nota del coach</span>
                              <p className="text-sm text-white/80">{reg.notasCoach}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Charts */}
          {chartData.length >= 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-syne font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Gráficas de evolución
              </h2>

              {/* Weight chart */}
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="font-syne text-sm text-muted-foreground uppercase tracking-wider">Peso (kg)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A2E20" vertical={false} />
                        <XAxis dataKey="label" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={v => `${v}kg`} />
                        <RechartsTooltip contentStyle={{ background: "#0F1A14", border: "1px solid #1A2E20", color: "#fff" }} itemStyle={{ color: "#10B981" }} formatter={(v) => [`${v}kg`, "Peso"]} />
                        <Line type="monotone" dataKey="peso" name="Peso" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: "#10B981" }} activeDot={{ r: 6 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Body fat + muscle */}
              {chartData.some(d => d.grasa || d.muscular) && (
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-syne text-sm text-muted-foreground uppercase tracking-wider">Composición corporal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1A2E20" vertical={false} />
                          <XAxis dataKey="label" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                          <RechartsTooltip contentStyle={{ background: "#0F1A14", border: "1px solid #1A2E20", color: "#fff" }} />
                          <Legend iconType="line" />
                          <Line type="monotone" dataKey="grasa" name="Grasa %" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          <Line type="monotone" dataKey="muscular" name="Músculo kg" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Circumferences */}
              {chartData.some(d => d.cintura || d.cadera || d.pecho) && (
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-syne text-sm text-muted-foreground uppercase tracking-wider">Circunferencias (cm)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1A2E20" vertical={false} />
                          <XAxis dataKey="label" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={v => `${v}cm`} />
                          <RechartsTooltip contentStyle={{ background: "#0F1A14", border: "1px solid #1A2E20", color: "#fff" }} formatter={(v, n) => [`${v}cm`, n]} />
                          <Legend iconType="line" />
                          <Line type="monotone" dataKey="cintura" name="Cintura" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          <Line type="monotone" dataKey="cadera" name="Cadera" stroke="#60A5FA" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          <Line type="monotone" dataKey="pecho" name="Pecho" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <NuevoRegistroModal
        open={showNuevo}
        onClose={() => setShowNuevo(false)}
        clienteId={user?.id || 0}
        alturaCliente={(user as any)?.altura}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: [`/api/progreso/${user?.id}`] })}
      />
      <ComparacionModal
        open={showComparacion}
        onClose={() => setShowComparacion(false)}
        registros={registrosOrdenados}
      />
    </div>
  );
}
