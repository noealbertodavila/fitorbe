import { useGetDashboardAdmin } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, DollarSign, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: dashboard, isLoading } = useGetDashboardAdmin();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2 bg-border/50" />
          <Skeleton className="h-4 w-96 bg-border/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full bg-border/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white mb-2">Panel de Administración</h1>
        <p className="text-muted-foreground">Resumen global de la plataforma NAHOFIT.LIFE</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border/50 hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Clientes
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-white">{dashboard?.totalClientes || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-primary font-medium">{dashboard?.clientesActivosMes || 0}</span> activos este mes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Coaches
            </CardTitle>
            <Activity className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-white">{dashboard?.totalCoaches || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">Personal activo en plataforma</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Ingresos (Mes)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-white">
              ${(dashboard?.ingresosMes || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Ingreso bruto estimado</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Adherencia Global
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-white">{dashboard?.adherenciaGlobal || 0}%</div>
            <div className="w-full bg-border/50 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${dashboard?.adherenciaGlobal || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
