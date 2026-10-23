import { useAuth } from "@/contexts/AuthContext";
import { useLogin } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.usuario as import("@workspace/api-client-react").Usuario);
        if (data.usuario.rol === "admin") setLocation("/admin");
        else if (data.usuario.rol === "coach") setLocation("/coach");
        else setLocation("/cliente");
      },
      onError: (error) => {
        setErrorMsg(error.data?.error || "Correo o contraseña incorrectos.");
      },
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    setErrorMsg("");
    loginMutation.mutate({ data: values });
  }

  const emailError = form.formState.errors.email?.message;
  const passError = form.formState.errors.password?.message;

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#0A0F0D",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        paddingTop: "48px",
        paddingBottom: "32px",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Glow blobs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "50%", paddingBottom: "50%", borderRadius: "50%", background: "#10B98114", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "50%", paddingBottom: "50%", borderRadius: "50%", background: "#10B98114", filter: "blur(80px)" }} />
      </div>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "32px", position: "relative", zIndex: 1 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 8vw, 44px)", fontWeight: 700, letterSpacing: "-1px", lineHeight: 1 }}>
          <span style={{ color: "#ECFDF5" }}>NAHOFIT</span>
          <span style={{ color: "#10B981" }}>.LIFE</span>
        </div>
        <div style={{ fontSize: "11px", color: "#4B7A5E", letterSpacing: "2px", textTransform: "uppercase", marginTop: "6px" }}>
          Premium Coaching
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          background: "#0F1A14",
          border: "0.5px solid #1A2E20",
          borderRadius: "16px",
          padding: "clamp(20px, 5vw, 32px) clamp(18px, 5vw, 28px)",
          width: "100%",
          maxWidth: "400px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {/* Error banner */}
          {errorMsg && (
            <div style={{
              background: "#EF444415",
              border: "0.5px solid #EF444440",
              color: "#FCA5A5",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "13px",
              marginBottom: "16px",
              lineHeight: "1.4",
            }}>
              {errorMsg}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#4B7A5E", marginBottom: "6px", letterSpacing: "0.3px" }}>
              Correo electrónico
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              style={{
                width: "100%",
                background: "#0A0F0D",
                border: `0.5px solid ${emailError ? "#EF4444" : "#1A2E20"}`,
                borderRadius: "10px",
                padding: "14px 16px",
                color: "#ECFDF5",
                fontSize: "16px",
                outline: "none",
                WebkitAppearance: "none",
                boxSizing: "border-box",
              }}
              {...form.register("email")}
            />
            {emailError && (
              <p style={{ fontSize: "12px", color: "#FCA5A5", marginTop: "4px" }}>{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#4B7A5E", marginBottom: "6px", letterSpacing: "0.3px" }}>
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%",
                  background: "#0A0F0D",
                  border: `0.5px solid ${passError ? "#EF4444" : "#1A2E20"}`,
                  borderRadius: "10px",
                  padding: "14px 46px 14px 16px",
                  color: "#ECFDF5",
                  fontSize: "16px",
                  outline: "none",
                  WebkitAppearance: "none",
                  boxSizing: "border-box",
                }}
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#4B7A5E",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passError && (
              <p style={{ fontSize: "12px", color: "#FCA5A5", marginTop: "4px" }}>{passError}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            style={{
              width: "100%",
              background: loginMutation.isPending ? "#059669" : "#10B981",
              color: "#000",
              border: "none",
              borderRadius: "10px",
              padding: "15px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: loginMutation.isPending ? "not-allowed" : "pointer",
              opacity: loginMutation.isPending ? 0.8 : 1,
              letterSpacing: "1px",
              textTransform: "uppercase" as const,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "background 0.2s, transform 0.1s",
              WebkitAppearance: "none",
              minHeight: "50px",
            }}
          >
            {loginMutation.isPending && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
            {loginMutation.isPending ? "Ingresando..." : "INGRESAR"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: "24px", fontSize: "11px", color: "#2D5240", position: "relative", zIndex: 1 }}>
        Elaborado por Nahomy — NAHOFIT.LIFE
        <span style={{ display: "block", marginTop: 6 }}><a href="/privacidad" style={{ color: "inherit", textDecoration: "underline" }}>Privacidad</a> · <a href="/terminos" style={{ color: "inherit", textDecoration: "underline" }}>Términos</a></span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #2D5240; }
        input:focus { border-color: #10B981 !important; }
        button[type=submit]:active:not(:disabled) { transform: scale(0.98); }
      `}</style>
    </div>
  );
}
