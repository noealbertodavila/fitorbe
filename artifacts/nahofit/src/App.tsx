import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazy(() => import("@/pages/login"));
const Privacidad = lazy(() => import("@/pages/Legal").then((m) => ({ default: m.Privacidad })));
const Terminos = lazy(() => import("@/pages/Legal").then((m) => ({ default: m.Terminos })));
import Landing from "@/pages/Landing";

// Admin
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminUsuarios = lazy(() => import("@/pages/admin/usuarios"));
const AdminReportes = lazy(() => import("@/pages/admin/reportes"));
const AdminPlanes = lazy(() => import("@/pages/admin/planes"));

// Coach
const CoachDashboard = lazy(() => import("@/pages/coach/dashboard"));
const CoachClientes = lazy(() => import("@/pages/coach/clientes"));
const CoachClienteDetalle = lazy(() => import("@/pages/coach/cliente-detalle"));
const CoachRutinas = lazy(() => import("@/pages/coach/rutinas"));
const CoachNutricion = lazy(() => import("@/pages/coach/nutricion"));
const CoachEmocional = lazy(() => import("@/pages/coach/emocional"));
const CoachMensajes = lazy(() => import("@/pages/coach/mensajes"));
const CoachReportes = lazy(() => import("@/pages/coach/reportes"));
const CoachPagos = lazy(() => import("@/pages/coach/pagos"));
const CoachSolicitudes = lazy(() => import("@/pages/coach/solicitudes"));
import { Redirect } from "wouter";

// Cliente
const ClienteDashboard = lazy(() => import("@/pages/cliente/dashboard"));
const ClienteRutina = lazy(() => import("@/pages/cliente/rutina"));
const ClienteNutricion = lazy(() => import("@/pages/cliente/nutricion"));
const ClienteCalendario = lazy(() => import("@/pages/cliente/calendario"));
const ClienteProgreso = lazy(() => import("@/pages/cliente/progreso"));
const ClienteEmocional = lazy(() => import("@/pages/cliente/emocional"));
const ClienteMensajes = lazy(() => import("@/pages/cliente/mensajes"));
const ClientePagos = lazy(() => import("@/pages/cliente/pagos"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/privacidad" component={Privacidad} />
      <Route path="/privacy" component={Privacidad} />
      <Route path="/terminos" component={Terminos} />
      <Route path="/terms" component={Terminos} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/usuarios">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminUsuarios />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reportes">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminReportes />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/planes">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminPlanes />
        </ProtectedRoute>
      </Route>

      {/* Coach Routes */}
      <Route path="/coach">
        <ProtectedRoute allowedRoles={["coach"]}>
          <CoachDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/coach/clientes">
        <ProtectedRoute allowedRoles={["coach"]}>
          <CoachClientes />
        </ProtectedRoute>
      </Route>
      <Route path="/coach/clientes/:id">
        {params => (
          <ProtectedRoute allowedRoles={["coach"]}>
            <CoachClienteDetalle id={parseInt(params.id)} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/coach/rutinas">
        <ProtectedRoute allowedRoles={["coach"]}>
          <CoachRutinas />
        </ProtectedRoute>
      </Route>
      <Route path="/coach/nutricion">
        <ProtectedRoute allowedRoles={["coach"]}>
          <CoachNutricion />
        </ProtectedRoute>
      </Route>
      <Route path="/coach/emocional">
        <ProtectedRoute allowedRoles={["coach"]}>
          <CoachEmocional />
        </ProtectedRoute>
      </Route>
      <Route path="/coach/mensajes">
        <ProtectedRoute allowedRoles={["coach"]}>
          <CoachMensajes />
        </ProtectedRoute>
      </Route>
      <Route path="/coach/reportes">
        <ProtectedRoute allowedRoles={["coach"]}>
          <CoachReportes />
        </ProtectedRoute>
      </Route>
      <Route path="/coach/pagos">
        <ProtectedRoute allowedRoles={["coach"]}>
          <CoachPagos />
        </ProtectedRoute>
      </Route>
      <Route path="/coach/solicitudes">
        <ProtectedRoute allowedRoles={["coach", "admin"]}>
          <CoachSolicitudes />
        </ProtectedRoute>
      </Route>
      <Route path="/coach/planes">
        <Redirect to="/coach" />
      </Route>

      {/* Cliente Routes */}
      <Route path="/cliente">
        <ProtectedRoute allowedRoles={["cliente"]}>
          <ClienteDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/cliente/rutina">
        <ProtectedRoute allowedRoles={["cliente"]}>
          <ClienteRutina />
        </ProtectedRoute>
      </Route>
      <Route path="/cliente/nutricion">
        <ProtectedRoute allowedRoles={["cliente"]}>
          <ClienteNutricion />
        </ProtectedRoute>
      </Route>
      <Route path="/cliente/calendario">
        <ProtectedRoute allowedRoles={["cliente"]}>
          <ClienteCalendario />
        </ProtectedRoute>
      </Route>
      <Route path="/cliente/progreso">
        <ProtectedRoute allowedRoles={["cliente"]}>
          <ClienteProgreso />
        </ProtectedRoute>
      </Route>
      <Route path="/cliente/emocional">
        <ProtectedRoute allowedRoles={["cliente"]}>
          <ClienteEmocional />
        </ProtectedRoute>
      </Route>
      <Route path="/cliente/mensajes">
        <ProtectedRoute allowedRoles={["cliente"]}>
          <ClienteMensajes />
        </ProtectedRoute>
      </Route>
      <Route path="/cliente/pagos">
        <ProtectedRoute allowedRoles={["cliente"]}>
          <ClientePagos />
        </ProtectedRoute>
      </Route>

      {/* Public landing page */}
      <Route path="/" component={Landing} />
      
      {/* Legacy /app redirect */}
      <Route path="/app">
        <ProtectedRoute>
          <div className="p-8 text-center text-muted-foreground">Redirigiendo...</div>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary inline={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <ErrorBoundary inline={false}>
                <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0A0F0D" }} />}>
                  <Router />
                </Suspense>
              </ErrorBoundary>
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
