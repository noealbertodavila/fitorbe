import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export type PlanFitorbe = {
  clave: string;
  nombre: string;
  precioMes: number;
  precioAnio: number;
  limiteIa: number;
  maxClientes: number | null;
  actualizadoEn: string;
};
export const CLAVE_PLANES = ["/api/superadmin/planes"];
export const usePlanesFitorbe = () =>
  useQuery<PlanFitorbe[]>({ queryKey: CLAVE_PLANES, queryFn: () => customFetch<PlanFitorbe[]>("/api/superadmin/planes") });
export const dinero = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Superadmin: precios y límites de los planes de Fitorbe. */
export default function AdminPlanes() {
  const { data, isLoading } = usePlanesFitorbe();
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white">Planes y precios</h1>
        <p className="text-muted-foreground">
          Lo que paga cada coach y lo que incluye. Los cambios aplican de inmediato: en los límites de cada coach y en los precios de fitorbe.com.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {isLoading ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-96 bg-border/50" />) : (data ?? []).map((p) => <TarjetaPlan key={p.clave} plan={p} />)}
      </div>
      <p className="text-xs text-muted-foreground">
        Generaciones de IA: cada plan o rutina creada con IA, o un día regenerado, cuenta 1. Durante la prueba gratis todos tienen 20. Máximo de clientes: cuenta solo los activos; si lo dejas vacío, no hay límite.
      </p>
    </div>
  );
}

function TarjetaPlan({ plan }: { plan: PlanFitorbe }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const inicial = () => ({
    nombre: plan.nombre,
    precioMes: String(plan.precioMes),
    precioAnio: String(plan.precioAnio),
    limiteIa: String(plan.limiteIa),
    maxClientes: plan.maxClientes == null ? "" : String(plan.maxClientes),
  });
  const [f, setF] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => setF(inicial()), [plan.actualizadoEn]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambio = JSON.stringify(f) !== JSON.stringify(inicial());
  const pm = Number(f.precioMes);
  const pa = Number(f.precioAnio);
  const ahorro = pm > 0 && pa > 0 ? Math.round((1 - pa / (pm * 12)) * 100) : 0;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await customFetch(`/api/superadmin/planes/${plan.clave}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, maxClientes: f.maxClientes.trim() === "" ? null : f.maxClientes }),
      });
      await qc.invalidateQueries({ queryKey: CLAVE_PLANES });
      void qc.invalidateQueries({ queryKey: ["/api/dashboard/admin"] });
      toast({ title: "Plan guardado", description: f.nombre });
    } catch (err: unknown) {
      toast({ title: "No se pudo guardar", description: (err as { data?: { error?: string } })?.data?.error ?? "Revisa los datos.", variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  }

  const campo = "w-full min-h-[44px] rounded-md border border-border bg-background px-3 text-sm text-white";
  const id = (k: string) => `pl-${plan.clave}-${k}`;
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-5">
        <form onSubmit={guardar} className="space-y-3">
          <div>
            <label htmlFor={id("nombre")} className="block text-xs font-semibold text-muted-foreground mb-1">Nombre del plan</label>
            <input id={id("nombre")} className={campo} value={f.nombre} maxLength={40} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id("mes")} className="block text-xs font-semibold text-muted-foreground mb-1">Precio al mes (USD)</label>
              <input id={id("mes")} type="number" min={0} step="0.01" inputMode="decimal" className={campo} value={f.precioMes} onChange={(e) => setF({ ...f, precioMes: e.target.value })} />
            </div>
            <div>
              <label htmlFor={id("anio")} className="block text-xs font-semibold text-muted-foreground mb-1">Precio al año (USD)</label>
              <input id={id("anio")} type="number" min={0} step="0.01" inputMode="decimal" className={campo} value={f.precioAnio} onChange={(e) => setF({ ...f, precioAnio: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {pa > 0 ? `Al año equivale a ${dinero(Math.round((pa / 12) * 100) / 100)} al mes` : ""}
            {ahorro > 0 ? ` · ahorra ${ahorro} %` : ""}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id("ia")} className="block text-xs font-semibold text-muted-foreground mb-1">Generaciones IA al mes</label>
              <input id={id("ia")} type="number" min={0} step={1} inputMode="numeric" className={campo} value={f.limiteIa} onChange={(e) => setF({ ...f, limiteIa: e.target.value })} />
            </div>
            <div>
              <label htmlFor={id("max")} className="block text-xs font-semibold text-muted-foreground mb-1">Máximo de clientes</label>
              <input id={id("max")} type="number" min={1} step={1} inputMode="numeric" placeholder="Sin límite" className={campo} value={f.maxClientes} onChange={(e) => setF({ ...f, maxClientes: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{Number(f.limiteIa) === 0 ? "Este plan no incluye IA." : `Incluye IA: ${f.limiteIa} generaciones al mes.`}</p>
          <Button type="submit" disabled={!cambio || guardando} className="w-full min-h-[44px] font-bold">{guardando ? "Guardando…" : cambio ? "Guardar cambios" : "Sin cambios"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
