import { useState, useEffect } from "react";
import { useListClientes, useCreatePago, useGetAlertasPagos, customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign, AlertCircle, Plus, CheckCircle2, Clock,
  TrendingUp, Download, RefreshCw, X, ChevronDown, ChevronUp, FileText
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format, addMonths } from "date-fns";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { PdfModeModal } from "@/components/PdfModeModal";
import { DateField } from "@/components/ui/date-field";

const METODOS = [
  { value: "zelle", label: "Zelle", campos: ["telefono", "nombre"] },
  { value: "transferencia", label: "Transferencia Bancaria", campos: ["banco", "cuenta", "titular"] },
  { value: "efectivo", label: "Efectivo", campos: [] },
  { value: "stripe", label: "Stripe / Tarjeta", campos: ["referencia"] },
];

const metodoCampos: Record<string, { key: string; label: string; placeholder: string }[]> = {
  zelle: [{ key: "telefono", label: "Teléfono / Email Zelle", placeholder: "+1 (786) 000-0000" }, { key: "nombre", label: "Nombre del titular", placeholder: "Juan Pérez" }],
  transferencia: [{ key: "banco", label: "Banco", placeholder: "Ej: Bank of America" }, { key: "cuenta", label: "Número de cuenta", placeholder: "XXXX-XXXX-XXXX" }, { key: "titular", label: "Titular", placeholder: "Juan Pérez" }],
  efectivo: [],
  stripe: [{ key: "referencia", label: "Referencia / ID transacción", placeholder: "pi_XXXX..." }],
};

