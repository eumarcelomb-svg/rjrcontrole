import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { iso, ordenarColaboradores } from "@/lib/frequencia";
import { entregaEpiSchema, type ColaboradorEpi, type DadosEntregaEpi, type EntregaEpi } from "@/lib/entregas-epi";
import { salvarEntregaEpi } from "@/lib/entregas-epi.functions";

export function EntregaEpiDialog({ colaboradores, entrega, onClose, onSaved }: { colaboradores: ColaboradorEpi[]; entrega: EntregaEpi | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<DadosEntregaEpi>(() => entrega ?? { colaborador_id: "", equipamento: "", quantidade: 1, ca: "", data_entrega: iso(new Date()), responsavel: "", observacoes: "", assinatura_confirmada: false });
  const [ocupado, setOcupado] = useState(false);
  const lista = ordenarColaboradores(colaboradores.map((c) => ({ ...c, cpf: "" })));
  const set = <K extends keyof DadosEntregaEpi>(key: K, value: DadosEntregaEpi[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    const validacao = entregaEpiSchema.safeParse(form);
    if (!validacao.success) { toast.error(validacao.error.issues[0]?.message ?? "Confira os dados."); return; }
    setOcupado(true);
    try {
      await salvarEntregaEpi({ data: validacao.data });
      toast.success(entrega ? "Entrega atualizada." : "Entrega registrada.");
      await onSaved();
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setOcupado(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !ocupado) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{entrega ? "Editar entrega de EPI" : "Registrar entrega de EPI"}</DialogTitle><DialogDescription>Dados do recebimento pelo colaborador</DialogDescription></DialogHeader>
      <form onSubmit={salvar} className="space-y-4">
        <fieldset disabled={ocupado} className="space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium" htmlFor="epi-colaborador">Colaborador</label><Select value={form.colaborador_id} onValueChange={(v) => set("colaborador_id", v)} disabled={ocupado}><SelectTrigger id="epi-colaborador"><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger><SelectContent>{lista.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}{!c.ativo ? " · Inativo" : ""}</SelectItem>)}</SelectContent></Select>
          {lista.find((c) => c.id === form.colaborador_id) && <p className="text-xs text-muted-foreground">{lista.find((c) => c.id === form.colaborador_id)?.funcao}</p>}</div>
          <div className="space-y-1.5"><label htmlFor="epi-equipamento" className="text-sm font-medium">EPI / equipamento</label><Input id="epi-equipamento" required maxLength={200} value={form.equipamento} onChange={(e) => set("equipamento", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><label htmlFor="epi-quantidade" className="text-sm font-medium">Quantidade</label><Input id="epi-quantidade" type="number" required min={1} step={1} value={Number.isNaN(form.quantidade) ? "" : form.quantidade} onChange={(e) => set("quantidade", e.target.valueAsNumber)} /></div><div className="space-y-1.5"><label htmlFor="epi-ca" className="text-sm font-medium">CA (opcional)</label><Input id="epi-ca" maxLength={80} value={form.ca} onChange={(e) => set("ca", e.target.value)} /></div></div>
          <div className="space-y-1.5"><label htmlFor="epi-data" className="text-sm font-medium">Data da entrega</label><Input id="epi-data" type="date" required value={form.data_entrega} onChange={(e) => set("data_entrega", e.target.value)} /></div>
          <div className="space-y-1.5"><label htmlFor="epi-responsavel" className="text-sm font-medium">Responsável pela entrega (opcional)</label><Input id="epi-responsavel" maxLength={200} value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} /></div>
          <div className="space-y-1.5"><label htmlFor="epi-observacoes" className="text-sm font-medium">Observações (opcional)</label><Textarea id="epi-observacoes" maxLength={2000} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></div>
          <label className="flex items-start gap-3 text-sm"><Checkbox checked={form.assinatura_confirmada} disabled={ocupado} onCheckedChange={(v) => set("assinatura_confirmada", v === true)} /><span>Recebimento confirmado com assinatura na ficha em papel</span></label>
        </fieldset>
        <DialogFooter className="gap-2"><Button type="button" variant="outline" disabled={ocupado} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={ocupado}><Save />{ocupado ? "Salvando…" : "Salvar entrega"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}