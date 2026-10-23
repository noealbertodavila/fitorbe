import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNegocio } from "@/hooks/use-negocio";

/** El coach configura cómo ven su negocio sus clientes: nombre y logo. */
export default function CoachNegocio() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { negocio, isLoading } = useNegocio();
  const [nombre, setNombre] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (negocio) {
      setNombre(negocio.negocio);
      setLogo(negocio.logo);
    }
  }, [negocio]);

  function elegirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      toast({ title: "Usa una imagen PNG, JPG o WEBP", variant: "destructive" });
      return;
    }
    if (file.size > 500 * 1024) {
      toast({ title: "La imagen es muy grande", description: "Máximo 500 KB.", variant: "destructive" });
      return;
    }
    const r = new FileReader();
    r.onload = () => setLogo(String(r.result));
    r.readAsDataURL(file);
  }

  async function guardar() {
    setGuardando(true);
    try {
      await customFetch("/api/mi-negocio", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ negocio: nombre, logo }) });
      await qc.invalidateQueries({ queryKey: ["/api/mi-negocio"] });
      toast({ title: "Guardado", description: "Tus clientes ya ven el cambio." });
    } catch (err: unknown) {
      toast({ title: "No se guardó", description: (err as { data?: { error?: string } })?.data?.error ?? "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const diasPrueba = negocio?.pruebaHasta ? Math.max(0, Math.ceil((new Date(negocio.pruebaHasta + "T12:00:00").getTime() - new Date(hoy + "T12:00:00").getTime()) / 86400000)) : null;
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white">Mi negocio</h1>
        <p className="text-muted-foreground">Así te ven tus clientes en la app y en sus documentos.</p>
      </div>

      {negocio?.estado === "prueba" && diasPrueba !== null && (
        <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200">
          Estás en tu prueba gratis: te {diasPrueba === 1 ? "queda 1 día" : `quedan ${diasPrueba} días`} (hasta el {negocio.pruebaHasta}).
        </div>
      )}

      <Card className="bg-card border-border/50">
        <CardContent className="p-6 space-y-5">
          <div>
            <label htmlFor="neg-nombre" className="block text-sm font-semibold text-muted-foreground mb-1">Nombre de tu negocio</label>
            <input id="neg-nombre" disabled={isLoading} className="w-full min-h-[44px] rounded-md border border-border bg-background px-3 text-white" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-muted-foreground mb-2">Logo</span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-40 h-20 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
                {logo ? <img src={logo} alt="Tu logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">Sin logo</span>}
              </div>
              <label className="min-h-[44px] inline-flex items-center px-4 rounded-md border border-border text-sm text-white cursor-pointer hover:bg-white/5">
                Subir logo
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={elegirLogo} />
              </label>
              {logo && <Button variant="ghost" className="min-h-[44px] text-red-400" onClick={() => setLogo(null)}>Quitar</Button>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">PNG, JPG o WEBP, máximo 500 KB.</p>
          </div>
          <Button onClick={guardar} disabled={guardando || !nombre.trim()} className="min-h-[44px] font-bold">{guardando ? "Guardando…" : "Guardar"}</Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardContent className="p-6 space-y-2">
          <h2 className="font-bold text-white">Cómo entran tus clientes</h2>
          <p className="text-sm text-muted-foreground">Agrégalos en <b>Clientes → Nuevo cliente</b>. Entran en <span className="text-white">{window.location.origin}/login</span> con el correo y la contraseña que les das.</p>
        </CardContent>
      </Card>
    </div>
  );
}
