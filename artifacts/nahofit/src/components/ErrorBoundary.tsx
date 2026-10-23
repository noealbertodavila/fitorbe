import { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private _retryTimer?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
    // Auto-retry after 3 seconds (max 3 attempts)
    if (this.state.retryCount < 3) {
      this._retryTimer = setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: undefined,
          retryCount: prev.retryCount + 1,
        }));
      }, 3000);
    }
  }

  componentWillUnmount() {
    if (this._retryTimer) clearTimeout(this._retryTimer);
  }

  handleManualRetry = () => {
    if (this._retryTimer) clearTimeout(this._retryTimer);
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isInline = this.props.inline !== false;
      const autoRetrying = this.state.retryCount < 3;

      if (isInline) {
        return (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4">
              <RefreshCw className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-white font-medium mb-1">No se pudo cargar esta sección</p>
            <p className="text-muted-foreground text-sm mb-4 max-w-xs">
              {autoRetrying ? "Reintentando automáticamente en 3 segundos…" : "No se pudo recuperar automáticamente."}
            </p>
            <button
              onClick={this.handleManualRetry}
              className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar ahora
            </button>
          </div>
        );
      }

      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "#0A0F0D",
            color: "#10B981",
            fontFamily: "sans-serif",
            textAlign: "center",
            padding: "20px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>
              Fitorbe
            </h2>
            <p style={{ color: "#6B9E80", marginBottom: "20px", fontSize: "0.9rem" }}>
              Ocurrió un error al cargar la aplicación.
            </p>
            <button
              onClick={this.handleManualRetry}
              style={{
                background: "#10B981",
                color: "#fff",
                border: "none",
                padding: "10px 24px",
                borderRadius: "6px",
                cursor: "pointer",
                marginRight: "10px",
                fontSize: "0.9rem",
              }}
            >
              Reintentar
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("nahofit_auth_token");
                window.location.href = "/";
              }}
              style={{
                background: "transparent",
                color: "#6B9E80",
                border: "1px solid #1A2E20",
                padding: "10px 24px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
