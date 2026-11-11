import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { iso, type Colaborador } from "@/lib/frequencia";
import { baixarPresencaManual, criarPresencaManual } from "@/lib/presenca-manual";

export function PresencaManualDialog({ colaboradores, onClose }: { colaboradores: Colaborador[]; onClose: () => void }) {
  const [data, setData] = useState(() => iso(new Date()));
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function gerar() {
    setOcupado(true);
    try { setPdf(await criarPresencaManual(colaboradores, data)); }
    catch { toast.error("Não foi possível gerar a ficha. Tente novamente."); }
    finally { setOcupado(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Ficha de presença manual</DialogTitle>
        <DialogDescription>Nome, função e espaço para assinatura, sem CPF.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <label htmlFor="presenca-data" className="text-sm font-medium">Data da presença</label>
        <Input id="presenca-data" type="date" value={data} disabled={ocupado} onChange={(e) => { setData(e.target.value); setPdf(null); }} />
      </div>
      <p className="text-sm text-muted-foreground">{colaboradores.length} colaborador(es) da lista atual, em ordem alfabética.</p>
      {pdf && <p role="status" className="text-sm font-medium">Ficha de presença pronta.</p>}
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        {pdf ? <Button onClick={() => { void baixarPresencaManual(pdf, data).catch(() => toast.error("Não foi possível baixar a ficha. Tente novamente.")); }}><Download /> Baixar ficha de presença</Button>
          : <Button disabled={ocupado || !data || !colaboradores.length} onClick={gerar}><FileText /> {ocupado ? "Gerando…" : "Gerar ficha de presença"}</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}