import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, Camera, ChevronRight, MessageCircle, Bell } from "lucide-react";
import { Link } from "wouter";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useState, useEffect } from "react";
import { customFetch } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { getFechaHoy, getSaludo } from "@/lib/date-mt";
import { useNegocio } from "@/hooks/use-negocio";

export default function ClienteDashboard() {
  const { marca, coachNombre } = useNegocio();
  const { user } = useAuth();
  const fechaHoy = getFechaHoy();
  const { data: dashboard, isLoading } = useQuery({
    queryKey: [`/api/dashboard/cliente/${user?.id}`, fechaHoy],
    queryFn: () => customFetch<any>(`/api/dashboard/cliente/${user!.id}?fecha=${fechaHoy}`),
    enabled: !!user?.id,
  });
  const { cantidad: mensajesNoLeidos } = useUnreadMessages();
  const [fraseDia, setFraseDia] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    customFetch<{ frase: string }>(`/api/frase-motivacional/${user.id}`)
      .then(data => { if (data?.frase) setFraseDia(data.frase); })
      .catch(() => {});
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 bg-border/50 mb-2" />
        <Skeleton className="h-6 w-96 bg-border/50 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full bg-border/50" />)}
        </div>
      </div>
    );
  }

  const sinRutina = !dashboard?.rutinaHoy;
  const sinNutricion = !dashboard?.planComidaHoy;
  const sinPeso = !dashboard?.ultimoPeso;
  const esClienteNuevo = sinRutina && sinNutricion && sinPeso && (dashboard?.rachaCheckin || 0) === 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Greeting */}
      <div>
        <h1 className="text-4xl font-syne font-bold text-white mb-2 tracking-tight">
          {getSaludo(user?.nombre?.split(" ")[0] || "Campeón")} 👋
        </h1>
        {dashboard?.fraseMotivacional ? (
          <p className="text-muted-foreground flex items-center italic">
            <Sparkles className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
            "{dashboard.fraseMotivacional}"
          </p>
        ) : (
          <p className="text-muted-foreground">
            Tu coach está preparando todo para ti. ¡El camino al éxito comienza hoy! 🚀
          </p>
        )}
      </div>

      {/* Frase motivacional del día */}
      {fraseDia && (
        <div style={{ borderLeft: "3px solid #10B981", padding: "10px 16px", marginBottom: "0", background: "#10B98108", borderRadius: "0 8px 8px 0" }}>
          <div style={{ fontSize: "11px", color: "#4B7A5E", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            ✨ Frase del día
          </div>
          <div style={{ fontSize: "14px", color: "#ECFDF5", fontStyle: "italic", lineHeight: "1.5" }}>
            "{fraseDia}"
          </div>
          <div style={{ fontSize: "11px", color: "#10B981", marginTop: "4px" }}>
            — {coachNombre}
          </div>
        </div>
      )}

      {/* Unread messages banner */}
      {mensajesNoLeidos > 0 && (
        <Link href="/cliente/mensajes">
          <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border border-primary/30 rounded-lg cursor-pointer hover:bg-primary/15 transition-colors group">
            <Bell className="w-5 h-5 text-primary animate-pulse flex-shrink-0" />
            <p className="text-sm text-white flex-1">
              Tienes <span className="font-bold text-primary">{mensajesNoLeidos} mensaje{mensajesNoLeidos > 1 ? "s" : ""} nuevo{mensajesNoLeidos > 1 ? "s" : ""}</span> de tu coach
            </p>
            <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Racha */}
        <Card className="bg-card border-border/50 hover-elevate">
          <CardContent className="p-4 sm:p-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-3" style={{ background: "#F97316" + "20" }}>
              🔥
            </div>
            <div className="text-3xl font-syne font-bold text-white leading-none mb-1">
              {dashboard?.rachaCheckin || 0}
            </div>
            <div className="text-xs text-muted-foreground mb-1">Días de racha</div>
            <div className="text-[10px] text-primary">
              {(dashboard?.rachaCheckin || 0) === 0 ? "¡Comienza hoy!" : "¡Sigue así!"}
            </div>
          </CardContent>
        </Card>

        {/* Rutina */}
        <Link href="/cliente/rutina">
          <Card className="bg-card border-border/50 hover-elevate cursor-pointer h-full group transition-all hover:border-primary/30">
            <CardContent className="p-4 sm:p-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-3" style={{ background: "#3B82F6" + "20" }}>
                💪
              </div>
              <div className="text-3xl font-syne font-bold text-white leading-none mb-1">
                {dashboard?.rutinaHoy
                  ? ((dashboard.rutinaHoy as any).ejercicios?.length || "✓")
                  : "—"}
              </div>
              <div className="text-xs text-muted-foreground mb-1">Ejercicios hoy</div>
              <div className="text-[10px] text-primary flex items-center gap-0.5">
                {dashboard?.rutinaHoy ? "Ver rutina" : sinRutina ? "Sin rutina" : "Descanso"} <ChevronRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Nutrición */}
        <Link href="/cliente/nutricion">
          <Card className="bg-card border-border/50 hover-elevate cursor-pointer h-full group transition-all hover:border-primary/30">
            <CardContent className="p-4 sm:p-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-3" style={{ background: "#F59E0B" + "20" }}>
                🥗
              </div>
              <div className="text-3xl font-syne font-bold text-white leading-none mb-1">
                {dashboard?.planComidaHoy
                  ? `${(dashboard.planComidaHoy as any).caloriasTotal || 0}`
                  : "—"}
              </div>
              <div className="text-xs text-muted-foreground mb-1">
                {dashboard?.planComidaHoy ? "Calorías hoy" : "Sin plan"}
              </div>
              <div className="text-[10px] text-primary flex items-center gap-0.5">
                Ver plan <ChevronRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Progreso */}
        <Link href="/cliente/progreso">
          <Card className="bg-card border-border/50 hover-elevate cursor-pointer h-full group transition-all hover:border-primary/30">
            <CardContent className="p-4 sm:p-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-3" style={{ background: "#8B5CF6" + "20" }}>
                📊
              </div>
              <div className="text-3xl font-syne font-bold text-white leading-none mb-1">
                {dashboard?.ultimoPeso ? `${dashboard.ultimoPeso}` : "—"}
              </div>
              <div className="text-xs text-muted-foreground mb-1">
                {dashboard?.ultimoPeso ? "Último peso (kg)" : "Sin registros"}
              </div>
              <div className="text-[10px] text-primary flex items-center gap-0.5">
                {sinPeso ? "Registrar" : "Ver progreso"} <ChevronRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Start — shown to new clients with no data */}
      {esClienteNuevo && (
        <Card className="bg-card border border-primary/20 overflow-hidden">
          <div className="h-1 w-full bg-primary" />
          <CardContent className="p-6">
            <h2 className="font-syne font-bold text-white text-xl mb-1">¡Bienvenida a {marca}! 🌿</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Tu coach está configurando tu plan personalizado. Mientras tanto, puedes hacer estas acciones:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/cliente/progreso">
                <Button className="w-full bg-primary text-white hover:bg-primary/90 gap-2 justify-start">
                  <Camera className="w-4 h-4" />
                  📸 Agregar primer registro
                </Button>
              </Link>
              <Link href="/cliente/mensajes">
                <Button variant="outline" className="w-full border-border/50 text-white hover:border-primary/50 gap-2 justify-start">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  ✉️ Escribir al coach
                </Button>
              </Link>
              <Link href="/cliente/emocional">
                <Button variant="outline" className="w-full border-border/50 text-white hover:border-primary/50 gap-2 justify-start">
                  🧠 Check-in de hoy
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress reminder — for clients with data */}
      {!esClienteNuevo && sinPeso && (
        <Card className="bg-card border border-primary/20">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📸</div>
              <div>
                <p className="font-syne font-semibold text-white">Sin medidas registradas aún</p>
                <p className="text-muted-foreground text-sm">Agrega tu primer registro mensual de progreso</p>
              </div>
            </div>
            <Link href="/cliente/progreso">
              <Button className="bg-primary text-white hover:bg-primary/90 flex-shrink-0 gap-2">
                <Camera className="w-4 h-4" /> Agregar registro
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
