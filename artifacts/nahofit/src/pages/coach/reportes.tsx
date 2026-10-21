import { useState } from "react";
import { useListClientes, useGetReporteAdherencia, useGetReporteIngresos } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { FileText, TrendingUp, DollarSign } from "lucide-react";

export default function CoachReportes() {
  const [selectedCliente, setSelectedCliente] = useState<string>("all");
  const { data: clientes } = useListClientes({ activo: true });
  
  // Note: In a real app, these endpoints might accept clienteId. For now we use the global ones
  // or a specific hook if it existed. Using global ones for illustration of charts.
  const { data: adherencia, isLoading: isLoadingAdh } = useGetReporteAdherencia();
  const { data: ingresos, isLoading: isLoadingIng } = useGetReporteIngresos();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white">Reportes y Analíticas</h1>
        <p className="text-muted-foreground">Métricas de adherencia e ingresos</p>
      </div>

      <div className="flex items-center space-x-4">
        <Select value={selectedCliente} onValueChange={setSelectedCliente}>
          <SelectTrigger className="bg-card border-border/50 w-[300px]">
            <SelectValue placeholder="Todos los clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {clientes?.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(isLoadingAdh || isLoadingIng) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full bg-border/50" />
          <Skeleton className="h-[400px] w-full bg-border/50" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-syne text-lg flex items-center">
                <TrendingUp className="w-5 h-5 text-primary mr-2" />
                Adherencia Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                {adherencia?.porSemana && adherencia.porSemana.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={adherencia.porSemana} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A2E20" vertical={false} />
                      <XAxis dataKey="semana" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0F1A14', borderColor: '#1A2E20', color: '#fff' }}
                        itemStyle={{ color: '#10B981' }}
                      />
                      <Line type="monotone" dataKey="adherencia" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Sin datos</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-syne text-lg flex items-center">
                <DollarSign className="w-5 h-5 text-primary mr-2" />
                Ingresos Mensuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                {ingresos?.porMes && ingresos.porMes.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ingresos.porMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A2E20" vertical={false} />
                      <XAxis dataKey="mes" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0F1A14', borderColor: '#1A2E20', color: '#fff' }}
                        itemStyle={{ color: '#10B981' }}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Sin datos</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
