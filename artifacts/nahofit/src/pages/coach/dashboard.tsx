import { useGetDashboardCoach } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, MessageSquare, AlertCircle, Calendar, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PrimerosPasos } from "@/components/PrimerosPasos";

export default function CoachDashboard() {
  const { data: dashboard, isLoading } = useGetDashboardCoach();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-border/50 mb-2" />
        <Skeleton className="h-4 w-96 bg-border/50 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full bg-border/50" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white mb-2">Inicio</h1>
        <p className="text-muted-foreground">Cómo van tus clientes hoy y quién necesita tu atención</p>
      </div>

      <PrimerosPasos />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border/50 hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Clientes Activos
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-white">
              {dashboard?.totalClientesActivos || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Bajo tu supervisión directa</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Adherencia Promedio
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-white">
              {dashboard?.adherenciaPromedio || 0}%
            </div>
            <div className="w-full bg-border/50 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${dashboard?.adherenciaPromedio || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Mensajes sin leer
            </CardTitle>
            <MessageSquare className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="flex flex-col justify-between">
            <div className="text-4xl font-syne font-bold text-white">
              {dashboard?.mensajesSinLeer || 0}
            </div>
            <Link href="/coach/mensajes" className="text-xs text-primary hover:underline mt-2 inline-block">
              Ver mensajes →
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-red-500/30 hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Alertas Emocionales
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-red-400">
              {dashboard?.clientesConAlertaEmocional || 0}
            </div>
            <Link href="/coach/emocional" className="text-xs text-muted-foreground hover:text-white mt-2 inline-block">
              Requieren atención →
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Pagos Vencidos
            </CardTitle>
            <CreditCard className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-white">
              {dashboard?.clientesConPagoVencido || 0}
            </div>
            <Link href="/coach/pagos" className="text-xs text-muted-foreground hover:text-white mt-2 inline-block">
              Ver estado de cuenta →
            </Link>
          </CardContent>
        </Card>
      </div>

      {dashboard?.clientesSinCheckinHoy && dashboard.clientesSinCheckinHoy.length > 0 && (
        <Card className="bg-card border-orange-500/30 mt-8">
          <CardHeader>
            <CardTitle className="font-syne text-lg flex items-center">
              <Calendar className="w-5 h-5 text-orange-500 mr-2" />
              Sin Check-in Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.clientesSinCheckinHoy.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50">
                  <span className="font-medium text-sm text-white">{c.nombre}</span>
                  <Link href={`/coach/clientes/${c.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 text-xs">Ver Perfil</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
