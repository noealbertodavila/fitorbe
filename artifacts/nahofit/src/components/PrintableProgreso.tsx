import { forwardRef } from "react";

interface RegistroProgreso {
  id: number;
  fecha: string;
  pesoKg?: number | null;
  grasaCorporal?: number | null;
  imc?: number | null;
  cuelloCm?: number | null;
  pechoCm?: number | null;
  cinturaCm?: number | null;
  caderaCm?: number | null;
  brazoDerCm?: number | null;
  brazoIzqCm?: number | null;
  musloDerCm?: number | null;
  musloIzqCm?: number | null;
  pantorrillaDerCm?: number | null;
  pantorrillaIzqCm?: number | null;
  masaMuscular?: number | null;
  masaGrasaKg?: number | null;
  aguaCorporal?: number | null;
  fotoFrente?: string | null;
  fotoEspalda?: string | null;
  fotoPerfilIzq?: string | null;
  fotoPerfilDer?: string | null;
  fotoExtra1?: string | null;
  fotoExtra2?: string | null;
  notasCliente?: string | null;
  notasCoach?: string | null;
}

interface PrintableProgresoProps {
  clienteNombre: string;
  coachNombre?: string;
  periodo: string;
  registroActual: RegistroProgreso;
  registroAnterior?: RegistroProgreso | null;
  adherenciaSemanal?: { semana: number; porcentaje: number }[];
  printMode?: "print" | "digital";
}

function Diff({ actual, anterior, unit = "", invert = false }: {
  actual?: number | null;
  anterior?: number | null;
  unit?: string;
  invert?: boolean;
}) {
  if (!actual || !anterior) return null;
  const diff = actual - anterior;
  if (Math.abs(diff) < 0.01) return null;
  const positive = invert ? diff < 0 : diff > 0;
  return (
    <span style={{
      color: positive ? "#10B981" : "#EF4444",
      fontSize: "11px",
      fontWeight: 600,
      marginLeft: "6px"
    }}>
      {diff > 0 ? "+" : ""}{diff.toFixed(1)}{unit}
    </span>
  );
}

function AdherenciaBar({ porcentaje, isPrint }: { porcentaje: number; isPrint: boolean }) {
  const filled = Math.round(porcentaje / 10);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontFamily: "monospace", fontSize: "14px", color: porcentaje >= 80 ? "#10B981" : porcentaje >= 60 ? "#F59E0B" : "#EF4444" }}>
        {"█".repeat(filled)}{"░".repeat(10 - filled)}
      </span>
      <span style={{
        fontWeight: 700,
        fontSize: "13px",
        color: porcentaje >= 80 ? "#10B981" : porcentaje >= 60 ? "#F59E0B" : "#EF4444"
      }}>{porcentaje}%</span>
    </div>
  );
}

