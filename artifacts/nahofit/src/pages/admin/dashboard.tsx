import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Users, Clock, PauseCircle, ArrowRight } from "lucide-react";

type Resumen = { totalCoaches: number; coachesPorEstado: Record<string, number>; totalClientes: number; clientesActivos: number };

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
      <Link href="/admin/coaches" className="inline-flex items-center gap-2 text-primary font-semibold min-h-[44px]">
        Ver y administrar coaches <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
