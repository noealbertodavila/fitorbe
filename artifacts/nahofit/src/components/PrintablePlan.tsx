import { forwardRef } from "react";
import { useNegocio } from "@/hooks/use-negocio";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface Ingrediente {
  nombre: string;
  gramos: number;
  calorias: number;
  proteinas: number;
  carbos: number;
  grasas: number;
}

interface Comida {
  nombre: string;
  descripcion?: string;
  hora?: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  notas?: string;
  ingredientes?: Ingrediente[];
}

interface Ejercicio {
  nombre: string;
  series?: number;
  repeticiones?: string;
  descanso?: string;
  peso?: string;
  notas?: string;
}

interface DiaRutina {
  diaSemana: number;
  nombre?: string;
  descripcion?: string;
  ejercicios: Ejercicio[];
}

interface DiaNutricion {
  diaSemana: number;
  comidas: Comida[];
  caloriasTotal?: number;
  aprobada?: boolean;
}

interface PrintablePlanProps {
  tipo: "rutina" | "nutricion";
  clienteNombre: string;
  coachNombre?: string;
  semanaInicio: string;
  dias: DiaRutina[] | DiaNutricion[];
  printMode?: "print" | "digital";
}

export const PrintablePlan = forwardRef<HTMLDivElement, PrintablePlanProps>(
  ({ tipo, clienteNombre, coachNombre, semanaInicio, dias, printMode = "digital" }, ref) => {
    const { marca, coachNombre: coachDelNegocio } = useNegocio();
    const isPrint = printMode === "print";
    const fecha = new Date(semanaInicio + "T12:00:00").toLocaleDateString("es-ES", {
      day: "numeric", month: "long", year: "numeric"
    });
    const generado = new Date().toLocaleDateString("es-ES");

    const C = {
      bg: isPrint ? "#FFFFFF" : "#0A0A0A",
      text: isPrint ? "#1A1A1A" : "#FFFFFF",
      textSec: isPrint ? "#4A4A4A" : "#9CA3AF",
      textMuted: isPrint ? "#6B7280" : "#6B7280",
      accent: "#10B981",
      cardBg: isPrint ? "#FFFFFF" : "#111111",
      cardBorder: isPrint ? "#E5E7EB" : "#1F2937",
      dayHeaderBg: isPrint ? "#F9FAFB" : "#10B98115",
      dayHeaderBorder: isPrint ? "#E5E7EB" : "#1F2937",
      tableBorder: isPrint ? "#E5E7EB" : "#1F293730",
      thText: isPrint ? "#1A1A1A" : "#6B7280",
      tdText: isPrint ? "#1A1A1A" : "#E5E7EB",
      macroP: isPrint ? "#1A1A1A" : "#60A5FA",
      macroC: isPrint ? "#4A4A4A" : "#FBBF24",
      macroG: isPrint ? "#6B7280" : "#F87171",
    };

    return (
      <div
        ref={ref}
        id="printable-plan"
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
                <span style={{ color: C.accent, fontSize: "18px", fontWeight: 700, letterSpacing: "0px", fontFamily: "Arial, Helvetica, sans-serif" }}>{marca}</span>
              </div>
              <h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: C.text }}>
                {tipo === "rutina" ? "Plan de Entrenamiento" : "Plan de Nutrición"}
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
              <strong>Semana del:</strong> {fecha}
            </p>
            <p style={{ color: C.textSec, fontSize: "13px", margin: 0 }}>
              <strong>Duración:</strong> 1 semana
            </p>
          </div>
        </div>

        {/* Days */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {DIAS.map((diaName, idx) => {
            if (tipo === "rutina") {
              const dia = (dias as DiaRutina[]).find(d => d.diaSemana === idx);
              if (!dia || dia.ejercicios.length === 0) return null;
              return (
                <div key={idx} style={{ border: `1px solid ${C.cardBorder}`, borderRadius: "8px", overflow: "hidden", background: C.cardBg }}>
                  <div style={{
                    background: C.dayHeaderBg,
                    borderBottom: `1px solid ${C.dayHeaderBorder}`,
                    borderLeft: `4px solid ${C.accent}`,
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <span style={{ background: isPrint ? "#10B98120" : "#10B98120", color: C.accent, borderRadius: "50%", width: "24px", height: "24px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>{idx + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: C.text }}>DÍA {idx + 1} — {diaName.toUpperCase()}</span>
                    {dia.nombre && <span style={{ color: C.accent, fontSize: "12px" }}>| {dia.nombre}</span>}
                    <span style={{ marginLeft: "auto", color: C.textMuted, fontSize: "11px" }}>{dia.ejercicios.length} ejercicios</span>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    {dia.descripcion && <p style={{ color: C.textSec, fontSize: "12px", marginBottom: "10px", marginTop: 0 }}>{dia.descripcion}</p>}
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${C.dayHeaderBorder}`, background: isPrint ? "#F9FAFB" : "transparent" }}>
                          {["EJERCICIO", "SERIES", "REPS", "DESCANSO", "PESO USADO", "NOTAS"].map(h => (
                            <th key={h} style={{
                              textAlign: h === "EJERCICIO" ? "left" : "center",
                              color: C.thText,
                              fontWeight: 700,
                              fontSize: "10px",
                              textTransform: "uppercase",
                              padding: "6px 8px",
                              letterSpacing: "0.5px"
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dia.ejercicios.map((ej, eIdx) => (
                          <tr key={eIdx} style={{
                            borderBottom: `1px solid ${C.tableBorder}`,
                            background: isPrint && eIdx % 2 === 1 ? "#FAFAFA" : "transparent"
                          }}>
                            <td style={{ padding: "7px 8px", fontWeight: 600, color: C.tdText }}>{ej.nombre}</td>
                            <td style={{ padding: "7px 8px", color: C.accent, textAlign: "center", fontWeight: 700 }}>{ej.series || "—"}</td>
                            <td style={{ padding: "7px 8px", color: C.textSec, textAlign: "center" }}>{ej.repeticiones || "—"}</td>
                            <td style={{ padding: "7px 8px", color: C.textSec, textAlign: "center" }}>{ej.descanso || "—"}</td>
                            <td style={{ padding: "7px 8px", color: C.textMuted, textAlign: "center" }}>
                              {isPrint
                                ? <span style={{ borderBottom: `1px solid ${C.cardBorder}`, display: "inline-block", minWidth: "60px" }}>&nbsp;</span>
                                : (ej.peso || "—")
                              }
                            </td>
                            <td style={{ padding: "7px 8px", color: C.textMuted, fontSize: "11px" }}>{ej.notas || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            } else {
              const dia = (dias as DiaNutricion[]).find(d => d.diaSemana === idx);
              if (!dia || dia.comidas.length === 0) return null;
              const totalCal = dia.comidas.reduce((s, c) => s + (c.calorias || 0), 0);
              const totalProt = dia.comidas.reduce((s, c) => s + (c.proteinas || 0), 0);
              const totalCarbs = dia.comidas.reduce((s, c) => s + (c.carbohidratos || 0), 0);
              const totalGrasas = dia.comidas.reduce((s, c) => s + (c.grasas || 0), 0);
              return (
                <div key={idx} style={{ border: `1px solid ${C.cardBorder}`, borderRadius: "8px", overflow: "hidden", background: C.cardBg }}>
                  <div style={{
                    background: C.dayHeaderBg,
                    borderBottom: `1px solid ${C.dayHeaderBorder}`,
                    borderLeft: `4px solid ${C.accent}`,
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }}>
                    <span style={{ background: "#10B98120", color: C.accent, borderRadius: "50%", width: "24px", height: "24px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>{idx + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: C.text }}>DÍA {idx + 1} — {diaName.toUpperCase()}</span>
                    <span style={{ marginLeft: "auto", color: C.accent, fontSize: "13px", fontWeight: 700 }}>{totalCal} kcal</span>
                    <span style={{ color: C.macroP, fontSize: "12px" }}>P:{totalProt}g</span>
                    <span style={{ color: C.macroC, fontSize: "12px" }}>C:{totalCarbs}g</span>
                    <span style={{ color: C.macroG, fontSize: "12px" }}>G:{totalGrasas}g</span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: isPrint ? "#F9FAFB" : "#10B98108", borderBottom: `1px solid ${C.dayHeaderBorder}` }}>
                        {["COMIDA", "DESCRIPCIÓN / INGREDIENTES", "MACROS"].map((h, hi) => (
                          <th key={h} style={{
                            textAlign: "left",
                            color: C.thText,
                            fontWeight: 700,
                            fontSize: "10px",
                            textTransform: "uppercase",
                            padding: "6px 12px",
                            letterSpacing: "0.5px",
                            width: hi === 0 ? "18%" : hi === 2 ? "20%" : "62%"
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dia.comidas.map((comida, cIdx) => (
                        <tr key={cIdx} style={{
                          borderBottom: `1px solid ${C.tableBorder}`,
                          background: isPrint && cIdx % 2 === 1 ? "#FAFAFA" : "transparent",
                          verticalAlign: "top"
                        }}>
                          <td style={{ padding: "8px 12px" }}>
                            <p style={{ fontWeight: 700, color: C.tdText, margin: "0 0 2px 0", fontSize: "12px" }}>{comida.nombre}</p>
                            {comida.hora && <p style={{ color: C.textMuted, fontSize: "11px", margin: 0 }}>{comida.hora}</p>}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {comida.descripcion && <p style={{ color: C.textSec, fontSize: "12px", margin: "0 0 4px 0" }}>{comida.descripcion}</p>}
                            {comida.ingredientes && comida.ingredientes.length > 0 && (
                              <ul style={{ margin: 0, paddingLeft: "14px", listStyle: "disc" }}>
                                {comida.ingredientes.map((ing, iIdx) => (
                                  <li key={iIdx} style={{ color: C.textSec, fontSize: "11px", marginBottom: "1px" }}>
                                    {ing.nombre} — {ing.gramos}g
                                  </li>
                                ))}
                              </ul>
                            )}
                            {comida.notas && <p style={{ color: C.textMuted, fontSize: "11px", margin: "4px 0 0 0", fontStyle: "italic" }}>{comida.notas}</p>}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <p style={{ color: C.accent, fontWeight: 700, fontSize: "13px", margin: "0 0 2px 0" }}>{comida.calorias} kcal</p>
                            <p style={{ color: C.macroP, fontSize: "11px", margin: "1px 0" }}>P: {comida.proteinas}g</p>
                            <p style={{ color: C.macroC, fontSize: "11px", margin: "1px 0" }}>C: {comida.carbohidratos}g</p>
                            <p style={{ color: C.macroG, fontSize: "11px", margin: "1px 0" }}>G: {comida.grasas}g</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: "32px",
          paddingTop: "12px",
          borderTop: `1px solid ${C.cardBorder}`,
          display: "flex",
          justifyContent: "space-between",
          color: C.textMuted,
          fontSize: "10px"
        }}>
          <span style={{ color: C.accent, fontWeight: 700 }}>{marca}</span>
          <span>Elaborado por {coachNombre || coachDelNegocio} · {generado}</span>
          <span style={{ color: C.textMuted }}>Este plan es de uso exclusivo del cliente.</span>
        </div>
      </div>
    );
  }
);

PrintablePlan.displayName = "PrintablePlan";
