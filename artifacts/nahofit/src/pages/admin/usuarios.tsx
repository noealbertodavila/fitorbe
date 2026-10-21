import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  useListUsuarios, 
  useCreateUsuario, 
  useUpdateUsuario, 
  useDeleteUsuario,
  customFetch,
  Usuario 
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit2, Trash2, Shield, UserCheck, CheckCircle2, XCircle, UserCog } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

interface PlanPrecio {
  id: number;
  nombre: string;
  precioMensual: number;
  activo: boolean;
}

const usuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres").optional().or(z.literal("")),
  rol: z.enum(["admin", "coach", "cliente"]),
  telefono: z.string().optional(),
  planTipo: z.string().optional(),
  coachId: z.string().optional(),
});

type FormValues = z.infer<typeof usuarioSchema>;

export default function AdminUsuarios() {
  const { data: usuarios, isLoading } = useListUsuarios();
  const { data: planes } = useQuery<PlanPrecio[]>({
    queryKey: ["/api/planes"],
    queryFn: () => customFetch<PlanPrecio[]>("/api/planes"),
    staleTime: 0,
  });
  const planesActivos = (planes || []).filter(p => p.activo);

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [assignCoachOpen, setAssignCoachOpen] = useState(false);
  const [assigningClient, setAssigningClient] = useState<Usuario | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const coaches = (usuarios || []).filter(u => u.rol === "coach" && u.activo !== false);

  const createMutation = useCreateUsuario({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/usuarios"] });
        queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
        setIsDialogOpen(false);
        toast({ title: "Usuario creado exitosamente" });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error al crear", description: err.message })
    }
  });

  const updateMutation = useUpdateUsuario({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/usuarios"] });
        queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
        setIsDialogOpen(false);
        setEditingUser(null);
        toast({ title: "Usuario actualizado" });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error al actualizar", description: err.message })
    }
  });

  const deleteMutation = useDeleteUsuario({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/usuarios"] });
        queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
        toast({ title: "Usuario desactivado" });
      }
    }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nombre: "", email: "", password: "", rol: "cliente",
      telefono: "", planTipo: "basico", coachId: ""
    },
  });

  const watchedRol = form.watch("rol");

  const openCreateDialog = () => {
    setEditingUser(null);
    const defaultPlan = planesActivos[0]?.nombre.toLowerCase() || "";
    form.reset({ nombre: "", email: "", password: "", rol: "cliente", telefono: "", planTipo: defaultPlan, coachId: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (u: Usuario) => {
    setEditingUser(u);
    form.reset({
      nombre: u.nombre,
      email: u.email,
      password: "",
      rol: u.rol as any,
      telefono: u.telefono || "",
      planTipo: (u as any).planTipo || planesActivos[0]?.nombre.toLowerCase() || "",
      coachId: (u as any).coachId ? String((u as any).coachId) : ""
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const payload: any = { ...values };
    if (!values.password) delete payload.password;
    if (values.rol === "cliente") {
      if (values.coachId && values.coachId !== "none") {
        payload.coachId = parseInt(values.coachId);
      } else {
        payload.coachId = null;
      }
    } else {
      delete payload.coachId;
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      if (!values.password) {
        form.setError("password", { message: "Requerido para nuevos usuarios" });
        return;
      }
      createMutation.mutate({ data: payload });
    }
  };

  const handleAssignCoach = async () => {
    if (!assigningClient || !selectedCoachId) return;
    try {
      await customFetch(`/api/usuarios/${assigningClient.id}`, {
        method: "PUT",
        body: JSON.stringify({ coachId: selectedCoachId === "none" ? null : parseInt(selectedCoachId) }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      toast({ title: "Coach asignado", description: `${assigningClient.nombre} asignado correctamente.` });
      setAssignCoachOpen(false);
      setAssigningClient(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const filteredUsuarios = (usuarios || []).filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rolBadge: Record<string, string> = {
    admin: "bg-red-500/20 text-red-400 border-red-500/30",
    coach: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cliente: "bg-primary/20 text-primary border-primary/30",
  };
  const rolLabel: Record<string, string> = {
    admin: "Admin",
    coach: "Coach",
    cliente: "Cliente",
  };

  const coachNameMap = new Map((coaches || []).map(c => [c.id, c.nombre]));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-syne font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra clientes, coaches y administradores</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
        </Button>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border/50 text-foreground sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-syne text-xl">
              {editingUser ? "Editar Usuario" : "Crear Usuario"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl><Input {...field} className="bg-background/50" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl><Input type="email" {...field} className="bg-background/50" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña {editingUser && "(dejar en blanco para mantener)"}</FormLabel>
                  <FormControl><Input type="password" {...field} className="bg-background/50" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="rol" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50"><SelectValue placeholder="Rol" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="planTipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50"><SelectValue placeholder="Seleccionar plan..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {planesActivos.length === 0 ? (
                          <SelectItem value="_none" disabled>No hay planes activos</SelectItem>
                        ) : (
                          planesActivos.map(p => (
                            <SelectItem key={p.id} value={p.nombre.toLowerCase()}>
                              {p.nombre} — ${p.precioMensual}/mes
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Coach assignment — only for clientes */}
              {watchedRol === "cliente" && coaches.length > 0 && (
                <FormField control={form.control} name="coachId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignar a coach</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Seleccionar coach..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">— Sin asignar —</SelectItem>
                        {coaches.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="telefono" render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl><Input {...field} className="bg-background/50" placeholder="+58 412-000-0000" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Guardando..." : editingUser ? "Guardar Cambios" : "Crear Usuario"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assign Coach Dialog */}
      <Dialog open={assignCoachOpen} onOpenChange={setAssignCoachOpen}>
        <DialogContent className="bg-card border-border/50 text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-syne text-lg">Asignar coach a {assigningClient?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Seleccionar coach..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sin asignar —</SelectItem>
                {coaches.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleAssignCoach}>Asignar</Button>
              <Button variant="outline" className="flex-1 border-border/50" onClick={() => setAssignCoachOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="flex items-center space-x-2 bg-card border border-border/50 p-2 rounded-md w-full max-w-md">
        <Search className="h-5 w-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por nombre, email o rol..." 
          className="border-0 focus-visible:ring-0 bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* User list */}
      <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full bg-border/30" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Usuario</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Rol</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Coach asignado</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Plan</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Estado</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map((u, i) => (
                  <tr key={u.id} className={`border-b border-border/30 hover:bg-white/2 transition-colors ${i % 2 === 0 ? "" : "bg-white/1"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm">{u.nombre}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${rolBadge[u.rol] || ""}`}>
                        {u.rol === "admin" && <Shield className="w-3 h-3 mr-1" />}
                        {u.rol === "coach" && <UserCheck className="w-3 h-3 mr-1" />}
                        {rolLabel[u.rol] || u.rol}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.rol === "cliente" ? (
                        <button
                          onClick={() => {
                            setAssigningClient(u);
                            setSelectedCoachId((u as any).coachId ? String((u as any).coachId) : "none");
                            setAssignCoachOpen(true);
                          }}
                          className="flex items-center gap-1.5 group transition-colors"
                        >
                          <UserCog className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                          <span className={`text-sm group-hover:text-primary transition-colors ${(u as any).coachId ? "text-white" : "text-yellow-500 italic"}`}>
                            {(u as any).coachId ? coachNameMap.get((u as any).coachId) || "Desconocido" : "Sin asignar ↗"}
                          </span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(u as any).planTipo ? (
                        <span className="text-xs text-muted-foreground capitalize">{(u as any).planTipo}</span>
                      ) : <span className="text-muted-foreground/40 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={u.activo !== false ? "border-green-500/40 text-green-400" : "border-red-500/40 text-red-400"}>
                        {u.activo !== false ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {u.activo !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                          onClick={() => openEditDialog(u)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                          onClick={() => deleteMutation.mutate({ id: u.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsuarios.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No se encontraron usuarios</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
