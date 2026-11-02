import { useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";
import { claveAleatoria } from "@/lib/clave";

/**
 * El coach le pone una contraseña nueva a su cliente (por ejemplo, si la olvidó o
 * nunca recibió la primera). La contraseña se guarda cifrada: solo se ve aquí, una vez.
 */
export function NuevaClaveDialog({
  cliente,
  open,
  onClose,
}: {
  cliente: { id: number; nombre: string; email: string };
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [clave, setClave] = useState(claveAleatoria);
  const [guardando, setGuardando] = useState(false);
  const [lista, setLista] = useState<string | null>(null);

  function cerrar() {
    setLista(null);
    setClave(claveAleatoria());
    onClose();
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await customFetch(`/api/usuarios/${cliente.id}`, { method: "PUT", body: JSON.stringify({ password: clave }) });
      setLista(clave);
    } catch (err: any) {
      toast({ variant: "destructive", title: "No se pudo cambiar", description: err?.message || "Intenta de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  const pagina = `${window.location.origin}/login`;
  const campo = "w-full min-h-[44px] rounded-md border border-border bg-background px-3 text-sm text-white font-mono";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && cerrar()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{lista ? "Contraseña cambiada" : "Nueva contraseña"}</DialogTitle>
          <DialogDescription>
            {lista
              ? "Comparte estos datos con tu cliente. Esta es la única vez que verás la contraseña."
              : `Le pones una contraseña nueva a ${cliente.nombre}. La anterior deja de funcionar.`}
          </DialogDescription>
        </DialogHeader>
        {lista ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-background border border-border p-4 text-sm space-y-1">
              <p><span className="text-muted-foreground">Página:</span> <span className="text-white">{pagina}</span></p>
              <p><span className="text-muted-foreground">Correo:</span> <span className="text-white">{cliente.email}</span></p>
              <p><span className="text-muted-foreground">Contraseña:</span> <span className="text-white font-mono">{lista}</span></p>
            </div>
            <Button
              variant="outline"
              className="w-full min-h-[44px] gap-2"
              onClick={() => {
                void navigator.clipboard?.writeText(`Entra a ${pagina}\nCorreo: ${cliente.email}\nContraseña: ${lista}`);
                toast({ title: "Copiado", description: "Pégalo en un mensaje para tu cliente." });
              }}
            >
              <Copy className="w-4 h-4" /> Copiar datos de acceso
            </Button>
            <Button className="w-full min-h-[44px]" onClick={cerrar}>Listo</Button>
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-3">
            <div>
              <label htmlFor="nueva-clave" className="block text-xs font-semibold text-muted-foreground mb-1">Contraseña nueva</label>
              <div className="flex gap-2">
                <input id="nueva-clave" required minLength={8} className={campo} value={clave} onChange={(e) => setClave(e.target.value)} />
                <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setClave(claveAleatoria())}>Otra</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Al menos 8 caracteres. Tu cliente también puede crear una sola desde «¿Olvidaste tu contraseña?» en la página de entrada.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 min-h-[44px]" onClick={cerrar}>Cancelar</Button>
              <Button type="submit" className="flex-1 min-h-[44px]" disabled={guardando || clave.length < 8}>
                {guardando ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
