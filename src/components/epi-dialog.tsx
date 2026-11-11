import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { baixarFichaEpi, criarFichasEpi, gruposEpi } from "@/lib/epi";
import { type Colaborador } from "@/lib/frequencia";

export function EpiDialog({ colaboradores, onClose }: { colaboradores: Colaborador[]; onClose: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const grupos = gruposEpi(colaboradores);
  async function gerar() {
    setOcupado(true);
    try { setPdf(await criarFichasEpi(colaboradores)); }
    catch { toast.error("Não foi possível gerar a ficha de EPI. Tente novamente."); }
    finally { setOcupado(false); }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recebimento de EPI</DialogTitle>
          <DialogDescription>Todos os colaboradores separados por função, sem CPF.</DialogDescription>
        </DialogHeader>
        <div className="max-h-52 overflow-y-auto divide-y border-y">
          {grupos.map((grupo) => <div key={grupo.funcao} className="flex items-start justify-between gap-3 py-2 text-sm"><span className="min-w-0 break-words font-medium">{grupo.funcao}</span><span className="shrink-0 text-muted-foreground">{grupo.nomes.length}</span></div>)}
        </div>
        <p className="text-sm text-muted-foreground">{colaboradores.length} colaboradores, incluindo inativos. Campos em branco para preenchimento manual do EPI, data e assinatura ao lado de cada nome.</p>
        {pdf && <p role="status" className="text-sm font-medium">PDF pronto · {grupos.length} grupo(s) por função.</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {pdf ? <Button onClick={() => { void baixarFichaEpi(pdf).catch(() => toast.error("Não foi possível baixar a ficha. Tente novamente.")); }}><Download /> Baixar PDF de EPI</Button>
            : <Button disabled={ocupado || !colaboradores.length} onClick={gerar}><FileText /> {ocupado ? "Gerando…" : "Gerar PDF de EPI"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}