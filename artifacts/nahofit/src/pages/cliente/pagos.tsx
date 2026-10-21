import { useEffect, useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CheckCircle2, Clock, AlertCircle, Calendar, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function CountdownBadge({ proxPago }: { proxPago: string }) {
  const due = new Date(proxPago + "T12:00:00");
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000);

  if (diff < 0) return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
      <p className="text-red-400 font-bold text-lg">{Math.abs(diff)} días vencido</p>
      <p className="text-xs text-muted-foreground mt-1">Por favor contacta a tu coach</p>
    </div>
  );

  if (diff === 0) return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
      <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
      <p className="text-yellow-400 font-bold text-lg">¡Vence hoy!</p>
      <p className="text-xs text-muted-foreground mt-1">{due.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
    </div>
  );

  const color = diff <= 5 ? "yellow" : diff <= 10 ? "blue" : "primary";
  const colorMap: Record<string, string> = {
    yellow: "bg-yellow-500/10 border-yellow-500/30",
    blue: "bg-blue-500/10 border-blue-500/30",
    primary: "bg-primary/10 border-primary/30",
  };
  const textMap: Record<string, string> = {
    yellow: "text-yellow-400",
    blue: "text-blue-400",
    primary: "text-primary",
  };

  return (
    <div className={`${colorMap[color]} border rounded-xl p-4 text-center`}>
      <Calendar className={`w-8 h-8 ${textMap[color]} mx-auto mb-2`} />
      <p className={`font-bold text-3xl font-syne ${textMap[color]}`}>{diff}</p>
      <p className={`text-sm ${textMap[color]}`}>días para tu próximo pago</p>
      <p className="text-xs text-muted-foreground mt-1">{due.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
    </div>
  );
}

export default function ClientePagos() {
  const { user } = useAuth();
  const [pagos, setPagos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    customFetch<any[]>(`/api/pagos/${user.id}`)
      .then(data => setPagos(Array.isArray(data) ? data : []))
      .catch(() => setPagos([]))
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  const pagado = pagos.filter(p => p.estado === "pagado");
  const pendiente = pagos.filter(p => p.estado === "pendiente");
  const totalPagado = pagado.reduce((s, p) => s + Number(p.monto), 0);

  // Find the most recent payment with proxPago
  const proxPagoDate = pagos
    .filter(p => p.proxPago)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]?.proxPago;

  const estadoBadge = (estado: string) => {
    if (estado === "pagado") return { cls: "bg-primary/15 text-primary border-primary/30", icon: <CheckCircle2 className="w-3 h-3 mr-1" /> };
    if (estado === "pendiente") return { cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: <Clock className="w-3 h-3 mr-1" /> };
    return { cls: "bg-red-500/15 text-red-400 border-red-500/30", icon: <AlertCircle className="w-3 h-3 mr-1" /> };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white">Mis Pagos</h1>
        <p className="text-muted-foreground">Historial de pagos y estado de cuenta</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full bg-border/50 rounded-lg" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Countdown to next payment */}
            {proxPagoDate ? (
              <div className="sm:col-span-1">
                <CountdownBadge proxPago={proxPagoDate} />
              </div>
            ) : (
              <Card className="bg-card border-border/50 sm:col-span-1">
                <CardContent className="p-4 flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-muted-foreground/40" />
                  <div>
                    <p className="text-xs text-muted-foreground">Próximo pago</p>
                    <p className="text-sm font-medium text-white">Sin programar</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-card border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total pagado</p>
                  <p className="text-xl font-syne font-bold text-primary">${totalPagado.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pagos pendientes</p>
                  <p className="text-xl font-syne font-bold text-yellow-400">{pendiente.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment history */}
          <Card className="bg-card border-border/50">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-syne text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Historial de Pagos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pagos.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-5xl mb-4">💳</div>
                  <p className="font-syne font-semibold text-white mb-2">Sin pagos registrados</p>
                  <p className="text-muted-foreground text-sm">Aún no hay pagos en tu historial. Tu coach los registrará aquí.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {pagos.map(pago => {
                    const badge = estadoBadge(pago.estado);
                    const md = pago.metodoDatos as Record<string, string> | null;
                    return (
                      <div key={pago.id} className="px-5 py-4 hover:bg-white/3 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm">{pago.concepto}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(pago.fecha + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                              {pago.metodo && ` · ${pago.metodo.charAt(0).toUpperCase() + pago.metodo.slice(1)}`}
                            </p>
                            {md && Object.entries(md).length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(md).map(([k, v]) => (
                                  <span key={k} className="text-xs text-muted-foreground/70">{k}: <span className="text-white/60">{v}</span></span>
                                ))}
                              </div>
                            )}
                            {pago.proxPago && (
                              <p className="text-xs text-primary/70 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Próximo pago: {new Date(pago.proxPago + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                              </p>
                            )}
                            {pago.notas && <p className="text-xs text-muted-foreground/60 mt-0.5 italic">{pago.notas}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <p className="font-syne font-bold text-white">${Number(pago.monto).toFixed(2)}</p>
                            <Badge variant="outline" className={`text-xs flex items-center ${badge.cls}`}>
                              {badge.icon}
                              <span className="capitalize">{pago.estado}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
