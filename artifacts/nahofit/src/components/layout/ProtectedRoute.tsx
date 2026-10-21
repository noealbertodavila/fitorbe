import { useAuth } from "@/contexts/AuthContext";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "coach" | "cliente")[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-syne animate-pulse tracking-widest uppercase text-sm">
          Cargando
        </p>
      </div>
    );
  }

  if (!user) {
    // Save intended destination
    localStorage.setItem("nahofit_redirect", location);
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    // Redirect to their appropriate dashboard if they try to access wrong route
    if (user.rol === "admin") return <Redirect to="/admin" />;
    if (user.rol === "coach") return <Redirect to="/coach" />;
    return <Redirect to="/cliente" />;
  }

  return <AppLayout>{children}</AppLayout>;
}
