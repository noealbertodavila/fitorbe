import { useState } from "react";
import { useListClientes, customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserCircle, Activity, ChevronRight, UserPlus, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CoachClientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: clientes, isLoading } = useListClientes({ buscar: searchTerm });
  const [nuevoAbierto, setNuevoAbierto] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white">Tus clientes</h1>
          <p className="text-muted-foreground">Las personas que entrenas y acompañas</p>
        </div>
        <Button onClick={() => setNuevoAbierto(true)} className="min-h-[44px] gap-2 font-bold">
          <UserPlus className="w-4 h-4" /> Nuevo cliente
        </Button>
      </div>
      <NuevoCliente abierto={nuevoAbierto} onClose={() => setNuevoAbierto(false)} />

      <div className="flex items-center space-x-2 bg-card border border-border/50 p-2 rounded-md w-full max-w-md">
        <Search className="h-5 w-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por nombre o email..." 
          className="border-0 focus-visible:ring-0 bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 w-full bg-border/50" />)
        ) : clientes?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border/50 rounded-lg">
            {searchTerm ? "No se encontraron clientes" : "Todavía no tienes clientes. Agrega el primero con “Nuevo cliente”."}
          </div>
        ) : (
          clientes?.map(cliente => (
            <Link key={cliente.id} href={`/coach/clientes/${cliente.id}`}>
              <Card className="bg-card border-border/50 hover-elevate transition-all cursor-pointer h-full group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl group-hover:scale-110 transition-transform">
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-syne font-bold text-white text-lg">{cliente.nombre}</h3>
                        <p className="text-sm text-muted-foreground">{cliente.email}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center"><UserCircle className="w-4 h-4 mr-2"/> Modalidad</span>
                      <span className="text-white capitalize">{cliente.modalidad || 'No especificada'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center"><Activity className="w-4 h-4 mr-2"/> Adherencia</span>
                      <span className="text-primary font-bold">{cliente.adherenciaSemana || 0}%</span>
                    </div>
                    <div className="pt-2">
                      <Badge variant="outline" className={cliente.activo ? "border-primary/50 text-primary" : "border-muted text-muted-foreground"}>
                        {cliente.activo ? "Activo" : "Inactivo"}
                      </Badge>
                      {cliente.planTipo && (
                        <Badge variant="outline" className="ml-2 border-blue-500/50 text-blue-400 capitalize">
                          {cliente.planTipo}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function claveAleatoria() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => letras[n % letras.length]).join("");
}

/** El coach agrega un cliente: le crea su cuenta para que entre a la app. */
function NuevoCliente({ abierto, onClose }: { abierto: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const vacio = { nombre: "", email: "", telefono: "", objetivo: "", password: claveAleatoria() };
  const [f, setF] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [creado, setCreado] = useState<{ email: string; password: string } | null>(null);

  function cerrar() {
    setF({ ...vacio, password: claveAleatoria() });
    setError("");
    setCreado(null);
    onClose();
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await customFetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: f.nombre, email: f.email, password: f.password, telefono: f.telefono || undefined, objetivo: f.objetivo || undefined }),
      });
      await qc.invalidateQueries({ queryKey: ["/api/clientes"] });
      setCreado({ email: f.email.trim().toLowerCase(), password: f.password });
    } catch (err: unknown) {
      const d = (err as { data?: { error?: string } })?.data;
      setError(d?.error ?? "No se pudo crear el cliente. Revisa los datos.");
    } finally {
      setGuardando(false);
    }
  }

  const campo = "w-full min-h-[44px] rounded-md border border-border bg-background px-3 text-sm text-white";
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && cerrar()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{creado ? "Cliente agregado" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {creado ? "Comparte estos datos con tu cliente para que entre a la app." : "Le creas su cuenta; después completas su perfil en su ficha."}
          </DialogDescription>
        </DialogHeader>
        {creado ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-background border border-border p-4 text-sm space-y-1">
              <p><span className="text-muted-foreground">Página:</span> <span className="text-white">{window.location.origin}/login</span></p>
              <p><span className="text-muted-foreground">Correo:</span> <span className="text-white">{creado.email}</span></p>
              <p><span className="text-muted-foreground">Contraseña:</span> <span className="text-white font-mono">{creado.password}</span></p>
            </div>
            <Button
              variant="outline"
              className="w-full min-h-[44px] gap-2"
              onClick={() => {
                void navigator.clipboard?.writeText(`Entra a ${window.location.origin}/login\nCorreo: ${creado.email}\nContraseña: ${creado.password}`);
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
              <label htmlFor="nc-nombre" className="block text-xs font-semibold text-muted-foreground mb-1">Nombre</label>
              <input id="nc-nombre" required className={campo} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
            </div>
            <div>
              <label htmlFor="nc-email" className="block text-xs font-semibold text-muted-foreground mb-1">Correo</label>
              <input id="nc-email" type="email" required className={campo} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </div>
            <div>
              <label htmlFor="nc-tel" className="block text-xs font-semibold text-muted-foreground mb-1">Teléfono / WhatsApp (opcional)</label>
              <input id="nc-tel" type="tel" className={campo} value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />
            </div>
            <div>
              <label htmlFor="nc-obj" className="block text-xs font-semibold text-muted-foreground mb-1">Objetivo (opcional)</label>
              <input id="nc-obj" className={campo} placeholder="Ej.: manejar el estrés y bajar de peso" value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} />
            </div>
            <div>
              <label htmlFor="nc-pass" className="block text-xs font-semibold text-muted-foreground mb-1">Contraseña para su primer ingreso</label>
              <div className="flex gap-2">
                <input id="nc-pass" required minLength={8} className={campo + " font-mono"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
                <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setF({ ...f, password: claveAleatoria() })}>Otra</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mínimo 8 caracteres. Tu cliente la puede cambiar después.</p>
            </div>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={guardando} className="w-full min-h-[44px] font-bold">{guardando ? "Guardando…" : "Agregar cliente"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
