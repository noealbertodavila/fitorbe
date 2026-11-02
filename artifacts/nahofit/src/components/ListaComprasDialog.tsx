import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Printer } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { armarListaCompras, cantidadTexto } from "@/lib/lista-compras";

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Lista de compras del plan de comida de una semana: ver, copiar (para WhatsApp) o imprimir / guardar en PDF. */
export function ListaComprasDialog({
  open,
  onClose,
  clienteNombre,
  semanaInicio,
  dias,
}: {
  open: boolean;
  onClose: () => void;
  clienteNombre: string;
  semanaInicio: string;
  dias: Array<{ comidas?: unknown }>;
}) {
  const { toast } = useToast();
  const lista = useMemo(() => armarListaCompras(dias), [dias]);
  const rango = semanaInicio
    ? `${format(parseISO(semanaInicio), "d 'de' MMMM", { locale: es })} al ${format(addDays(parseISO(semanaInicio), 6), "d 'de' MMMM yyyy", { locale: es })}`
    : "";

  function copiar() {
    const lineas = [`Lista de compras — ${clienteNombre}`, `Semana del ${rango}`, ""];
    for (const s of lista.secciones) {
      lineas.push(s.nombre.toUpperCase());
      for (const it of s.items) lineas.push(`☐ ${it.nombre}${cantidadTexto(it) ? " — " + cantidadTexto(it) : ""}`);
      lineas.push("");
    }
    void navigator.clipboard?.writeText(lineas.join("\n").trim());
    toast({ title: "Lista copiada", description: "Pégala en WhatsApp o en tus notas." });
  }

  function imprimir() {
    const w = window.open("", "_blank");
    if (!w) {
      toast({ variant: "destructive", title: "No se abrió la ventana", description: "Permite las ventanas emergentes de fitorbe.com para imprimir." });
      return;
    }
    const secciones = lista.secciones
      .map((s) => `<section><h2>${esc(s.nombre)}</h2><ul>${s.items
        .map((it) => `<li><span class="box"></span><span class="n">${esc(it.nombre)}</span><span class="q">${esc(cantidadTexto(it))}</span></li>`)
        .join("")}</ul></section>`)
      .join("");
    const extra = lista.sinDetalle.length
      ? `<section><h2>Comidas sin ingredientes detallados</h2><ul>${lista.sinDetalle.map((d) => `<li><span class="box"></span><span class="n">${esc(d)}</span></li>`).join("")}</ul></section>`
      : "";
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Lista de compras — ${esc(clienteNombre)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;}
  h1{font-size:22px;margin:0 0 4px} .sub{color:#555;font-size:13px;margin:0 0 20px}
  .cols{columns:2;column-gap:32px} section{break-inside:avoid;margin:0 0 18px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1.5px solid #111;padding-bottom:4px;margin:0 0 6px}
  ul{list-style:none;margin:0;padding:0} li{display:flex;align-items:center;gap:8px;font-size:13px;padding:5px 0;border-bottom:1px dotted #ccc}
  .box{width:12px;height:12px;border:1.5px solid #111;flex:none} .n{flex:1} .q{color:#333;white-space:nowrap}
  .pie{margin-top:16px;font-size:11px;color:#666}
  @media (max-width:600px){.cols{columns:1} body{margin:16px}}
</style></head><body>
<h1>Lista de compras</h1>
<p class="sub">${esc(clienteNombre)} · Semana del ${esc(rango)}</p>
<div class="cols">${secciones}${extra}</div>
<p class="pie">Cantidades aproximadas para 1 persona según el plan de la semana. Hecho con Fitorbe.</p>
</body></html>`);
    w.document.close();
    w.focus();
    // Un momento para que el navegador dibuje la página antes de abrir el diálogo de imprimir.
    setTimeout(() => w.print(), 300);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Lista de compras</DialogTitle>
          <DialogDescription>
            {clienteNombre} · Semana del {rango}. Suma lo que lleva el plan de los 7 días.
          </DialogDescription>
        </DialogHeader>
        {lista.totalItems === 0 && !lista.sinDetalle.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Este plan no tiene ingredientes para armar la lista.</p>
        ) : (
          <div className="space-y-4">
            {lista.secciones.map((s) => (
              <div key={s.nombre}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">{s.nombre}</h3>
                <ul className="divide-y divide-border/40">
                  {s.items.map((it) => (
                    <li key={it.nombre} className="flex justify-between gap-3 py-1.5 text-sm">
                      <span className="text-white">{it.nombre}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{cantidadTexto(it)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {lista.sinDetalle.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Comidas sin ingredientes detallados</h3>
                <ul className="text-sm text-white/80 list-disc pl-5">{lista.sinDetalle.map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Cantidades aproximadas para 1 persona.</p>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 min-h-[44px] gap-2" onClick={copiar} disabled={lista.totalItems === 0}>
            <Copy className="w-4 h-4" /> Copiar
          </Button>
          <Button className="flex-1 min-h-[44px] gap-2" onClick={imprimir} disabled={lista.totalItems === 0 && !lista.sinDetalle.length}>
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
