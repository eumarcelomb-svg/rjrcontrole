import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtR, type Colaborador } from "@/lib/frequencia";
import { baixarFichaVt, criarFichaVt, linhasVt, periodoVt, segundaVt, VALOR_VT } from "@/lib/vale-transporte";

export function VtDialog({ colaboradores, onClose }: { colaboradores: Colaborador[]; onClose: () => void }) {
  const [data, setData] = useState(() => segundaVt(new Date()));
  const [transportados, setTransportados] = useState<string[]>([]);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const linhas = linhasVt(colaboradores, transportados);
  const periodo = data ? periodoVt(data) : null;
  async function gerar() {
    setOcupado(true);
    try { setPdf(await criarFichaVt(colaboradores, data, transportados)); }
    catch { toast.error("Não foi possível gerar a ficha de VT. Tente novamente."); }
    finally { setOcupado(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Recebimento de VT</DialogTitle>
        <DialogDescription>{fmtR(VALOR_VT)} por colaborador / semana · Entrega habitual às segundas-feiras</DialogDescription>
      </DialogHeader>
      <label className="space-y-2 text-sm font-medium" htmlFor="vt-data">Data da entrega
        <Input id="vt-data" type="date" value={data} disabled={ocupado} onChange={(e) => { setData(e.target.value); setPdf(null); }} />
      </label>
      {periodo && <p className="text-sm text-muted-foreground">Semana: {periodo.inicio.split("-").reverse().join("/")} a {periodo.fim.split("-").reverse().join("/")}</p>}
      <div className="flex items-center justify-between gap-3 border-b pb-2 text-sm font-semibold">
        <span>Colaborador</span><span className="max-w-28 text-right">Transportado por colega</span>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y">
        {linhas.map((c) => <label key={c.id} className="flex cursor-pointer items-center gap-3 py-3 pr-2">
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{c.nome}</span><span className="block break-words text-xs text-muted-foreground">{c.funcao}</span></span>
          <Checkbox disabled={ocupado} checked={c.transportado} aria-label={`${c.nome} transportado por colega`} onCheckedChange={(marcado) => {
            setTransportados((atual) => marcado === true ? [...atual, c.id] : atual.filter((id) => id !== c.id)); setPdf(null);
          }} />
        </label>)}
      </div>
      <p className="text-sm text-muted-foreground">{linhas.length} colaboradores, incluindo inativos · {transportados.length} transportado(s) por colega</p>
      <p className="text-xs text-muted-foreground">Ficha para assinatura no papel, sem CPF. As marcações ficam nesta ficha; gerar o PDF não registra entrega nem altera o valor do VT.</p>
      {pdf && <p role="status" className="text-sm font-medium">Ficha de VT pronta.</p>}
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        {pdf ? <Button onClick={() => { void baixarFichaVt(pdf, data).catch(() => toast.error("Não foi possível baixar a ficha de VT.")); }}><Download /> Baixar ficha de VT</Button>
          : <Button disabled={ocupado || !data || !linhas.length} onClick={gerar}><FileText /> {ocupado ? "Gerando…" : "Gerar ficha de VT"}</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}