import { useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Copy } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getSemanaParaPlanear, lunesDe, semanaTerminaHoyOAntes } from "@/lib/date-mt";

const fecha = (lunes: string) => format(parseISO(lunes), "d 'de' MMMM", { locale: es });

/** Aviso al coach: la semana elegida ya terminó o termina hoy, así que el cliente casi no la verá. */
export function AvisoSemanaTerminada({ semana, onCambiar }: { semana: string; onCambiar: (lunes: string) => void }) {
  if (!semana || !semanaTerminaHoyOAntes(semana)) return null;
  const sugerida = getSemanaParaPlanear();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
      <p className="flex-1 text-white/90">
        La semana del {fecha(semana)} ya terminó o termina hoy. Tu cliente solo ve el plan de la semana en curso.
      </p>
      {sugerida !== semana && (
        <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-300 hover:text-white" onClick={() => onCambiar(sugerida)}>
          Usar la semana del {fecha(sugerida)}
        </Button>
      )}
    </div>
  );
}

/** Copiar un plan o una rutina ya hecha a otra semana, sin usar la IA. */
export function CopiarSemanaDialog({
  tipo,
  clienteId,
  desde,
  open,
  onClose,
  onCopiado,
}: {
  tipo: "planes-comida" | "rutinas";
  clienteId: number;
  desde: string;
  open: boolean;
  onClose: () => void;
  onCopiado: (hasta: string) => void;
}) {
  const { toast } = useToast();
  const [hasta, setHasta] = useState(getSemanaParaPlanear());
  const [publicar, setPublicar] = useState(true);
  const [copiando, setCopiando] = useState(false);
  const que = tipo === "rutinas" ? "la rutina" : "el plan";

  async function copiar() {
    setCopiando(true);
    try {
      await customFetch(`/api/${tipo}/copiar`, { method: "POST", body: JSON.stringify({ clienteId, desde, hasta, publicar }) });
      toast({
        title: publicar ? "Copiado y publicado" : "Copiado como borrador",
        description: `${que[0].toUpperCase() + que.slice(1)} quedó en la semana del ${fecha(hasta)}.`,
      });
      onCopiado(hasta);
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "No se pudo copiar", description: err?.message || "Intenta de nuevo." });
    } finally {
      setCopiando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Copiar a otra semana</DialogTitle>
          <DialogDescription>
            Copia {que} de la semana del {desde ? fecha(desde) : ""} tal cual, sin usar la IA (no gasta créditos).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="copiar-hasta" className="block text-xs font-semibold text-muted-foreground mb-1">Semana de destino</label>
            <Input id="copiar-hasta" type="date" className="bg-background/50 h-11" value={hasta} onChange={(e) => e.target.value && setHasta(lunesDe(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">Semana del {fecha(hasta)} (de lunes a domingo). Si ya tenía algo, se reemplaza.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={publicar} onChange={(e) => setPublicar(e.target.checked)} />
            Publicarlo (tu cliente lo verá esa semana)
          </label>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 min-h-[44px] gap-2" onClick={copiar} disabled={copiando || hasta === desde}>
              <Copy className="w-4 h-4" /> {copiando ? "Copiando…" : "Copiar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
