import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { baixarFichaEpi, criarFichasEpi } from "@/lib/epi";
import { ordenarColaboradores, type Colaborador } from "@/lib/frequencia";

export function EpiDialog({ colaboradores, onClose }: { colaboradores: Colaborador[]; onClose: () => void }) {
  const [selecao, setSelecao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const lista = ordenarColaboradores(colaboradores);
  const selecionados = selecao === "todos" ? lista.filter((c) => c.ativo) : lista.filter((c) => c.id === selecao);
  async function gerar() {
    setOcupado(true);
    try { setPdf(await criarFichasEpi(selecionados)); }
    catch { toast.error("Não foi possível gerar a ficha de EPI. Tente novamente."); }
    finally { setOcupado(false); }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recebimento de EPI</DialogTitle>
          <DialogDescription>Ficha para assinatura de confirmação de recebimento.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="epi-colaborador" className="text-sm font-medium">Colaborador</label>
          <select id="epi-colaborador" className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm" value={selecao} disabled={ocupado} onChange={(e) => { setSelecao(e.target.value); setPdf(null); }}>
            <option value="">Selecione um colaborador</option>
            <option value="todos">Todos os colaboradores ativos</option>
            {lista.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.ativo ? "" : " (inativo)"}</option>)}
          </select>
        </div>
        <p className="text-sm text-muted-foreground">Nome, CPF e função preenchidos. Campos em branco para data, equipamento, CA, quantidade e assinaturas.</p>
        {pdf && <p role="status" className="text-sm font-medium">PDF pronto · {selecionados.length} ficha(s), uma por colaborador.</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {pdf ? <Button onClick={() => { void baixarFichaEpi(pdf).catch(() => toast.error("Não foi possível baixar a ficha. Tente novamente.")); }}><Download /> Baixar PDF de EPI</Button>
            : <Button disabled={ocupado || !selecionados.length} onClick={gerar}><FileText /> {ocupado ? "Gerando…" : "Gerar PDF de EPI"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}