export const PrintableProgreso = forwardRef<HTMLDivElement, PrintableProgresoProps>(
  ({ clienteNombre, coachNombre, periodo, registroActual, registroAnterior, adherenciaSemanal, printMode = "digital" }, ref) => {
    const isPrint = printMode === "print";
    const generado = new Date().toLocaleDateString("es-ES");

    const C = {
      bg: isPrint ? "#FFFFFF" : "#0A0A0A",
      text: isPrint ? "#1A1A1A" : "#FFFFFF",
      textSec: isPrint ? "#4A4A4A" : "#9CA3AF",
      textMuted: isPrint ? "#6B7280" : "#6B7280",
      accent: "#10B981",
      cardBg: isPrint ? "#FFFFFF" : "#111111",
      cardBorder: isPrint ? "#E5E7EB" : "#1F2937",
      thBg: isPrint ? "#F9FAFB" : "#10B98108",
      thText: isPrint ? "#1A1A1A" : "#6B7280",
      altRow: isPrint ? "#FAFAFA" : "transparent",
    };

    const medidas = [
      { label: "Peso", actual: registroActual.pesoKg, anterior: registroAnterior?.pesoKg, unit: "kg", invert: true },
      { label: "Grasa corporal", actual: registroActual.grasaCorporal, anterior: registroAnterior?.grasaCorporal, unit: "%", invert: true },
      { label: "IMC", actual: registroActual.imc, anterior: registroAnterior?.imc, unit: "", invert: true },
      { label: "Masa muscular", actual: registroActual.masaMuscular, anterior: registroAnterior?.masaMuscular, unit: "kg", invert: false },
      { label: "Masa grasa", actual: registroActual.masaGrasaKg, anterior: registroAnterior?.masaGrasaKg, unit: "kg", invert: true },
      { label: "Agua corporal", actual: registroActual.aguaCorporal, anterior: registroAnterior?.aguaCorporal, unit: "%", invert: false },
      { label: "Cuello", actual: registroActual.cuelloCm, anterior: registroAnterior?.cuelloCm, unit: "cm", invert: true },
      { label: "Pecho", actual: registroActual.pechoCm, anterior: registroAnterior?.pechoCm, unit: "cm", invert: true },
      { label: "Cintura", actual: registroActual.cinturaCm, anterior: registroAnterior?.cinturaCm, unit: "cm", invert: true },
      { label: "Cadera", actual: registroActual.caderaCm, anterior: registroAnterior?.caderaCm, unit: "cm", invert: true },
      { label: "Brazo der.", actual: registroActual.brazoDerCm, anterior: registroAnterior?.brazoDerCm, unit: "cm", invert: false },
      { label: "Brazo izq.", actual: registroActual.brazoIzqCm, anterior: registroAnterior?.brazoIzqCm, unit: "cm", invert: false },
      { label: "Muslo der.", actual: registroActual.musloDerCm, anterior: registroAnterior?.musloDerCm, unit: "cm", invert: true },
      { label: "Muslo izq.", actual: registroActual.musloIzqCm, anterior: registroAnterior?.musloIzqCm, unit: "cm", invert: true },
      { label: "Pantorrilla der.", actual: registroActual.pantorrillaDerCm, anterior: registroAnterior?.pantorrillaDerCm, unit: "cm", invert: false },
      { label: "Pantorrilla izq.", actual: registroActual.pantorrillaIzqCm, anterior: registroAnterior?.pantorrillaIzqCm, unit: "cm", invert: false },
    ].filter(m => m.actual != null);

    const fotos = [
      { field: "fotoFrente", label: "Frente", src: registroActual.fotoFrente },
      { field: "fotoEspalda", label: "Espalda", src: registroActual.fotoEspalda },
      { field: "fotoPerfilIzq", label: "Perfil Izq.", src: registroActual.fotoPerfilIzq },
      { field: "fotoPerfilDer", label: "Perfil Der.", src: registroActual.fotoPerfilDer },
      { field: "fotoExtra1", label: "Extra 1", src: registroActual.fotoExtra1 },
      { field: "fotoExtra2", label: "Extra 2", src: registroActual.fotoExtra2 },
    ];

    const promedioAdherencia = adherenciaSemanal && adherenciaSemanal.length > 0
      ? Math.round(adherenciaSemanal.reduce((s, w) => s + w.porcentaje, 0) / adherenciaSemanal.length)
      : null;

    return (
      <div
        ref={ref}
        id="printable-progreso"
        style={{
          background: C.bg,
          color: C.text,
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "32px",
          minWidth: "800px",
          fontSize: "13px",
          lineHeight: "1.5",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0px", marginBottom: "6px" }}>
                <span style={{ color: C.accent, fontSize: "18px", fontWeight: 700, fontFamily: "Arial, Helvetica, sans-serif" }}>NAHOFIT</span>
                <span style={{ color: C.text, fontSize: "18px", fontWeight: 700, fontFamily: "Arial, Helvetica, sans-serif" }}>.LIFE</span>
              </div>
              <h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: C.text }}>
                Reporte de Progreso Mensual
              </h1>
            </div>
            <div style={{ textAlign: "right" }}>
              {coachNombre && (
                <p style={{ color: C.textMuted, fontSize: "12px", margin: "0 0 2px 0" }}>Coach: <strong style={{ color: C.textSec }}>{coachNombre}</strong></p>
              )}
              <p style={{ color: C.textMuted, fontSize: "12px", margin: 0 }}>Generado: {generado}</p>
            </div>
          </div>
          <div style={{ borderBottom: `2px solid ${C.accent}`, margin: "8px 0" }} />
          <div style={{ display: "flex", gap: "32px", marginTop: "8px" }}>
            <p style={{ color: C.textSec, fontSize: "13px", margin: 0 }}>
              <strong>Cliente:</strong> {clienteNombre}
            </p>
            <p style={{ color: C.textSec, fontSize: "13px", margin: 0 }}>
              <strong>Período:</strong> {periodo}
            </p>
            <p style={{ color: C.textSec, fontSize: "13px", margin: 0 }}>
              <strong>Fecha de registro:</strong> {new Date(registroActual.fecha + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Medidas */}
        {medidas.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 10px 0", borderLeft: `3px solid ${C.accent}`, paddingLeft: "10px" }}>
              Medidas Corporales
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${C.cardBorder}`, borderRadius: "8px", overflow: "hidden" }}>
              <thead>
                <tr style={{ background: C.thBg }}>
                  <th style={{ textAlign: "left", color: C.thText, fontWeight: 700, fontSize: "11px", textTransform: "uppercase", padding: "8px 12px", letterSpacing: "0.5px" }}>Medida</th>
                  <th style={{ textAlign: "center", color: C.thText, fontWeight: 700, fontSize: "11px", textTransform: "uppercase", padding: "8px 12px", letterSpacing: "0.5px" }}>Mes anterior</th>
                  <th style={{ textAlign: "center", color: C.thText, fontWeight: 700, fontSize: "11px", textTransform: "uppercase", padding: "8px 12px", letterSpacing: "0.5px" }}>Mes actual</th>
                  <th style={{ textAlign: "center", color: C.thText, fontWeight: 700, fontSize: "11px", textTransform: "uppercase", padding: "8px 12px", letterSpacing: "0.5px" }}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {medidas.map((m, i) => {
                  const diff = m.actual != null && m.anterior != null ? m.actual - m.anterior : null;
                  const positive = diff != null ? (m.invert ? diff < 0 : diff > 0) : null;
                  return (
                    <tr key={m.label} style={{ borderTop: `1px solid ${C.cardBorder}`, background: i % 2 === 1 ? C.altRow : "transparent" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: C.text }}>{m.label}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: C.textSec }}>
                        {m.anterior != null ? `${m.anterior}${m.unit}` : "—"}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: C.text }}>
                        {m.actual != null ? `${m.actual}${m.unit}` : "—"}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        {diff != null ? (
                          <span style={{ color: positive ? "#10B981" : Math.abs(diff) < 0.01 ? C.textMuted : "#EF4444", fontWeight: 600 }}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}{m.unit} {positive ? "✓" : ""}
                          </span>
                        ) : <span style={{ color: C.textMuted }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Fotos */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 10px 0", borderLeft: `3px solid ${C.accent}`, paddingLeft: "10px" }}>
            Fotografías de Progreso
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {fotos.map(({ label, src }) => (
              <div key={label} style={{ border: `1px solid ${C.cardBorder}`, borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ background: C.thBg, padding: "6px 10px", borderBottom: `1px solid ${C.cardBorder}` }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "11px", color: C.textSec, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
                </div>
                <div style={{ height: "160px", display: "flex", alignItems: "center", justifyContent: "center", background: isPrint ? "#F9FAFB" : "#0D0D0D" }}>
                  {src ? (
                    <img
                      src={src}
                      alt={label}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "160px",
                        objectFit: "contain",
                        filter: isPrint ? "grayscale(100%)" : "none"
                      }}
                    />
                  ) : (
                    <p style={{ color: C.textMuted, fontSize: "11px", fontStyle: "italic" }}>Sin foto</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {isPrint && (
            <p style={{ color: C.textMuted, fontSize: "10px", marginTop: "6px", fontStyle: "italic" }}>
              * Las fotos se imprimen en escala de grises para ahorrar tinta.
            </p>
          )}
        </div>

        {/* Adherencia */}
        {adherenciaSemanal && adherenciaSemanal.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 10px 0", borderLeft: `3px solid ${C.accent}`, paddingLeft: "10px" }}>
              Adherencia al Plan
            </h2>
            <div style={{ border: `1px solid ${C.cardBorder}`, borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.thBg, borderBottom: `1px solid ${C.cardBorder}` }}>
                    <th style={{ textAlign: "left", color: C.thText, fontWeight: 700, fontSize: "11px", textTransform: "uppercase", padding: "8px 12px" }}>Semana</th>
                    <th style={{ textAlign: "left", color: C.thText, fontWeight: 700, fontSize: "11px", textTransform: "uppercase", padding: "8px 12px" }}>Progreso</th>
                    <th style={{ textAlign: "right", color: C.thText, fontWeight: 700, fontSize: "11px", textTransform: "uppercase", padding: "8px 12px" }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {adherenciaSemanal.map((sem, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.cardBorder}`, background: i % 2 === 1 ? C.altRow : "transparent" }}>
                      <td style={{ padding: "8px 12px", color: C.text, fontWeight: 600 }}>Semana {sem.semana}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <AdherenciaBar porcentaje={sem.porcentaje} isPrint={isPrint} />
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: sem.porcentaje >= 80 ? "#10B981" : sem.porcentaje >= 60 ? "#F59E0B" : "#EF4444" }}>
                        {sem.porcentaje}%
                      </td>
                    </tr>
                  ))}
                  {promedioAdherencia !== null && (
                    <tr style={{ borderTop: `2px solid ${C.accent}`, background: isPrint ? "#F0FDF4" : "#10B98108" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: C.text }}>Promedio del mes</td>
                      <td style={{ padding: "8px 12px" }}>
                        <AdherenciaBar porcentaje={promedioAdherencia} isPrint={isPrint} />
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, fontSize: "16px", color: "#10B981" }}>
                        {promedioAdherencia}%
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={{ border: `1px solid ${C.cardBorder}`, borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ background: C.thBg, padding: "8px 12px", borderBottom: `1px solid ${C.cardBorder}` }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "12px", color: C.text }}>Notas del Coach</p>
            </div>
            <div style={{ padding: "12px", minHeight: "80px" }}>
              <p style={{ color: C.textSec, fontSize: "12px", margin: 0 }}>
                {registroActual.notasCoach || (isPrint ? "" : "Sin notas del coach.")}
              </p>
              {isPrint && !registroActual.notasCoach && (
                <div style={{ height: "60px", borderBottom: `1px solid ${C.cardBorder}`, marginTop: "8px" }} />
              )}
            </div>
          </div>
          <div style={{ border: `1px solid ${C.cardBorder}`, borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ background: C.thBg, padding: "8px 12px", borderBottom: `1px solid ${C.cardBorder}` }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "12px", color: C.text }}>Notas del Cliente</p>
            </div>
            <div style={{ padding: "12px", minHeight: "80px" }}>
              <p style={{ color: C.textSec, fontSize: "12px", margin: 0 }}>
                {registroActual.notasCliente || (isPrint ? "" : "Sin notas del cliente.")}
              </p>
              {isPrint && !registroActual.notasCliente && (
                <div style={{ height: "60px", borderBottom: `1px solid ${C.cardBorder}`, marginTop: "8px" }} />
              )}
            </div>
          </div>
        </div>

        {/* Firma */}
        {isPrint && (
          <div style={{ display: "flex", gap: "40px", marginBottom: "24px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: `1px solid ${C.text}`, marginBottom: "4px", height: "30px" }} />
              <p style={{ color: C.textMuted, fontSize: "11px", textAlign: "center", margin: 0 }}>Firma del Coach · {coachNombre || "Nahomy"}</p>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: `1px solid ${C.text}`, marginBottom: "4px", height: "30px" }} />
              <p style={{ color: C.textMuted, fontSize: "11px", textAlign: "center", margin: 0 }}>Fecha: _________________</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: "24px",
          paddingTop: "12px",
          borderTop: `1px solid ${C.cardBorder}`,
          display: "flex",
          justifyContent: "space-between",
          color: C.textMuted,
          fontSize: "10px"
        }}>
          <span style={{ color: C.accent, fontWeight: 700 }}>NAHOFIT.LIFE</span>
          <span>Elaborado por {coachNombre || "Nahomy"} · {generado}</span>
          <span>Este reporte es confidencial.</span>
        </div>
      </div>
    );
  }
);

PrintableProgreso.displayName = "PrintableProgreso";
