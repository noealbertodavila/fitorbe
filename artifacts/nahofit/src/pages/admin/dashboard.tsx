import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Users, Clock, PauseCircle, ArrowRight, Inbox, Mail, MessageCircle, Check, DollarSign, Sparkles, AlarmClock, UserX } from "lucide-react";

type Interesado = { id: number; nombre: string; email: string | null; telefono: string | null; negocio: string | null; clientes: string | null; plan: string | null; mensaje: string | null; atendido: boolean; creadoEn: string };
const PLAN: Record<string, string> = { inicial: "Inicial", pro: "Pro", estudio: "Estudio", no_se: "Sin decidir" };

/** Coaches que llenaron el formulario de fitorbe.com. */
function Interesados() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<Interesado[]>({ queryKey: ["/api/superadmin/interesados"], queryFn: () => customFetch<Interesado[]>("/api/superadmin/interesados") });
  const pendientes = data.filter((i) => !i.atendido).length;
  async function marcar(i: Interesado) {
    await customFetch(`/api/superadmin/interesados/${i.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ atendido: !i.atendido }) });
    qc.invalidateQueries({ queryKey: ["/api/superadmin/interesados"] });
  }
  const wa = (t: string) => { const d = t.replace(/\D/g, ""); return `https://wa.me/${d.length === 10 ? "1" + d : d}`; };
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-syne font-bold text-white flex items-center gap-2"><Inbox className="w-5 h-5 text-primary" />Coaches interesados</h2>
          <span className="text-sm text-muted-foreground">{pendientes} sin atender · llegan también a tu correo</span>
        </div>
        {isLoading ? <Skeleton className="h-20 w-full bg-border/50" /> : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay. Aquí aparecen los coaches que llenan el formulario de fitorbe.com.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {data.map((i) => (
              <li key={i.id} className={`py-3 flex flex-col sm:flex-row sm:items-start gap-3 ${i.atendido ? "opacity-60" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold">{i.nombre}{i.negocio ? <span className="text-muted-foreground font-normal"> · {i.negocio}</span> : null}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(i.creadoEn).toLocaleDateString("es-US", { day: "numeric", month: "short" })} · Plan: {PLAN[i.plan ?? "no_se"] ?? "—"}{i.clientes ? ` · ${i.clientes} clientes` : ""}
                  </div>
                  {i.mensaje && <p className="text-sm text-foreground/80 mt-1 break-words">{i.mensaje}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {i.email && <a href={`mailto:${i.email}`} className="inline-flex items-center gap-1.5 text-sm px-3 min-h-[40px] rounded-md border border-border/60 text-white"><Mail className="w-4 h-4" />Correo</a>}
                  {i.telefono && <a href={wa(i.telefono)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm px-3 min-h-[40px] rounded-md border border-border/60 text-white"><MessageCircle className="w-4 h-4" />WhatsApp</a>}
                  <button onClick={() => marcar(i)} className="inline-flex items-center gap-1.5 text-sm px-3 min-h-[40px] rounded-md bg-primary/15 text-primary"><Check className="w-4 h-4" />{i.atendido ? "Atendido" : "Marcar atendido"}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

type Resumen = {
  totalCoaches: number;
  coachesPorEstado: Record<string, number>;
  totalClientes: number;
  clientesActivos: number;
  ingresoMensual: number;
  porPlan: { clave: string; nombre: string; activos: number; prueba: number; ingreso: number }[];
  pruebasPorVencer: { usuarioId: number; negocio: string; nombre: string; pruebaHasta: string; vencida: boolean }[];
  inactivos: { usuarioId: number; negocio: string; nombre: string; ultimoAcceso: string | null }[];
  generacionesIaMes: number;
};
const usd = (n: number) => `$${(Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const fechaCorta = (f: string) => new Date(String(f).slice(0, 10) + "T12:00:00").toLocaleDateString("es-US", { day: "numeric", month: "short" });

/** Ingreso, coaches por plan, pruebas por vencer e inactivos. */
function Negocio({ data }: { data: Resumen }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-card border-border/50">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-syne font-bold text-white flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" />Ingreso mensual estimado</h2>
              <p className="text-xs text-muted-foreground">Coaches activos por el precio de su plan (el anual se reparte en 12).</p>
            </div>
            <div className="text-3xl font-bold text-white">{usd(data.ingresoMensual ?? 0)}</div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground text-left"><th className="font-medium py-1">Plan</th><th className="font-medium text-right">Activos</th><th className="font-medium text-right">En prueba</th><th className="font-medium text-right">Al mes</th></tr></thead>
            <tbody className="divide-y divide-border/40">
              {(data.porPlan ?? []).map((p) => (
                <tr key={p.clave}><td className="py-2 text-white">{p.nombre}</td><td className="text-right text-white">{p.activos}</td><td className="text-right text-muted-foreground">{p.prueba}</td><td className="text-right text-white">{usd(p.ingreso)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" />{data.generacionesIaMes ?? 0} generaciones con IA este mes en toda la plataforma.</p>
        </CardContent>
      </Card>
      <Card className="bg-card border-border/50">
        <CardContent className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-syne font-bold text-white flex items-center gap-2"><AlarmClock className="w-5 h-5 text-amber-400" />Pruebas que vencen esta semana</h2>
            {(data.pruebasPorVencer ?? []).length === 0 ? <p className="text-sm text-muted-foreground mt-2">Ninguna.</p> : (
              <ul className="mt-2 space-y-1 text-sm">
                {data.pruebasPorVencer.map((c) => (
                  <li key={c.usuarioId} className="flex justify-between gap-3"><span className="text-white truncate">{c.negocio} <span className="text-muted-foreground">· {c.nombre}</span></span><span className={c.vencida ? "text-red-400 shrink-0" : "text-amber-400 shrink-0"}>{c.vencida ? "venció " : "vence "}{fechaCorta(c.pruebaHasta)}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="text-lg font-syne font-bold text-white flex items-center gap-2"><UserX className="w-5 h-5 text-muted-foreground" />Sin entrar hace más de 14 días</h2>
            {(data.inactivos ?? []).length === 0 ? <p className="text-sm text-muted-foreground mt-2">Todos han entrado hace poco.</p> : (
              <ul className="mt-2 space-y-1 text-sm">
                {data.inactivos.map((c) => (
                  <li key={c.usuarioId} className="flex justify-between gap-3"><span className="text-white truncate">{c.negocio} <span className="text-muted-foreground">· {c.nombre}</span></span><span className="text-muted-foreground shrink-0">{c.ultimoAcceso ? `última vez ${fechaCorta(c.ultimoAcceso)}` : "sin registro"}</span></li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground mt-2">Un buen momento para escribirles antes de que cancelen.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Panel del superadmin de Fitorbe: totales de la plataforma, sin datos privados de clientes. */
export default function AdminDashboard() {
  const { data, isLoading } = useQuery<Resumen>({ queryKey: ["/api/dashboard/admin"], queryFn: () => customFetch<Resumen>("/api/dashboard/admin") });
  const tarjetas = [
    { t: "Coaches", v: data?.totalCoaches, icon: Briefcase, sub: `${data?.coachesPorEstado?.activo ?? 0} activos` },
    { t: "En prueba gratis", v: data?.coachesPorEstado?.prueba ?? 0, icon: Clock, sub: "14 días" },
    { t: "Suspendidos", v: data?.coachesPorEstado?.suspendido ?? 0, icon: PauseCircle, sub: "sin acceso" },
    { t: "Clientes de los coaches", v: data?.totalClientes, icon: Users, sub: `${data?.clientesActivos ?? 0} activos` },
  ];
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white">Panel de Fitorbe</h1>
        <p className="text-muted-foreground">Los coaches que usan la plataforma. Los datos de sus clientes son privados de cada coach.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tarjetas.map(({ t, v, icon: Icon, sub }) => (
          <Card key={t} className="bg-card border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-muted-foreground text-sm">{t}<Icon className="w-5 h-5 text-primary" /></div>
              {isLoading ? <Skeleton className="h-9 w-16 mt-3 bg-border/50" /> : <div className="text-3xl font-bold text-white mt-2">{v ?? 0}</div>}
              <div className="text-xs text-muted-foreground mt-1">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {data && <Negocio data={data} />}
      <div className="flex flex-wrap gap-x-6">
        <Link href="/admin/coaches" className="inline-flex items-center gap-2 text-primary font-semibold min-h-[44px]">
          Ver y administrar coaches <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/admin/planes" className="inline-flex items-center gap-2 text-primary font-semibold min-h-[44px]">
          Planes y precios <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <Interesados />
    </div>
  );
}
