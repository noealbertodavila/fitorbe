import { useState } from "react";
import { useListClientes } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserCircle, Activity, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CoachClientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: clientes, isLoading } = useListClientes({ buscar: searchTerm });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white">Tus Clientes</h1>
        <p className="text-muted-foreground">Listado general de clientes asignados</p>
      </div>

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
            No se encontraron clientes
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