function ReceiptDocument({ pago, clienteNombre, printMode = "digital" }: { pago: any; clienteNombre: string; printMode?: "print" | "digital" }) {
  const isPrint = printMode === "print";
  const md = pago.metodoDatos as Record<string, string> | null;

  const C = {
    bg: isPrint ? "#FFFFFF" : "#0A0A0A",
    text: isPrint ? "#1A1A1A" : "#FFFFFF",
    textSec: isPrint ? "#4A4A4A" : "#9CA3AF",
    textMuted: isPrint ? "#6B7280" : "#6B7280",
    accent: "#10B981",
    cardBg: isPrint ? "#F9FAFB" : "#111111",
    cardBorder: isPrint ? "#E5E7EB" : "#1F2937",
    thText: isPrint ? "#1A1A1A" : "#6B7280",
  };

  const receiptNum = `NF-${new Date(pago.fecha + "T12:00:00").getFullYear()}-${String(pago.id).padStart(4, "0")}`;

  return (
    <div
      id="receipt-pdf"
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "40px",
        minWidth: "600px",
        fontSize: "13px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ color: C.accent, fontSize: "20px", fontWeight: 700 }}>NAHOFIT</span>
              <span style={{ color: C.text, fontSize: "20px", fontWeight: 700 }}>.LIFE</span>
            </div>
            <p style={{ color: C.textMuted, fontSize: "11px", margin: "2px 0 0 0" }}>Elaborado por Nahomy</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontWeight: 700, fontSize: "18px", color: C.text, margin: "0 0 2px 0" }}>RECIBO DE PAGO</p>
            <p style={{ color: C.textMuted, fontSize: "12px", margin: 0 }}>#{receiptNum}</p>
          </div>
        </div>
        <div style={{ borderBottom: `2px solid ${C.accent}`, margin: "10px 0" }} />
      </div>

      {/* Client + Date */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "20px" }}>
        <div>
          <p style={{ color: C.textMuted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px 0" }}>Cliente</p>
          <p style={{ fontWeight: 700, fontSize: "16px", margin: "0 0 2px 0" }}>{clienteNombre}</p>
          <span style={{
            display: "inline-block",
            background: pago.estado === "pagado" ? "#10B98118" : "#EF444418",
            color: pago.estado === "pagado" ? "#10B981" : "#EF4444",
            border: `1px solid ${pago.estado === "pagado" ? "#10B98140" : "#EF444440"}`,
            padding: "2px 10px",
            borderRadius: "99px",
            fontSize: "11px",
            fontWeight: 700,
            marginTop: "4px"
          }}>
            {pago.estado.toUpperCase()}
          </span>
        </div>
        <div>
          <p style={{ color: C.textMuted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px 0" }}>Fecha</p>
          <p style={{ fontWeight: 600, fontSize: "15px", margin: 0 }}>
            {new Date(pago.fecha + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Concepto + Monto */}
      <div style={{ border: `1px solid ${C.cardBorder}`, borderRadius: "8px", overflow: "hidden", marginBottom: "20px" }}>
        <div style={{ background: isPrint ? "#F9FAFB" : "#111", padding: "12px 16px", borderBottom: `1px solid ${C.cardBorder}` }}>
          <p style={{ color: C.textMuted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 2px 0" }}>Concepto</p>
          <p style={{ fontWeight: 600, fontSize: "14px", margin: 0, color: C.text }}>{pago.concepto}</p>
        </div>
        <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: C.textMuted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 2px 0" }}>Método de pago</p>
            <p style={{ fontWeight: 600, textTransform: "capitalize", margin: 0 }}>{pago.metodo}</p>
            {md && Object.entries(md).map(([k, v]) => (
              <p key={k} style={{ color: C.textSec, fontSize: "11px", margin: "2px 0 0 0" }}>
                {k === "referencia" ? "Referencia" : k === "telefono" ? "Teléfono" : k}: {v}
              </p>
            ))}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: C.textMuted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px 0" }}>Total pagado</p>
            <p style={{ fontSize: "28px", fontWeight: 800, color: C.accent, margin: 0 }}>
              ${Number(pago.monto).toFixed(2)}
            </p>
          </div>
        </div>
        {pago.proxPago && (
          <div style={{ borderTop: `1px solid ${C.cardBorder}`, padding: "10px 16px", background: isPrint ? "#FAFAFA" : "#0D0D0D" }}>
            <p style={{ color: C.textMuted, fontSize: "11px", margin: 0 }}>
              Próximo pago: <strong style={{ color: C.text }}>
                {new Date(pago.proxPago + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
              </strong>
            </p>
          </div>
        )}
      </div>

      {/* Notas */}
      {pago.notas && (
        <div style={{ border: `1px solid ${C.cardBorder}`, borderRadius: "8px", padding: "14px 16px", marginBottom: "20px" }}>
          <p style={{ color: C.textMuted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px 0" }}>Notas</p>
          <p style={{ color: C.textSec, margin: 0 }}>{pago.notas}</p>
        </div>
      )}

      {/* Firma (solo versión impresión) */}
      {isPrint && (
        <div style={{ display: "flex", gap: "48px", marginBottom: "24px", marginTop: "32px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ borderBottom: `1px solid ${C.text}`, height: "28px", marginBottom: "4px" }} />
            <p style={{ color: C.textMuted, fontSize: "11px", textAlign: "center", margin: 0 }}>Firma coach: _______________</p>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderBottom: `1px solid ${C.text}`, height: "28px", marginBottom: "4px" }} />
            <p style={{ color: C.textMuted, fontSize: "11px", textAlign: "center", margin: 0 }}>Fecha: _______________</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "24px", paddingTop: "12px", borderTop: `1px solid ${C.cardBorder}`, display: "flex", justifyContent: "space-between", color: C.textMuted, fontSize: "10px" }}>
        <span style={{ color: C.accent, fontWeight: 700 }}>NAHOFIT.LIFE</span>
        <span style={{ fontStyle: "italic" }}>"Gracias por confiar en NAHOFIT.LIFE"</span>
        <span>Elaborado por Nahomy</span>
      </div>
    </div>
  );
}

export default function CoachPagos() {
  const [selectedCliente, setSelectedCliente] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [receiptPago, setReceiptPago] = useState<any | null>(null);
  const [receiptPrintMode, setReceiptPrintMode] = useState<"print" | "digital">("digital");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const { exportToPdf, isExporting } = usePdfExport();

  // Form state
  const [formData, setFormData] = useState({
    clienteId: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    monto: "",
    metodo: "transferencia",
    concepto: "Mensualidad Plan",
    estado: "pagado",
    notas: "",
    proxPago: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
    metodoDatos: {} as Record<string, string>,
  });

  const { data: clientes } = useListClientes({ activo: true });
  const { data: alertas } = useGetAlertasPagos();
  const [stats, setStats] = useState<any>(null);

  const clienteIdNum = selectedCliente === "all" ? 0 : parseInt(selectedCliente);
  const [pagos, setPagos] = useState<any[]>([]);
  const [isLoadingPagos, setIsLoadingPagos] = useState(true);

  const refetch = async () => {
    setIsLoadingPagos(true);
    try {
      const data = await customFetch<any[]>(`/api/pagos/${clienteIdNum}`);
      setPagos(Array.isArray(data) ? data : []);
    } catch { setPagos([]); } finally { setIsLoadingPagos(false); }
  };

  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      const s = await customFetch<any>("/api/pagos/stats");
      setStats(s);
    } catch {}
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { refetch(); }, [clienteIdNum]);

  const createMutation = useCreatePago({
    mutation: {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({ clienteId: "", fecha: format(new Date(), "yyyy-MM-dd"), monto: "", metodo: "transferencia", concepto: "Mensualidad Plan", estado: "pagado", notas: "", proxPago: format(addMonths(new Date(), 1), "yyyy-MM-dd"), metodoDatos: {} });
        refetch();
        fetchStats();
        toast({ title: "Pago registrado exitosamente" });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error al registrar", description: err.message });
      }
    }
  });

  const handleSubmit = () => {
    if (!formData.clienteId || !formData.monto || !formData.fecha) {
      toast({ variant: "destructive", title: "Completa todos los campos obligatorios" });
      return;
    }
    createMutation.mutate({
      data: {
        clienteId: parseInt(formData.clienteId),
        fecha: formData.fecha,
        monto: parseFloat(formData.monto),
        metodo: formData.metodo as any,
        metodoDatos: Object.keys(formData.metodoDatos).length > 0 ? formData.metodoDatos : undefined,
        concepto: formData.concepto,
        estado: formData.estado as any,
        notas: formData.notas || undefined,
        proxPago: formData.proxPago || undefined,
      } as any
    });
  };

  const markPaid = async (pagoId: number) => {
    await customFetch(`/api/pagos/${pagoId}/estado`, { method: "PATCH", body: JSON.stringify({ estado: "pagado" }) });
    refetch();
    fetchStats();
    toast({ title: "Pago marcado como pagado" });
  };

  const toggleRow = (id: number) => setExpandedRows(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const metodoActual = METODOS.find(m => m.value === formData.metodo);
  const camposActuales = metodoCampos[formData.metodo] || [];

  const estadoBadge = (estado: string) => {
    if (estado === "pagado") return "bg-primary/15 text-primary border-primary/30";
    if (estado === "pendiente") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/15 text-red-400 border-red-500/30";
  };

  const monthlyKeys = stats?.mensual ? Object.keys(stats.mensual).sort() : [];
  const maxMonthly = monthlyKeys.length > 0 ? Math.max(...monthlyKeys.map(k => stats.mensual[k]), 1) : 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white">Gestión de Pagos</h1>
          <p className="text-muted-foreground">Control de mensualidades, recibos y estado de cuenta</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Registrar Pago
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Ingresado este mes", value: `$${(stats?.totalMes || 0).toFixed(0)}`, icon: DollarSign, color: "text-primary" },
          { label: "Ingresado este año", value: `$${(stats?.totalAnio || 0).toFixed(0)}`, icon: TrendingUp, color: "text-blue-400" },
          { label: "Pendientes", value: stats?.pendientes ?? "—", icon: Clock, color: "text-yellow-400" },
          { label: "Vencidos", value: stats?.vencidos ?? "—", icon: AlertCircle, color: "text-red-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-current/10 ${color}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-syne font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly income chart */}
      {monthlyKeys.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-syne text-sm text-muted-foreground uppercase tracking-wider">Ingresos últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-end gap-2 h-24">
              {monthlyKeys.map(k => {
                const val = stats.mensual[k];
                const pct = maxMonthly > 0 ? (val / maxMonthly) * 100 : 0;
                const [year, month] = k.split("-");
                const d = new Date(parseInt(year), parseInt(month) - 1, 1);
                return (
                  <div key={k} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-xs text-primary font-medium">{val > 0 ? `$${val.toFixed(0)}` : ""}</span>
                    <div className="w-full relative flex items-end" style={{ height: "60px" }}>
                      <div
                        className="w-full rounded-t bg-primary/70 hover:bg-primary transition-all"
                        style={{ height: `${Math.max(pct, 2)}%`, minHeight: val > 0 ? "4px" : "2px" }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{d.toLocaleDateString("es-ES", { month: "short" })}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue alerts */}
      {alertas && alertas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-syne font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Pagos Vencidos ({alertas.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertas.map((alerta: any) => (
              <Card key={alerta.clienteId} className="bg-card border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-white">{alerta.clienteNombre}</p>
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {alerta.diasVencido} días de retraso
                      </p>
                    </div>
                    <p className="text-lg font-syne font-bold text-white">${alerta.monto}</p>
                  </div>
                  <Button size="sm" className="w-full bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 text-xs"
                    onClick={() => markPaid(alerta.id)}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar como pagado
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Payment history table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
          <CardTitle className="font-syne text-lg">Historial de Pagos</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedCliente} onValueChange={setSelectedCliente}>
              <SelectTrigger className="w-[180px] bg-background/50 h-9 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clientes?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-9 text-muted-foreground hover:text-white" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingPagos ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full bg-border/50" />)}
            </div>
          ) : !pagos || pagos.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No se encontraron registros de pagos.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {pagos.map((pago: any) => {
                const isExpanded = expandedRows.has(pago.id);
                const md = pago.metodoDatos as Record<string, string> | null;
                return (
                  <div key={pago.id}>
                    <div
                      className="flex items-center gap-4 px-5 py-3 hover:bg-white/3 transition-colors cursor-pointer"
                      onClick={() => toggleRow(pago.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm truncate">{pago.clienteNombre || `#${pago.clienteId}`}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground truncate">{pago.concepto}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(pago.fecha + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">· {pago.metodo}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-syne font-bold text-white text-sm">${Number(pago.monto).toFixed(2)}</span>
                        <Badge variant="outline" className={`text-xs ${estadoBadge(pago.estado)}`}>
                          {pago.estado === "pagado" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {pago.estado === "vencido" && <AlertCircle className="w-3 h-3 mr-1" />}
                          {pago.estado === "pendiente" && <Clock className="w-3 h-3 mr-1" />}
                          {pago.estado}
                        </Badge>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-5 pb-4 bg-background/20 border-t border-border/30 space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs">
                          {md && Object.entries(md).map(([k, v]) => (
                            <div key={k}>
                              <p className="text-muted-foreground capitalize">{k}</p>
                              <p className="text-white font-medium">{v}</p>
                            </div>
                          ))}
                          {pago.proxPago && (
                            <div>
                              <p className="text-muted-foreground">Próximo pago</p>
                              <p className="text-white font-medium">{new Date(pago.proxPago + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
                            </div>
                          )}
                          {pago.notas && (
                            <div className="col-span-2 sm:col-span-3">
                              <p className="text-muted-foreground">Notas</p>
                              <p className="text-white">{pago.notas}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          {pago.estado !== "pagado" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                              onClick={() => markPaid(pago.id)}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar pagado
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-white"
                            onClick={() => setReceiptPago(pago)}>
                            <FileText className="w-3 h-3 mr-1" /> Ver recibo
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create payment dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border/50 text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-syne text-xl">Registrar Nuevo Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cliente *</label>
                <Select value={formData.clienteId} onValueChange={v => setFormData(p => ({ ...p, clienteId: v }))}>
                  <SelectTrigger className="bg-background/50 h-9"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {clientes?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fecha *</label>
                <DateField value={formData.fecha} onChange={v => setFormData(p => ({ ...p, fecha: v }))} minYear={2024} maxYear={2030} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Monto ($) *</label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.monto} onChange={e => setFormData(p => ({ ...p, monto: e.target.value }))} className="bg-background/50 h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                <Select value={formData.estado} onValueChange={v => setFormData(p => ({ ...p, estado: v }))}>
                  <SelectTrigger className="bg-background/50 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Concepto</label>
              <Input value={formData.concepto} onChange={e => setFormData(p => ({ ...p, concepto: e.target.value }))} className="bg-background/50 h-9 text-sm" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Método de pago *</label>
              <Select value={formData.metodo} onValueChange={v => setFormData(p => ({ ...p, metodo: v, metodoDatos: {} }))}>
                <SelectTrigger className="bg-background/50 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METODOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Method-specific fields */}
            {camposActuales.length > 0 && (
              <div className="bg-background/30 rounded-lg p-3 space-y-2 border border-border/40">
                <p className="text-xs text-primary font-semibold uppercase tracking-wide">Datos del método</p>
                {camposActuales.map(campo => (
                  <div key={campo.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{campo.label}</label>
                    <Input
                      placeholder={campo.placeholder}
                      value={formData.metodoDatos[campo.key] || ""}
                      onChange={e => setFormData(p => ({ ...p, metodoDatos: { ...p.metodoDatos, [campo.key]: e.target.value } }))}
                      className="bg-background/50 h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Próximo pago</label>
              <DateField value={formData.proxPago} onChange={v => setFormData(p => ({ ...p, proxPago: v }))} minYear={2024} maxYear={2030} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
              <Textarea value={formData.notas} onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))} placeholder="Notas adicionales..." className="bg-background/50 text-sm resize-none h-16" />
            </div>

            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Guardando..." : "Guardar Pago"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Mode Modal */}
      <PdfModeModal
        open={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        isExporting={isExporting}
        onSelect={async (mode) => {
          setReceiptPrintMode(mode);
          setShowPdfModal(false);
          await new Promise(r => setTimeout(r, 80));
          await exportToPdf("receipt-pdf", {
            filename: `recibo-${receiptPago?.id}-${receiptPago?.fecha}`,
            backgroundColor: mode === "print" ? "#FFFFFF" : "#0A0A0A",
          });
        }}
      />

      {/* Receipt dialog */}
      <Dialog open={!!receiptPago} onOpenChange={open => !open && setReceiptPago(null)}>
        <DialogContent className="bg-card border-border/50 max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-syne text-lg">Recibo de Pago</DialogTitle>
              <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => setShowPdfModal(true)}
                disabled={isExporting}>
                {isExporting ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                Descargar PDF
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-auto max-h-[75vh]">
            {receiptPago && (
              <ReceiptDocument
                pago={receiptPago}
                clienteNombre={receiptPago.clienteNombre || `Cliente #${receiptPago.clienteId}`}
                printMode={receiptPrintMode}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
