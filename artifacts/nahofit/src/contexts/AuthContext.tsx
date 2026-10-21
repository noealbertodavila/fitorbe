import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, getGetMeQueryKey, Usuario } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface AuthContextType {
  user: Usuario | null;
  token: string | null;
  login: (token: string, usuario?: Usuario) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nahofit_auth_token");
    }
    return null;
  });

  // User state can be populated immediately from login response
  // (avoiding a round-trip to /api/auth/me after login)
  const [userOverride, setUserOverride] = useState<Usuario | null>(null);

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Only call /api/auth/me when restoring an existing session (page reload)
  // and we don't already have the user from the login response
  const { data: meUser, isLoading: isUserLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token && !userOverride,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError]);

  const login = (newToken: string, usuario?: Usuario) => {
    localStorage.setItem("nahofit_auth_token", newToken);
    setToken(newToken);
    if (usuario) {
      setUserOverride(usuario);
    } else {
      // No user data passed — invalidate cache so useGetMe refetches
      queryClient.invalidateQueries();
    }
  };

  const logout = () => {
    localStorage.removeItem("nahofit_auth_token");
    setToken(null);
    setUserOverride(null);
    queryClient.clear();
    setLocation("/login");
  };

  // Prefer the directly-set user, fall back to API response
  const user = userOverride ?? meUser ?? null;

  // Loading only if we have a token but no user yet (initial session restore)
  const isLoading = !!token && !userOverride && isUserLoading;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
