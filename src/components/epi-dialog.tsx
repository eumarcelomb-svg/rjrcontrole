import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { baixarFichaEpi, criarFichasEpi, gruposEpi } from "@/lib/epi";
import { type Colaborador } from "@/lib/frequencia";

export function EpiDialog({ colaboradores, onClose }: { colaboradores: Colaborador[]; onClose: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const grupos = gruposEpi(colaboradores);
  const [selecionadas, setSelecionadas] = useState<string[]>(() => grupos.map((g) => g.funcao));
  const totalSelecionado = grupos.filter((g) => selecionadas.includes(g.funcao)).reduce((soma, g) => soma + g.nomes.length, 0);

  function alternar(funcao: string, marcado: boolean) {
    setPdf(null);
    setSelecionadas((atual) => (marcado ? [...atual, funcao] : atual.filter((f) => f !== funcao)));
  }

  async function gerar() {
    setOcupado(true);
    try { setPdf(await criarFichasEpi(colaboradores, selecionadas)); }
    catch { toast.error("Não foi possível gerar a ficha de EPI. Tente novamente."); }
    finally { setOcupado(false); }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recebimento de EPI</DialogTitle>
          <DialogDescription>Selecione os grupos de função. Sem CPF, com campos em branco para preenchimento manual.</DialogDescription>
        </DialogHeader>
        <div className="max-h-52 overflow-y-auto divide-y border-y">
          {grupos.map((grupo) => (
            <label key={grupo.funcao} className="flex cursor-pointer items-center gap-3 py-2 text-sm">
              <Checkbox
                checked={selecionadas.includes(grupo.funcao)}
                onCheckedChange={(marcado) => alternar(grupo.funcao, marcado === true)}
                aria-label={`Selecionar função ${grupo.funcao}`}
              />
              <span className="min-w-0 flex-1 break-words font-medium">{grupo.funcao}</span>
              <span className="shrink-0 text-muted-foreground">{grupo.nomes.length}</span>
            </label>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{totalSelecionado} de {colaboradores.length} colaboradores selecionados, incluindo inativos. Campos em branco para preenchimento manual do EPI, data e assinatura ao lado de cada nome.</p>
        {pdf && <p role="status" className="text-sm font-medium">PDF pronto · {selecionadas.length} grupo(s) por função.</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {pdf ? <Button onClick={() => { void baixarFichaEpi(pdf).catch(() => toast.error("Não foi possível baixar a ficha. Tente novamente.")); }}><Download /> Baixar PDF de EPI</Button>
            : <Button disabled={ocupado || !selecionadas.length} onClick={gerar}><FileText /> {ocupado ? "Gerando…" : "Gerar PDF de EPI"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
