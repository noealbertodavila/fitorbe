import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  Plus,
  Edit2,
  Eye,
  Save,
  ArrowUpDown,
  DollarSign,
  Percent,
  Tag,
} from "lucide-react";

interface PlanPrecio {
  id: number;
  nombre: string;
  precioMensual: number;
  precio3meses: number;
  precio6meses: number;
  descuentoPct: number;
  descripcion: string;
  badge: string | null;
  caracteristicasIncluidas: string[];
  caracteristicasNoIncluidas: string[];
  activo: boolean;
  actualizadoEn: string;
}

function useListPlanes() {
  return useQuery<PlanPrecio[]>({
    queryKey: ["/api/planes"],
    queryFn: () => customFetch<PlanPrecio[]>("/api/planes"),
  });
}

function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PlanPrecio> }) =>
      customFetch<PlanPrecio>(`/api/planes/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/planes"] }),
  });
}

function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<PlanPrecio, "id" | "actualizadoEn">) =>
      customFetch<PlanPrecio>("/api/planes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/planes"] }),
  });
}

// ─────────────────────────────────────────────────────────────────
// Feature list editor
// ─────────────────────────────────────────────────────────────────
function FeatureEditor({
  title,
  items,
  onChange,
  color = "primary",
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  color?: "primary" | "destructive";
}) {
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem("");
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const editItem = (idx: number, value: string) => {
    const updated = [...items];
    updated[idx] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <h4 className={`text-sm font-semibold uppercase tracking-wider ${color === "primary" ? "text-primary" : "text-red-400"}`}>
        {title}
      </h4>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {color === "primary" ? (
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <Input
              value={item}
              onChange={(e) => editItem(idx, e.target.value)}
              className="h-8 bg-background/50 border-border/50 text-sm flex-1"
            />
            <button
              onClick={() => removeItem(idx)}
              className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Agregar característica..."
          className="h-8 bg-background/50 border-border/50 text-sm"
        />
        <Button size="sm" variant="outline" onClick={addItem} className="h-8 border-border/50">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Plan Preview Dialog
// ─────────────────────────────────────────────────────────────────
function PlanPreviewDialog({ plan, open, onClose }: { plan: PlanPrecio; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Vista previa — Plan {plan.nombre}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <div className={`rounded-2xl border-2 p-6 space-y-4 relative ${plan.badge === "Más popular" ? "border-primary" : "border-border/50"}`}>
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                {plan.badge}
              </span>
            )}
            <div>
              <h3 className="font-syne text-2xl font-bold text-white">{plan.nombre}</h3>
              <p className="text-muted-foreground text-sm mt-1">{plan.descripcion}</p>
            </div>
            <div>
              <span className="text-4xl font-syne font-bold text-white">${plan.precioMensual}</span>
              <span className="text-muted-foreground text-sm">/mes</span>
            </div>
            {plan.descuentoPct > 0 && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-background/50 rounded-lg p-2 text-center border border-border/50">
                  <p className="text-muted-foreground text-xs">3 meses</p>
                  <p className="font-bold text-primary">${plan.precio3meses.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">-{plan.descuentoPct}%</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2 text-center border border-border/50">
                  <p className="text-muted-foreground text-xs">6 meses</p>
                  <p className="font-bold text-primary">${plan.precio6meses.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">-{plan.descuentoPct}%</p>
                </div>
              </div>
            )}
            <div className="space-y-2 pt-2 border-t border-border/50">
              {plan.caracteristicasIncluidas.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-white">{f}</span>
                </div>
              ))}
              {plan.caracteristicasNoIncluidas.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-sm opacity-50">
                  <X className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="line-through text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// Plan Card with inline edit
// ─────────────────────────────────────────────────────────────────
function PlanCard({ plan }: { plan: PlanPrecio }) {
  const { toast } = useToast();
  const updatePlan = useUpdatePlan();
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [draft, setDraft] = useState<PlanPrecio>(plan);

  const handleEdit = () => {
    setDraft({ ...plan });
    setEditing(true);
  };

  const recalcPrices = (base: number, pct: number) => ({
    precio3meses: parseFloat((base * 3 * (1 - pct / 100)).toFixed(2)),
    precio6meses: parseFloat((base * 6 * (1 - pct / 100)).toFixed(2)),
  });

  const handleSave = async () => {
    await updatePlan.mutateAsync({ id: plan.id, data: draft });
    setEditing(false);
    toast({ title: "Plan actualizado", description: `Los cambios del Plan ${draft.nombre} han sido guardados.` });
  };

  const handleCancel = () => {
    setDraft({ ...plan });
    setEditing(false);
  };

  const badgeColor =
    plan.nombre === "VIP"
      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      : plan.nombre === "Premium"
        ? "bg-primary/20 text-primary border-primary/30"
        : "bg-muted/20 text-muted-foreground border-border/50";

  const isPremium = plan.nombre === "Premium";
  const isVip = plan.nombre === "VIP";

  return (
    <>
      <Card className={`bg-card flex flex-col relative ${!plan.activo ? "opacity-60" : ""} ${isPremium ? "border-2 border-primary shadow-[0_0_20px_rgba(127,255,79,0.15)]" : "border border-border/50"}`}>
        {isPremium && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap z-10">
            ⭐ Más popular
          </div>
        )}
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editing ? (
                <Input
                  value={draft.nombre}
                  onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                  className="font-syne text-xl font-bold bg-background/50 border-border/50 mb-2"
                />
              ) : (
                <CardTitle className="font-syne text-2xl text-white">{plan.nombre}</CardTitle>
              )}
              {editing ? (
                <Input
                  value={draft.badge || ""}
                  onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
                  placeholder="Badge (ej: Más popular)"
                  className="text-xs bg-background/50 border-border/50 mt-1 h-7"
                />
              ) : (
                plan.badge && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border mt-1 ${badgeColor}`}>
                    <Tag className="w-3 h-3" />
                    {plan.badge}
                  </span>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={plan.activo}
                onCheckedChange={(val) => updatePlan.mutate({ id: plan.id, data: { activo: val } })}
              />
              <span className="text-xs text-muted-foreground">{plan.activo ? "Activo" : "Inactivo"}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pt-4 space-y-5">
          {/* Precios */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Precios</span>
            </div>
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Precio mensual ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.precioMensual}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      const { precio3meses, precio6meses } = recalcPrices(base, draft.descuentoPct);
                      setDraft({ ...draft, precioMensual: base, precio3meses, precio6meses });
                    }}
                    className="bg-background/50 border-border/50 h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                    <Percent className="w-3 h-3" /> Descuento (%)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    value={draft.descuentoPct}
                    onChange={(e) => {
                      const pct = parseFloat(e.target.value) || 0;
                      const { precio3meses, precio6meses } = recalcPrices(draft.precioMensual, pct);
                      setDraft({ ...draft, descuentoPct: pct, precio3meses, precio6meses });
                    }}
                    className="bg-background/50 border-border/50 h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Precio 3 meses ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.precio3meses}
                    onChange={(e) => setDraft({ ...draft, precio3meses: parseFloat(e.target.value) || 0 })}
                    className="bg-background/50 border-border/50 h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Precio 6 meses ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.precio6meses}
                    onChange={(e) => setDraft({ ...draft, precio6meses: parseFloat(e.target.value) || 0 })}
                    className="bg-background/50 border-border/50 h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-syne font-bold text-white">${plan.precioMensual}</span>
                  <span className="text-muted-foreground text-sm">/mes</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background/40 rounded-lg p-2 border border-border/40 text-center">
                    <p className="text-xs text-muted-foreground">3 meses</p>
                    <p className="text-primary font-bold text-sm">${plan.precio3meses.toFixed(0)}</p>
                    <p className="text-xs text-primary/70">-{plan.descuentoPct}% dto.</p>
                  </div>
                  <div className="bg-background/40 rounded-lg p-2 border border-border/40 text-center">
                    <p className="text-xs text-muted-foreground">6 meses</p>
                    <p className="text-primary font-bold text-sm">${plan.precio6meses.toFixed(0)}</p>
                    <p className="text-xs text-primary/70">-{plan.descuentoPct}% dto.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Descripción</label>
            {editing ? (
              <Textarea
                value={draft.descripcion}
                onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
                className="bg-background/50 border-border/50 resize-none h-16 text-sm"
              />
            ) : (
              <p className="text-sm text-white/80">{plan.descripcion}</p>
            )}
          </div>

          {/* Características */}
          <div className="space-y-4 pt-2 border-t border-border/50">
            {editing ? (
              <>
                <FeatureEditor
                  title="Incluye"
                  items={draft.caracteristicasIncluidas as string[]}
                  onChange={(items) => setDraft({ ...draft, caracteristicasIncluidas: items })}
                  color="primary"
                />
                <FeatureEditor
                  title="No incluye"
                  items={draft.caracteristicasNoIncluidas as string[]}
                  onChange={(items) => setDraft({ ...draft, caracteristicasNoIncluidas: items })}
                  color="destructive"
                />
              </>
            ) : (
              <div className="space-y-2">
                {(plan.caracteristicasIncluidas as string[]).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-white/90">{f}</span>
                  </div>
                ))}
                {(plan.caracteristicasNoIncluidas as string[]).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm opacity-50">
                    <X className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="line-through text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-border/50 flex gap-2">
            {editing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={updatePlan.isPending}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updatePlan.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  className="border-border/50"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-border/50"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  onClick={() => setPreview(true)}
                  variant="outline"
                  size="sm"
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Vista previa
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <PlanPreviewDialog
        plan={editing ? draft : plan}
        open={preview}
        onClose={() => setPreview(false)}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// New Plan Dialog
// ─────────────────────────────────────────────────────────────────
function NuevoPlanDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const createPlan = useCreatePlan();
  const [draft, setDraft] = useState<Omit<PlanPrecio, "id" | "actualizadoEn">>({
    nombre: "",
    precioMensual: 0,
    precio3meses: 0,
    precio6meses: 0,
    descuentoPct: 0,
    descripcion: "",
    badge: null,
    caracteristicasIncluidas: [],
    caracteristicasNoIncluidas: [],
    activo: true,
  });

  const handleCreate = async () => {
    if (!draft.nombre.trim()) {
      toast({ variant: "destructive", title: "El nombre es requerido" });
      return;
    }
    await createPlan.mutateAsync(draft);
    onClose();
    toast({ title: "Plan creado", description: `El Plan ${draft.nombre} ha sido creado.` });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl">Nuevo Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nombre del plan</label>
              <Input value={draft.nombre} onChange={(e) => setDraft({ ...draft, nombre: e.target.value })} className="bg-background/50 border-border/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Badge (opcional)</label>
              <Input value={draft.badge || ""} onChange={(e) => setDraft({ ...draft, badge: e.target.value || null })} className="bg-background/50 border-border/50" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Precio mensual ($)</label>
              <Input type="number" value={draft.precioMensual} onChange={(e) => setDraft({ ...draft, precioMensual: parseFloat(e.target.value) || 0 })} className="bg-background/50 border-border/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Precio 3 meses ($)</label>
              <Input type="number" value={draft.precio3meses} onChange={(e) => setDraft({ ...draft, precio3meses: parseFloat(e.target.value) || 0 })} className="bg-background/50 border-border/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Precio 6 meses ($)</label>
              <Input type="number" value={draft.precio6meses} onChange={(e) => setDraft({ ...draft, precio6meses: parseFloat(e.target.value) || 0 })} className="bg-background/50 border-border/50" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Descripción</label>
            <Textarea value={draft.descripcion} onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })} className="bg-background/50 border-border/50 resize-none h-20" />
          </div>
          <FeatureEditor
            title="Características incluidas"
            items={draft.caracteristicasIncluidas as string[]}
            onChange={(items) => setDraft({ ...draft, caracteristicasIncluidas: items })}
            color="primary"
          />
          <FeatureEditor
            title="Características no incluidas"
            items={draft.caracteristicasNoIncluidas as string[]}
            onChange={(items) => setDraft({ ...draft, caracteristicasNoIncluidas: items })}
            color="destructive"
          />
          <Button onClick={handleCreate} disabled={createPlan.isPending} className="w-full bg-primary text-primary-foreground">
            {createPlan.isPending ? "Creando..." : "Crear Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────
export default function CoachPlanes() {
  const { data: planes, isLoading, isError, error, refetch } = useListPlanes();
  const [newPlanOpen, setNewPlanOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white mb-2">Planes y Precios</h1>
          <p className="text-muted-foreground">
            Los planes que ofreces a tus clientes. Tus clientes ven los activos.
          </p>
        </div>
        <Button
          onClick={() => setNewPlanOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {/* Stats bar */}
      {planes && (
        <div className="flex gap-6 p-4 bg-card rounded-xl border border-border/50">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total planes</p>
            <p className="text-2xl font-syne font-bold text-white">{planes.length}</p>
          </div>
          <div className="w-px bg-border/50" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Activos</p>
            <p className="text-2xl font-syne font-bold text-primary">{planes.filter(p => p.activo).length}</p>
          </div>
          <div className="w-px bg-border/50" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Rango de precios</p>
            <p className="text-2xl font-syne font-bold text-white">
              ${Math.min(...planes.map(p => p.precioMensual))} — ${Math.max(...planes.map(p => p.precioMensual))}
            </p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[600px] bg-border/50 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-destructive/40 text-center gap-4">
          <X className="w-10 h-10 text-destructive" />
          <p className="text-white font-semibold">Error al cargar los planes</p>
          <p className="text-muted-foreground text-sm">{(error as any)?.message || "No se pudo conectar con el servidor."}</p>
          <Button variant="outline" onClick={() => refetch()} className="border-border/50 mt-2">
            Reintentar
          </Button>
        </div>
      ) : planes?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border/50 text-center gap-4">
          <ArrowUpDown className="w-10 h-10 text-muted-foreground" />
          <p className="text-white font-semibold">No hay planes creados</p>
          <p className="text-muted-foreground text-sm">Crea el primer plan haciendo clic en "Nuevo Plan".</p>
          <Button onClick={() => setNewPlanOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-6">
          {planes?.map(plan => <PlanCard key={plan.id} plan={plan} />)}
        </div>
      )}

      <NuevoPlanDialog open={newPlanOpen} onClose={() => setNewPlanOpen(false)} />
    </div>
  );
}
