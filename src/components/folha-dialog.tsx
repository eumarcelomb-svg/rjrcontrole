import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtH, fmtR, type Colaborador, type Horas, type Jornada, type Marcas, type Pontos, type Salarios } from "@/lib/frequencia";
import { calcularFolha, datasPagamento, proximoPagamento } from "@/lib/folha";
import { excluirFechamento, listarFechamentos, salvarFechamento, type Fechamento } from "@/lib/folha-nuvem";

const br = (s: string) => s.split("-").reverse().join("/");

type Props = { cols: Colaborador[]; marcas: Marcas; horas: Horas; jornada: Jornada; pontos: Pontos; salarios: Salarios; onClose: () => void };

export function FolhaDialog({ cols, marcas, horas, jornada, pontos, salarios, onClose }: Props) {
  const [data, setData] = useState(() => proximoPagamento(new Date()));
  const [hist, setHist] = useState<Fechamento[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [ver, setVer] = useState<Fechamento | null>(null);
  const opcoes = useMemo(() => datasPagamento(new Date(), 6, 3), []);
  const folha = useMemo(() => calcularFolha(data, cols, marcas, horas, jornada, pontos, salarios), [data, cols, marcas, horas, jornada, pontos, salarios]);
  const recarregar = () => listarFechamentos().then(setHist).catch((e) => toast.error(e.message));
  useEffect(() => { recarregar(); }, []);
  const jaFechado = hist.find((f) => f.data_pagamento === data);
  const itens = ver ? ver.itens : folha.itens;

  async function fechar() {
    setOcupado(true);
    try {
      await salvarFechamento({ data_pagamento: data, periodo_inicio: folha.inicio, periodo_fim: folha.fim, itens: folha.itens, total: folha.total });
      toast.success(`Folha de ${br(data)} fechada.`);
      await recarregar();
    } catch (e) { toast.error((e as Error).message); } finally { setOcupado(false); }
  }
  async function excluir(f: Fechamento) {
    if (!confirm(`Excluir o fechamento de ${br(f.data_pagamento)}?`)) return;
    try { await excluirFechamento(f.id); if (ver?.id === f.id) setVer(null); await recarregar(); } catch (e) { toast.error((e as Error).message); }
  }

  return <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Fechamento da folha</DialogTitle>
        <DialogDescription>Dia 20 paga de 01 a 15 · dia 05 paga de 16 ao fim do mês anterior · 50% do salário + horas extras do período</DialogDescription>
      </DialogHeader>
      {!ver && <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm font-medium">Data de pagamento
          <select className="block h-9 rounded-md border bg-background px-2 text-sm" value={data} onChange={(e) => setData(e.target.value)}>
            {opcoes.map((d) => <option key={d} value={d}>{br(d)}</option>)}
          </select>
        </label>
        <p className="text-sm text-muted-foreground">Período: {br(folha.inicio)} a {br(folha.fim)}{jaFechado && " · já fechada (fechar de novo substitui)"}</p>
      </div>}
      {ver && <div className="flex items-center justify-between text-sm"><span>Fechamento salvo de <b>{br(ver.data_pagamento)}</b> · período {br(ver.periodo_inicio)} a {br(ver.periodo_fim)}</span><Button size="sm" variant="outline" onClick={() => setVer(null)}>Voltar</Button></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Colaborador</th><th className="text-right">50% salário</th><th className="text-right">Extras 50%</th><th className="text-right">Extras 100%</th><th className="text-right">Faltas</th><th className="text-right">Total</th></tr></thead>
          <tbody>{itens.map((i) => <tr key={i.colaborador_id} className="border-b">
            <td className="py-2"><div className="font-medium">{i.nome}</div><div className="text-xs text-muted-foreground">{i.funcao}</div></td>
            <td className="text-right">{fmtR(i.base)}</td>
            <td className="text-right">{fmtH(i.e50)}<div className="text-xs text-muted-foreground">{fmtR(i.v50)}</div></td>
            <td className="text-right">{fmtH(i.e100)}<div className="text-xs text-muted-foreground">{fmtR(i.v100)}</div></td>
            <td className="text-right">{i.faltas}</td>
            <td className="text-right font-semibold">{fmtR(i.total)}</td>
          </tr>)}</tbody>
          <tfoot><tr><td className="py-2 font-semibold" colSpan={5}>Total da folha</td><td className="text-right font-bold">{fmtR(ver ? ver.total : folha.total)}</td></tr></tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Faltas são apenas informadas, sem desconto automático.</p>
      {!ver && <DialogFooter><Button disabled={ocupado || folha.itens.length === 0} onClick={fechar}>{jaFechado ? "Fechar novamente" : "Fechar folha"}</Button></DialogFooter>}
      <div className="space-y-2 border-t pt-3">
        <h3 className="text-sm font-semibold">Folhas fechadas</h3>
        {hist.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma folha fechada ainda.</p>}
        {hist.map((f) => <div key={f.id} className="flex items-center gap-2 text-sm">
          <button className="flex-1 text-left underline-offset-2 hover:underline" onClick={() => setVer(f)}>Pagamento {br(f.data_pagamento)} · {br(f.periodo_inicio)} a {br(f.periodo_fim)}</button>
          <span className="font-medium">{fmtR(Number(f.total))}</span>
          <Button size="icon" variant="ghost" aria-label="Excluir fechamento" onClick={() => excluir(f)}><Trash2 /></Button>
        </div>)}
      </div>
    </DialogContent>
  </Dialog>;
}
