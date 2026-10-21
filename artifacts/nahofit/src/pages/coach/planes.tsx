import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Tags } from "lucide-react";

interface PlanPrecio {
  id: number;
  nombre: string;
  precioMensual: number;
  precio3meses: number;
  precio6meses: number;
  descuentoPct: number;
  descripcion: string;
  badge: string | null;
  caracteristicasIncluidas: string[];
  caracteristicasNoIncluidas: string[];
  activo: boolean;
}

function PlanCard({ plan }: { plan: PlanPrecio }) {
  const isPremium = plan.badge === "Más popular";
  const isVip = plan.nombre === "VIP";

  const borderClass = isPremium
    ? "border-2 border-primary shadow-[0_0_20px_rgba(127,255,79,0.15)]"
    : isVip
    ? "border border-yellow-500/30"
    : "border border-border/50";

  return (
    <Card className={`relative bg-card flex flex-col h-full transition-all ${borderClass} ${!plan.activo ? "opacity-50" : ""}`}>
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap ${isPremium ? "bg-primary text-primary-foreground" : isVip ? "bg-yellow-500 text-black" : "bg-muted text-muted-foreground"}`}>
            {isPremium ? "★ " : ""}{plan.badge}
          </span>
        </div>
      )}
      <CardHeader className={`border-b border-border/50 pb-4 ${plan.badge ? "pt-8" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="font-syne text-xl text-white">{plan.nombre}</CardTitle>
          {plan.activo ? (
            <Badge variant="outline" className="border-primary/40 text-primary text-xs">Activo</Badge>
          ) : (
            <Badge variant="outline" className="border-muted text-muted-foreground text-xs">Inactivo</Badge>
          )}
        </div>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-syne font-bold text-primary">${plan.precioMensual}</span>
          <span className="text-muted-foreground text-sm mb-1">/mes</span>
        </div>
        {plan.descripcion && <p className="text-sm text-muted-foreground mt-1">{plan.descripcion}</p>}
      </CardHeader>
      <CardContent className="flex-1 p-5 space-y-5">
        {plan.caracteristicasIncluidas.length > 0 && (
          <ul className="space-y-2">
            {plan.caracteristicasIncluidas.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {plan.caracteristicasNoIncluidas.length > 0 && (
          <ul className="space-y-2 pt-2 border-t border-border/50">
            {plan.caracteristicasNoIncluidas.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm opacity-50">
                <X className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="line-through text-muted-foreground">{b}</span>
              </li>
            ))}
          </ul>
        )}

        {plan.descuentoPct > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Descuentos por pago anticipado</p>
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs text-muted-foreground">3 meses</p>
                <p className="text-sm font-bold text-primary">${plan.precio3meses.toFixed(0)} total</p>
              </div>
              <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">
                {plan.descuentoPct}% OFF
              </Badge>
            </div>
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs text-muted-foreground">6 meses</p>
                <p className="text-sm font-bold text-primary">${plan.precio6meses.toFixed(0)} total</p>
              </div>
              <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">
                {plan.descuentoPct}% OFF
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CoachPlanes() {
  const { data: planes, isLoading } = useQuery<PlanPrecio[]>({
    queryKey: ["/api/planes"],
    queryFn: () => customFetch<PlanPrecio[]>("/api/planes"),
    staleTime: 30_000,
  });

  const activos = (planes || []).filter(p => p.activo);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-syne font-bold text-white mb-2">Planes y Precios</h1>
        <p className="text-muted-foreground">Planes disponibles que ofrece NAHOFIT.LIFE</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[500px] bg-border/50 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-6">
          {activos.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
        </div>
      )}

      <Card className="bg-card border-border/50">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Tags className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">Gestión de planes</p>
              <p className="text-sm text-muted-foreground">Los planes y precios son administrados por el administrador. Para modificar precios, beneficios o descuentos, contacta al administrador del sistema.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
