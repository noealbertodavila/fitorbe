import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Monitor } from "lucide-react";

interface PdfModeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (mode: "print" | "digital") => void;
  isExporting?: boolean;
}

export function PdfModeModal({ open, onClose, onSelect, isExporting }: PdfModeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Descargar PDF</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Elige el formato que necesitas:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSelect("print")}
            disabled={isExporting}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Printer className="w-6 h-6 text-gray-700" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Para imprimir</p>
              <p className="text-xs text-muted-foreground mt-1">Fondo blanco · Ahorra tinta</p>
            </div>
          </button>
          <button
            onClick={() => onSelect("digital")}
            disabled={isExporting}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Digital</p>
              <p className="text-xs text-muted-foreground mt-1">Fondo oscuro · Para pantalla</p>
            </div>
          </button>
        </div>
        {isExporting && (
          <p className="text-xs text-muted-foreground text-center mt-2 animate-pulse">Generando PDF…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
