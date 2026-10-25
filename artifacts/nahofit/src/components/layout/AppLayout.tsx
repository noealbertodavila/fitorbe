import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { 
  LogOut, 
  Menu, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar, 
  Dumbbell, 
  Utensils, 
  HeartPulse, 
  MessageSquare, 
  DollarSign, 
  LineChart,
  Tags,
  Inbox,
  Store,
  Briefcase,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AiCoachChat from "@/components/AiCoachChat";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useNegocio } from "@/hooks/use-negocio";
import PausaServicio from "@/components/PausaServicio";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { cantidad: mensajesNoLeidos } = useUnreadMessages();
  const { marca, negocio } = useNegocio();
  const ROL: Record<string, string> = { admin: "Superadmin", coach: "Coach", cliente: "Cliente" };

  useEffect(() => {
    if (mensajesNoLeidos > 0) {
      document.title = `(${mensajesNoLeidos}) Mensaje${mensajesNoLeidos > 1 ? "s" : ""} nuevo${mensajesNoLeidos > 1 ? "s" : ""} — ${marca}`;
    } else {
      document.title = marca;
    }
  }, [mensajesNoLeidos, marca]);

  type Item = { label: string; path: string; icon: any; grupo?: string };
  const adminNav: Item[] = [
    { label: "Inicio", path: "/admin", icon: LayoutDashboard },
    { label: "Coaches", path: "/admin/coaches", icon: Briefcase },
  ];

  // Menú agrupado (como en Obrix): lo del día a día arriba, el negocio abajo.
  const coachNav: Item[] = [
    { label: "Inicio", path: "/coach", icon: LayoutDashboard },
    { label: "Clientes", path: "/coach/clientes", icon: Users },
    { label: "Mensajes", path: "/coach/mensajes", icon: MessageSquare },
    { label: "Rutinas", path: "/coach/rutinas", icon: Dumbbell, grupo: "Planes de tus clientes" },
    { label: "Nutrición", path: "/coach/nutricion", icon: Utensils, grupo: "Planes de tus clientes" },
    { label: "Emocional", path: "/coach/emocional", icon: HeartPulse, grupo: "Planes de tus clientes" },
    { label: "Solicitudes", path: "/coach/solicitudes", icon: Inbox, grupo: "Tu negocio" },
    { label: "Pagos", path: "/coach/pagos", icon: DollarSign, grupo: "Tu negocio" },
    { label: "Reportes", path: "/coach/reportes", icon: LineChart, grupo: "Tu negocio" },
    { label: "Planes y precios", path: "/coach/planes", icon: Tags, grupo: "Tu negocio" },
    { label: "Mi negocio", path: "/coach/negocio", icon: Store, grupo: "Tu negocio" },
  ];

  const clientNav: Item[] = [
    { label: "Inicio", path: "/cliente", icon: LayoutDashboard },
    { label: "Mi rutina", path: "/cliente/rutina", icon: Dumbbell, grupo: "Mi plan" },
    { label: "Mi nutrición", path: "/cliente/nutricion", icon: Utensils, grupo: "Mi plan" },
    { label: "Calendario", path: "/cliente/calendario", icon: Calendar, grupo: "Mi plan" },
    { label: "Mi progreso", path: "/cliente/progreso", icon: LineChart, grupo: "Cómo voy" },
    { label: "Emocional", path: "/cliente/emocional", icon: HeartPulse, grupo: "Cómo voy" },
    { label: "Mensajes", path: "/cliente/mensajes", icon: MessageSquare, grupo: "Mi coach" },
    { label: "Pagos", path: "/cliente/pagos", icon: DollarSign, grupo: "Mi coach" },
  ];

  let navItems: Item[] = [];
  if (user?.rol === "admin") navItems = adminNav;
  else if (user?.rol === "coach") navItems = coachNav;
  else if (user?.rol === "cliente") navItems = clientNav;

  // Prueba gratis del coach: días que le quedan (se muestra abajo del menú).
  const diasPrueba = (() => {
    if (user?.rol !== "coach" || negocio?.estado !== "prueba" || !negocio?.pruebaHasta) return null;
    const fin = new Date(String(negocio.pruebaHasta).slice(0, 10) + "T23:59:59");
    return Math.max(0, Math.ceil((fin.getTime() - Date.now()) / 86400000));
  })();
  const PLAN: Record<string, string> = { inicial: "Plan Inicial", pro: "Plan Pro", estudio: "Plan Estudio" };

  const NavLinks = () => (
    <nav className="flex flex-col mt-6" aria-label="Menú">
      {navItems.map((item, i) => {
        const Icon = item.icon;
        // El inicio de cada panel (/admin, /coach, /cliente) solo se marca cuando estás justo ahí.
        const esInicio = item.path.split("/").length === 2;
        const isActive = location === item.path || (!esInicio && location.startsWith(item.path + "/"));
        const showBadge = item.label === "Mensajes" && mensajesNoLeidos > 0;
        const nuevoGrupo = item.grupo && item.grupo !== navItems[i - 1]?.grupo;
        return (
          <div key={item.path}>
            {nuevoGrupo && (
              <p className="px-4 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{item.grupo}</p>
            )}
            <Link href={item.path}>
              <div
                className={`flex items-center space-x-3 px-4 min-h-[42px] my-0.5 rounded-md transition-all cursor-pointer relative ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r-full" />
                )}
                <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                <span className="flex-1 text-sm">{item.label}</span>
                {showBadge && (
                  <span className="bg-primary text-black text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center leading-none px-1">
                    {mensajesNoLeidos > 9 ? "9+" : mensajesNoLeidos}
                  </span>
                )}
              </div>
            </Link>
          </div>
        );
      })}
    </nav>
  );

  const AvisoPlan = () =>
    user?.rol !== "coach" || !negocio ? null : (
      <Link href="/coach/negocio">
        <div className="mx-1 px-3 py-2.5 rounded-lg border border-primary/25 bg-primary/5 text-xs cursor-pointer hover:border-primary/50" onClick={() => setIsMobileMenuOpen(false)}>
          {diasPrueba !== null ? (
            <>
              <p className="text-white font-semibold">Prueba gratis</p>
              <p className="text-muted-foreground mt-0.5">{diasPrueba === 1 ? "Te queda 1 día" : `Te quedan ${diasPrueba} días`}</p>
            </>
          ) : (
            <p className="text-white font-semibold">{PLAN[negocio.plan ?? ""] ?? "Tu plan"}</p>
          )}
        </div>
      </Link>
    );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/50 bg-card fixed h-full z-10">
        <div className="p-6 border-b border-border/50 flex-shrink-0">
          <h2 className="text-xl font-syne font-bold text-white tracking-tight leading-tight break-words line-clamp-2">
            {negocio?.logo ? (
            <img src={negocio.logo} alt={marca} className="max-h-10 max-w-[180px] object-contain" />
          ) : (
            <span className="block">{marca}</span>
          )}
          </h2>
          {user && (
            <p className="text-xs text-muted-foreground mt-1">
              Panel {ROL[user.rol] ?? user.rol}
            </p>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          <NavLinks />
        </div>
        
        <div className="p-4 border-t border-border/50 flex-shrink-0 space-y-3">
          <AvisoPlan />
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/[0.03]">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-base flex-shrink-0">
              {user?.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user?.nombre}</p>
              <p className="text-[11px] text-muted-foreground/70 truncate leading-tight mt-0.5">{user ? ROL[user.rol] ?? user.rol : ""}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-500/5 gap-2 text-xs"
            onClick={() => logout()}
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0 relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border/50 bg-card sticky top-0 z-20">
          <h2 className="text-xl font-syne font-bold text-white tracking-tight truncate max-w-[70%]">
            {negocio?.logo ? <img src={negocio.logo} alt={marca} className="max-h-8 max-w-[160px] object-contain" /> : marca}
          </h2>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white" aria-label="Abrir menú">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-card border-r-border/50 w-72 p-0 flex flex-col">
              <div className="p-6 border-b border-border/50">
                <h2 className="text-2xl font-syne font-bold text-white tracking-tight truncate">
                  {marca}
                </h2>
                {user && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Panel {ROL[user.rol] ?? user.rol}
                  </p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto py-2 px-3">
                <NavLinks />
              </div>
              <div className="p-4 border-t border-border/50 space-y-3">
                <AvisoPlan />
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-muted-foreground hover:text-white"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
          <div className="max-w-6xl mx-auto pb-16">
            {children}
          </div>
        </main>
        
        {/* Global Footer */}
        <footer className="py-4 px-6 border-t border-border/50 bg-card text-center text-xs text-muted-foreground mt-auto">
          {user?.rol === "admin" ? "Fitorbe" : `${marca} · con Fitorbe`}
        </footer>

        {/* AI Chat (only visible for clients) */}
        {user?.rol === "cliente" && <AiCoachChat />}
        <PausaServicio />
      </div>
    </div>
  );
}
