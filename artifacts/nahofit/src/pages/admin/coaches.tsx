import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, History, StickyNote } from "lucide-react";
import { usePlanesFitorbe, dinero, type PlanFitorbe } from "./planes";

type Coach = {
  usuarioId: number;
  nombre: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  creadoEn: string;
  negocio: string;
  slug: string;
  estado: "prueba" | "activo" | "suspendido";
  plan: string;
  pruebaHasta: string | null;
  notasAdmin: string | null;
  periodo: "mes" | "anio";
  ultimoAcceso: string | null;
  clientes: number;
  clientesActivos: number;
  iaMes: number;
};
type Historial = { id: number; texto: string; autor: string | null; creadoEn: string };

const ESTADO: Record<string, { t: string; c: string }> = {
  prueba: { t: "Prueba", c: "border-amber-500/50 text-amber-400" },
  activo: { t: "Activo", c: "border-primary/50 text-primary" },
  suspendido: { t: "Suspendido", c: "border-red-500/50 text-red-400" },
};
const etiquetaPlan = (p: PlanFitorbe) => `${p.nombre} · ${dinero(p.precioMes)}/mes · ${p.limiteIa ? `IA ${p.limiteIa}/mes` : "sin IA"} · ${p.maxClientes ?? "∞"} clientes`;
/** "hoy", "hace 3 días"… */
function haceCuanto(f: string | null) {
  if (!f) return "nunca";
  const d = Math.floor((Date.now() - new Date(f).getTime()) / 86400000);
  return d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`;
}
const hoy = () => new Date().toISOString().slice(0, 10);
const masDias = (n: number, desde?: string | null) => {
  const base = desde && desde > hoy() ? new Date(desde + "T12:00:00") : new Date();
  base.setDate(base.getDate() + n);
  return base.toISOString().slice(0, 10);
};

/** Superadmin: lista de coaches, alta y cambio de estado. */
export default function AdminCoaches() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<Coach[]>({ queryKey: ["/api/superadmin/coaches"], queryFn: () => customFetch<Coach[]>("/api/superadmin/coaches") });
  const [buscar, setBuscar] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const { data: planes = [] } = usePlanesFitorbe();

  async function cambiar(c: Coach, cambios: Record<string, unknown>, aviso: string) {
    try {
      await customFetch(`/api/superadmin/coaches/${c.usuarioId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambios) });
      await qc.invalidateQueries({ queryKey: ["/api/superadmin/coaches"] });
      void qc.invalidateQueries({ queryKey: ["/api/dashboard/admin"] });
      toast({ title: aviso, description: c.negocio });
    } catch (err: unknown) {
      toast({ title: "No se pudo cambiar", description: (err as { data?: { error?: string } })?.data?.error ?? "Intenta de nuevo.", variant: "destructive" });
    }
  }

  const lista = (data ?? []).filter((c) => !buscar || `${c.nombre} ${c.email} ${c.negocio}`.toLowerCase().includes(buscar.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white">Coaches</h1>
          <p className="text-muted-foreground">Cada coach con su negocio, su estado y cuántos clientes lleva.</p>
        </div>
        <Button onClick={() => setNuevo(true)} className="min-h-[44px] gap-2 font-bold"><Plus className="w-4 h-4" /> Nuevo coach</Button>
      </div>
      <div className="flex items-center gap-2 bg-card border border-border/50 p-2 rounded-md w-full max-w-md">
        <Search className="h-5 w-5 text-muted-foreground ml-2" aria-hidden="true" />
        <label htmlFor="buscar-coach" className="sr-only">Buscar coach</label>
        <input id="buscar-coach" placeholder="Buscar por nombre, correo o negocio…" className="flex-1 bg-transparent min-h-[40px] text-sm text-white outline-none" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 bg-border/50" />)
          : lista.length === 0
            ? <p className="text-muted-foreground">Todavía no hay coaches.</p>
            : lista.map((c) => {
                const vencida = c.estado === "prueba" && !!c.pruebaHasta && c.pruebaHasta < hoy();
                return (
                  <Card key={c.usuarioId} className="bg-card border-border/50">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-bold text-white text-lg truncate">{c.negocio}</h2>
                          <p className="text-sm text-muted-foreground truncate">{c.nombre} · {c.email}</p>
                          {c.telefono && <p className="text-xs text-muted-foreground">{c.telefono}</p>}
                        </div>
                        <Badge variant="outline" className={ESTADO[c.estado]?.c}>{vencida ? "Prueba vencida" : ESTADO[c.estado]?.t ?? c.estado}</Badge>
                      </div>
                      {(() => {
                        const plan = planes.find((p) => p.clave === (c.plan || "inicial").toLowerCase());
                        const limIa = c.estado === "prueba" ? 20 : plan?.limiteIa ?? 0;
                        const lleno = plan?.maxClientes != null && c.clientesActivos >= plan.maxClientes;
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
                            <div className="rounded-lg bg-background p-2">
                              <div className="text-xs text-muted-foreground">Clientes activos</div>
                              <div className={`font-bold ${lleno ? "text-amber-400" : "text-white"}`}>{c.clientesActivos}{plan?.maxClientes != null ? ` / ${plan.maxClientes}` : ""}</div>
                            </div>
                            <div className="rounded-lg bg-background p-2">
                              <div className="text-xs text-muted-foreground">IA este mes</div>
                              <div className={`font-bold ${limIa && c.iaMes >= limIa * 0.8 ? "text-amber-400" : "text-white"}`}>{limIa ? `${c.iaMes} / ${limIa}` : "Sin IA"}</div>
                            </div>
                            <div className="rounded-lg bg-background p-2">
                              <div className="text-xs text-muted-foreground">Último acceso</div>
                              <div className="font-bold text-white text-xs mt-1">{haceCuanto(c.ultimoAcceso)}</div>
                            </div>
                            <div className="rounded-lg bg-background p-2">
                              <div className="text-xs text-muted-foreground">{c.estado === "prueba" ? "Prueba hasta" : "Paga"}</div>
                              <div className="font-bold text-white text-xs mt-1">
                                {c.estado === "prueba" ? c.pruebaHasta ?? "—" : plan ? (c.periodo === "anio" ? `${dinero(plan.precioAnio)}/año` : `${dinero(plan.precioMes)}/mes`) : "—"}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                        <div className="flex items-center gap-2">
                          <label htmlFor={`plan-${c.usuarioId}`} className="text-xs font-semibold text-muted-foreground">Plan</label>
                          <select id={`plan-${c.usuarioId}`} className="flex-1 min-w-0 min-h-[40px] rounded-md border border-border bg-background px-2 text-sm text-white"
                            value={(c.plan || "inicial").toLowerCase()}
                            onChange={(e) => cambiar(c, { plan: e.target.value }, `Plan cambiado a ${planes.find((p) => p.clave === e.target.value)?.nombre ?? e.target.value}`)}>
                            {planes.map((p) => <option key={p.clave} value={p.clave}>{etiquetaPlan(p)}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label htmlFor={`periodo-${c.usuarioId}`} className="text-xs font-semibold text-muted-foreground">Pago</label>
                          <select id={`periodo-${c.usuarioId}`} className="min-h-[40px] rounded-md border border-border bg-background px-2 text-sm text-white"
                            value={c.periodo ?? "mes"}
                            onChange={(e) => cambiar(c, { periodo: e.target.value }, e.target.value === "anio" ? "Pago anual" : "Pago mensual")}>
                            <option value="mes">Mensual</option>
                            <option value="anio">Anual</option>
                          </select>
                        </div>
                      </div>
                      <NotasEHistorial coach={c} onGuardar={(t) => cambiar(c, { notasAdmin: t }, "Notas guardadas")} />
                      <div className="flex flex-wrap gap-2">
                        {c.estado !== "activo" && <Button size="sm" className="min-h-[40px]" onClick={() => cambiar(c, { estado: "activo" }, "Coach activado")}>Activar</Button>}
                        {c.estado === "prueba" && <Button size="sm" variant="outline" className="min-h-[40px]" onClick={() => cambiar(c, { pruebaHasta: masDias(14, c.pruebaHasta) }, "Prueba extendida 14 días")}>+14 días de prueba</Button>}
                        {c.estado !== "suspendido" && (
                          <Button size="sm" variant="outline" className="min-h-[40px] text-red-400 border-red-500/40"
                            onClick={() => window.confirm(`¿Suspender a ${c.negocio}? Él y sus clientes no podrán usar la app hasta que lo actives.`) && cambiar(c, { estado: "suspendido" }, "Coach suspendido")}>
                            Suspender
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
      </div>
      <NuevoCoach abierto={nuevo} onClose={() => setNuevo(false)} />
    </div>
  );
}

function NuevoCoach({ abierto, onClose }: { abierto: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const vacio = { nombre: "", email: "", negocio: "", telefono: "", password: "", estado: "activo", plan: "pro", periodo: "mes" };
  const { data: planes = [] } = usePlanesFitorbe();
  const [f, setF] = useState(vacio);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await customFetch("/api/superadmin/coaches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      await qc.invalidateQueries({ queryKey: ["/api/superadmin/coaches"] });
      toast({ title: "Coach creado", description: `${f.negocio || f.nombre} ya puede entrar con su correo y contraseña.` });
      setF(vacio);
      onClose();
    } catch (err: unknown) {
      setError((err as { data?: { error?: string } })?.data?.error ?? "No se pudo crear. Revisa los datos.");
    } finally {
      setGuardando(false);
    }
  }
  const campo = "w-full min-h-[44px] rounded-md border border-border bg-background px-3 text-sm text-white";
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Nuevo coach</DialogTitle>
          <DialogDescription>Le creas su cuenta. Lo normal es que el coach se registre solo en la página de Fitorbe.</DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="space-y-3">
          {([
            ["nombre", "Nombre del coach", "text", true],
            ["negocio", "Nombre del negocio (lo ven sus clientes)", "text", false],
            ["email", "Correo", "email", true],
            ["telefono", "Teléfono (opcional)", "tel", false],
            ["password", "Contraseña inicial (mínimo 8)", "text", true],
          ] as const).map(([k, l, t, req]) => (
            <div key={k}>
              <label htmlFor={`co-${k}`} className="block text-xs font-semibold text-muted-foreground mb-1">{l}</label>
              <input id={`co-${k}`} type={t} required={req} minLength={k === "password" ? 8 : undefined} className={campo} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
          <div>
            <label htmlFor="co-estado" className="block text-xs font-semibold text-muted-foreground mb-1">Empieza como</label>
            <select id="co-estado" className={campo} value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
              <option value="activo">Activo</option>
              <option value="prueba">Prueba gratis de 14 días</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="co-plan" className="block text-xs font-semibold text-muted-foreground mb-1">Plan</label>
              <select id="co-plan" className={campo} value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })}>
                {planes.map((p) => <option key={p.clave} value={p.clave}>{p.nombre} · {dinero(p.precioMes)}/mes</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="co-periodo" className="block text-xs font-semibold text-muted-foreground mb-1">Pago</label>
              <select id="co-periodo" className={campo} value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value })}>
                <option value="mes">Mensual</option>
                <option value="anio">Anual</option>
              </select>
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={guardando} className="w-full min-h-[44px] font-bold">{guardando ? "Creando…" : "Crear coach"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Notas privadas del superadmin sobre el coach y su historial de cambios. */
function NotasEHistorial({ coach, onGuardar }: { coach: Coach; onGuardar: (t: string) => Promise<void> }) {
  const [abierto, setAbierto] = useState<"" | "notas" | "historial">("");
  const [texto, setTexto] = useState(coach.notasAdmin ?? "");
  const [guardando, setGuardando] = useState(false);
  const { data: historial = [], isLoading } = useQuery<Historial[]>({
    queryKey: ["/api/superadmin/coaches", coach.usuarioId, "historial"],
    queryFn: () => customFetch<Historial[]>(`/api/superadmin/coaches/${coach.usuarioId}/historial`),
    enabled: abierto === "historial",
  });
  const boton = (k: "notas" | "historial", Icono: typeof History, t: string) => (
    <button type="button" onClick={() => setAbierto(abierto === k ? "" : k)} aria-expanded={abierto === k}
      className={`inline-flex items-center gap-1.5 text-sm px-3 min-h-[40px] rounded-md border ${abierto === k ? "border-primary/60 text-primary" : "border-border/60 text-muted-foreground hover:text-white"}`}>
      <Icono className="w-4 h-4" />{t}
    </button>
  );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {boton("notas", StickyNote, coach.notasAdmin ? "Notas ●" : "Notas")}
        {boton("historial", History, "Historial")}
      </div>
      {abierto === "notas" && (
        <div className="space-y-2">
          <label htmlFor={`notas-${coach.usuarioId}`} className="sr-only">Notas sobre {coach.negocio}</label>
          <textarea id={`notas-${coach.usuarioId}`} rows={3} maxLength={2000} value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder="Solo las ves tú. Ej.: pagó por Zelle el 1 de cada mes, quiere pasar a Estudio en enero…"
            className="w-full rounded-md border border-border bg-background p-3 text-sm text-white" />
          <Button size="sm" className="min-h-[40px]" disabled={guardando || texto === (coach.notasAdmin ?? "")}
            onClick={async () => { setGuardando(true); await onGuardar(texto); setGuardando(false); }}>
            {guardando ? "Guardando…" : "Guardar notas"}
          </Button>
        </div>
      )}
      {abierto === "historial" && (
        isLoading ? <Skeleton className="h-16 bg-border/50" /> : historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin cambios registrados todavía. Desde hoy se anotan los cambios de plan, estado, pago y prueba.</p>
        ) : (
          <ul className="text-sm divide-y divide-border/40 max-h-60 overflow-y-auto">
            {historial.map((h) => (
              <li key={h.id} className="py-2 flex gap-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{new Date(h.creadoEn).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "2-digit" })}</span>
                <span className="text-white flex-1">{h.texto}{h.autor ? <span className="text-muted-foreground"> · {h.autor}</span> : null}</span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
