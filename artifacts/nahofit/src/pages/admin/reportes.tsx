import { useGetReporteAdherencia, useGetReporteIngresos } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { DollarSign, TrendingUp, Users } from "lucide-react";

export default function AdminReportes() {
  const { data: adherencia, isLoading: isLoadingAdh } = useGetReporteAdherencia();
  const { data: ingresos, isLoading: isLoadingIng } = useGetReporteIngresos();

  if (isLoadingAdh || isLoadingIng) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-border/50 mb-2" />
        <Skeleton className="h-4 w-96 bg-border/50 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full bg-border/50" />
          <Skeleton className="h-96 w-full bg-border/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white mb-2">Reportes Globales</h1>
        <p className="text-muted-foreground">Métricas de adherencia e ingresos de NAHOFIT.LIFE</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border/50 hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Ingresos del Mes
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-white">
              ${ingresos?.totalMes?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ingreso total estimado
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Ingresos Anuales
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-white">
              ${ingresos?.totalAnio?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ingreso acumulado del año
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Adherencia Global
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-syne font-bold text-white">
              {adherencia?.adherenciaGlobal || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cumplimiento promedio de planes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="font-syne text-lg">Ingresos Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {ingresos?.porMes && ingresos.porMes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ingresos.porMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A2E20" vertical={false} />
                    <XAxis 
                      dataKey="mes" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `$${value}`}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0F1A14', borderColor: '#1A2E20', color: '#fff' }}
                      itemStyle={{ color: '#10B981' }}
                      formatter={(value: number) => [`$${value}`, "Ingresos"]}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No hay datos suficientes
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="font-syne text-lg">Adherencia Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {adherencia?.porSemana && adherencia.porSemana.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={adherencia.porSemana} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A2E20" vertical={false} />
                    <XAxis 
                      dataKey="semana" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0F1A14', borderColor: '#1A2E20', color: '#fff' }}
                      itemStyle={{ color: '#10B981' }}
                      formatter={(value: number) => [`${value}%`, "Adherencia"]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="adherencia" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "hsl(var(--primary))" }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No hay datos suficientes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
