import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtH, fmtR, type Colaborador, type Horas, type Jornada, type Marcas, type Pontos, type Salarios } from "@/lib/frequencia";
import { calcularFolha, datasPagamento, proximoPagamento } from "@/lib/folha";
import { excluirAjusteFolha, listarAjustesFolha, excluirFechamento, listarFechamentos, salvarFechamento, type Fechamento } from "@/lib/folha-nuvem";
import type { AjusteFolha } from "@/lib/ajustes-folha";
import { AjusteFolhaForm } from "@/components/ajuste-folha-form";
import { FolhaPdfActions } from "@/components/folha-pdf-actions";

const br = (s: string) => s.split("-").reverse().join("/");

type Props = { cols: Colaborador[]; marcas: Marcas; horas: Horas; jornada: Jornada; pontos: Pontos; salarios: Salarios; onClose: () => void };

export function FolhaDialog({ cols, marcas, horas, jornada, pontos, salarios, onClose }: Props) {
  const [data, setData] = useState(() => proximoPagamento(new Date()));
  const [hist, setHist] = useState<Fechamento[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [ver, setVer] = useState<Fechamento | null>(null);
  const [ajustes, setAjustes] = useState<AjusteFolha[]>([]);
  const [editando, setEditando] = useState<AjusteFolha | null | undefined>(undefined);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const opcoes = useMemo(() => datasPagamento(new Date(), 6, 3), []);
  const folha = useMemo(() => calcularFolha(data, cols, marcas, horas, jornada, pontos, salarios, ajustes), [data, cols, marcas, horas, jornada, pontos, salarios, ajustes]);
  const recarregar = async () => {
    setCarregando(true);
    setErroCarga("");
    try {
      const [h, a] = await Promise.all([listarFechamentos(), listarAjustesFolha()]);
      setHist(h); setAjustes(a);
    } catch (e) { setErroCarga((e as Error).message); throw e; }
    finally { setCarregando(false); }
  };
  useEffect(() => { void recarregar().catch(() => {}); }, []);
  const jaFechado = hist.find((f) => f.data_pagamento === data);
  const itens = ver ? ver.itens : folha.itens;
  const ajustesVisiveis = ver ? ver.itens.flatMap((i) => i.ajustes ?? []) : ajustes.filter((a) => a.data_pagamento === data);

  async function fechar() {
    if (carregando || erroCarga || editando !== undefined) return;
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
  async function removerAjuste(a: AjusteFolha) {
    if (!a.id || !confirm(`Excluir o ajuste de ${a.colaborador_nome}, de ${br(a.periodo_inicio)} a ${br(a.periodo_fim)}?`)) return;
    setOcupado(true);
    try { await excluirAjusteFolha(a.id); await recarregar(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setOcupado(false); }
  }

  return <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Fechamento da folha</DialogTitle>
        <DialogDescription>Dia 20 paga de 01 a 15 · dia 05 paga de 16 ao fim do mês anterior · 50% do salário + horas extras do período</DialogDescription>
      </DialogHeader>
      {!ver && <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm font-medium">Data de pagamento
          <select aria-label="Data de pagamento" disabled={ocupado || editando !== undefined} className="block h-9 rounded-md border bg-background px-2 text-sm" value={data} onChange={(e) => setData(e.target.value)}>
            {opcoes.map((d) => <option key={d} value={d}>{br(d)}</option>)}
          </select>
        </label>
        <p className="text-sm text-muted-foreground">Período: {br(folha.inicio)} a {br(folha.fim)}{jaFechado && " · já fechada (fechar de novo substitui)"}</p>
      </div>}
      {carregando && <p className="text-sm text-muted-foreground">Carregando fechamentos e ajustes…</p>}
      {erroCarga && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{erroCarga}</p><Button variant="outline" onClick={() => void recarregar().catch(() => {})}><RotateCw />Tentar novamente</Button></div>}
      {ver && <div className="flex items-center justify-between text-sm"><span>Fechamento salvo de <b>{br(ver.data_pagamento)}</b> · período {br(ver.periodo_inicio)} a {br(ver.periodo_fim)}</span><Button size="sm" variant="outline" onClick={() => setVer(null)}>Voltar</Button></div>}
      {ver && <FolhaPdfActions key={`${ver.id}-${ver.created_at}`} fechamento={ver} />}
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
      <section className="space-y-3 border-t pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Ajustes de extras anteriores</h3>{!ver && <Button size="sm" variant="outline" disabled={ocupado || carregando || !!erroCarga || editando !== undefined} onClick={() => setEditando(null)}><Plus />Adicionar extras anteriores</Button>}</div>
        {!ver && <p className="text-xs text-muted-foreground">Informe somente extras que ainda não foram contabilizadas. O ajuste vale apenas para o pagamento selecionado e não altera a frequência.</p>}
        {!ver && jaFechado && <p className="text-xs text-muted-foreground">Os ajustes serão incluídos no fechamento salvo ao fechar novamente.</p>}
        {!ver && editando !== undefined && <AjusteFolhaForm key={editando?.id ?? "novo"} dataPagamento={data} cols={cols} {...(editando ? { ajuste: editando } : {})} onCancel={() => setEditando(undefined)} onSaved={async () => { await recarregar(); setEditando(undefined); }} />}
        {ajustesVisiveis.length === 0 && <p className="text-sm text-muted-foreground">Nenhum ajuste de extras nesta folha.</p>}
        {ajustesVisiveis.map((a, idx) => <div key={a.id ?? idx} className="flex items-start gap-2 border-b pb-2 text-sm">
          <div className="min-w-0 flex-1"><div className="font-medium">{a.colaborador_nome}</div><div>{br(a.periodo_inicio)} a {br(a.periodo_fim)}</div><div>50%: {fmtH(a.horas50)} · 100%: {fmtH(a.horas100)}</div><p className="break-words text-xs text-muted-foreground">{a.motivo}</p></div>
          {!ver && <><Button size="icon" variant="ghost" title="Editar ajuste" aria-label={`Editar ajuste de ${a.colaborador_nome}`} disabled={ocupado || editando !== undefined} onClick={() => setEditando(a)}><Pencil /></Button><Button size="icon" variant="ghost" title="Excluir ajuste" aria-label={`Excluir ajuste de ${a.colaborador_nome}`} disabled={ocupado || editando !== undefined} onClick={() => removerAjuste(a)}><Trash2 /></Button></>}
        </div>)}
      </section>
      {!ver && <DialogFooter><Button disabled={ocupado || carregando || !!erroCarga || editando !== undefined || folha.itens.length === 0} onClick={fechar}>{jaFechado ? "Fechar novamente" : "Fechar folha"}</Button></DialogFooter>}
      <div className="space-y-2 border-t pt-3">
        <h3 className="text-sm font-semibold">Folhas fechadas</h3>
        {hist.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma folha fechada ainda.</p>}
        {hist.map((f) => <div key={f.id} className="flex items-center gap-2 text-sm">
          <Button variant="link" className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-0 text-left" disabled={ocupado || editando !== undefined} onClick={() => setVer(f)}>Pagamento {br(f.data_pagamento)} · {br(f.periodo_inicio)} a {br(f.periodo_fim)}</Button>
          <span className="font-medium">{fmtR(Number(f.total))}</span>
          <Button size="icon" variant="ghost" aria-label="Excluir fechamento" onClick={() => excluir(f)}><Trash2 /></Button>
        </div>)}
      </div>
    </DialogContent>
  </Dialog>;
}
