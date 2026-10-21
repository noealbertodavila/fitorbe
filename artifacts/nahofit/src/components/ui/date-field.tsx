import { useState } from "react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface DateFieldProps {
  label?: string;
  value?: string;
  onChange: (v: string) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export function DateField({
  label,
  value,
  onChange,
  minYear = 2020,
  maxYear = 2030,
  className,
}: DateFieldProps) {
  const parse = (s?: string) => {
    if (!s) return { y: "", m: "", d: "" };
    const parts = s.split("T")[0].split("-");
    return { y: parts[0] || "", m: parts[1] || "", d: parts[2] || "" };
  };

  const [p, setP] = useState(() => parse(value));

  const update = (field: "y" | "m" | "d", val: string) => {
    const next = { ...p, [field]: val };
    setP(next);
    if (next.y.length === 4 && next.m && next.d) {
      onChange(`${next.y}-${next.m.padStart(2, "0")}-${next.d.padStart(2, "0")}`);
    }
  };

  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  return (
    <div className={className}>
      {label && (
        <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      )}
      <div className="flex gap-1">
        <Input
          type="number"
          placeholder="Día"
          min={1}
          max={31}
          value={p.d}
          onChange={e => update("d", e.target.value)}
          className="w-[70px] bg-background text-sm h-9 border-border/50 text-center px-1"
        />
        <Select value={p.m} onValueChange={v => update("m", v)}>
          <SelectTrigger className="w-[130px] bg-background h-9 border-border/50 text-sm">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((mes, i) => (
              <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>
                {mes}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder="Año"
          value={p.y}
          onChange={e => update("y", e.target.value)}
          className="w-[100px] bg-background text-sm h-9 border-border/50 text-center px-1"
        />
      </div>
    </div>
  );
}
