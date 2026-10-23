import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, MessageCircle, Mail, Phone, Check } from "lucide-react";

type Solicitud = {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  interes: string | null;
  mensaje: string | null;
  idioma: string | null;
  atendida: boolean;
  creadoEn: string;
};

const INTERES: Record<string, string> = {
  primera_sesion: "Primera sesión",
  cuerpo: "Plan Cuerpo",
  cuerpo_mente: "Plan Cuerpo y Mente",
  uno_a_uno: "Acompañamiento 1:1",
  otro: "Otro",
};

/** Personas que llenaron "Agenda tu primera sesión" en la página. */
export default function CoachSolicitudes() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Solicitud[]>({
    queryKey: ["/api/contacto/solicitudes"],
    queryFn: () => customFetch<Solicitud[]>("/api/contacto/solicitudes"),
  });

  async function marcar(s: Solicitud) {
    await customFetch(`/api/contacto/solicitudes/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atendida: !s.atendida }),
    });
    qc.invalidateQueries({ queryKey: ["/api/contacto/solicitudes"] });
  }

  const pendientes = (data ?? []).filter((s) => !s.atendida).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-syne text-white flex items-center gap-3">
          <Inbox className="text-primary" /> Solicitudes
        </h1>
        <p className="text-muted-foreground mt-1">
          Personas que pidieron su primera sesión desde la página. {pendientes > 0 ? `${pendientes} sin atender.` : "Todas atendidas."}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !data?.length ? (
        <Card className="bg-card border-border/50">
          <CardContent className="p-8 text-center text-muted-foreground">Todavía no hay solicitudes.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((s) => {
            const tel = (s.telefono ?? "").replace(/[^\d+]/g, "");
            const wa = tel ? `https://wa.me/${tel.replace(/^\+/, "").replace(/^(\d{10})$/, "1$1")}` : null;
            return (
              <Card key={s.id} className={`bg-card ${s.atendida ? "border-border/30 opacity-70" : "border-primary/40"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white text-lg">{s.nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.creadoEn).toLocaleString()} · {s.idioma === "en" ? "Inglés" : "Español"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {s.interes && <Badge variant="outline" className="border-primary/40 text-primary">{INTERES[s.interes] ?? s.interes}</Badge>}
                      {s.atendida && <Badge variant="outline">Atendida</Badge>}
                    </div>
                  </div>
                  {s.mensaje && <p className="text-sm text-white/80 whitespace-pre-wrap">{s.mensaje}</p>}
                  <div className="flex flex-wrap gap-2">
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer">
                        <Button size="sm" className="bg-[#25D366] hover:bg-[#1ebe5b] text-black"><MessageCircle className="w-4 h-4 mr-1" /> WhatsApp</Button>
                      </a>
                    )}
                    {tel && (
                      <a href={`tel:${tel}`}>
                        <Button size="sm" variant="outline"><Phone className="w-4 h-4 mr-1" /> {s.telefono}</Button>
                      </a>
                    )}
                    {s.email && (
                      <a href={`mailto:${s.email}`}>
                        <Button size="sm" variant="outline"><Mail className="w-4 h-4 mr-1" /> {s.email}</Button>
                      </a>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => marcar(s)}>
                      <Check className="w-4 h-4 mr-1" /> {s.atendida ? "Marcar sin atender" : "Marcar atendida"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
