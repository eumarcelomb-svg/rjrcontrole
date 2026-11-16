import { useState } from "react";
import { toast } from "sonner";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ordenarColaboradores, fmtH, type Colaborador } from "@/lib/frequencia";
import { ajusteFolhaSchema, lerHorasExtras, type AjusteFolha } from "@/lib/ajustes-folha";
import { salvarAjusteFolha } from "@/lib/folha-nuvem";

type Props = { dataPagamento: string; cols: Colaborador[]; ajuste?: AjusteFolha; onSaved: () => Promise<void>; onCancel: () => void };

export function AjusteFolhaForm({ dataPagamento, cols, ajuste, onSaved, onCancel }: Props) {
  const [colaborador, setColaborador] = useState(ajuste?.colaborador_id ?? "");
  const [inicio, setInicio] = useState(ajuste?.periodo_inicio ?? "2026-11-02");
  const [fim, setFim] = useState(ajuste?.periodo_fim ?? "2026-11-08");
  const [h50, setH50] = useState(ajuste ? fmtH(ajuste.horas50) : "");
  const [h100, setH100] = useState(ajuste ? fmtH(ajuste.horas100) : "");
  const [motivo, setMotivo] = useState(ajuste?.motivo ?? "Correção de extras não medidas anteriormente");
  const [ocupado, setOcupado] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    try {
      const col = cols.find((c) => c.id === colaborador);
      if (!col) throw new Error("Selecione um colaborador.");
      const dados = ajusteFolhaSchema.parse({ id: ajuste?.id, data_pagamento: dataPagamento, colaborador_id: col.id, colaborador_nome: col.nome, periodo_inicio: inicio, periodo_fim: fim, horas50: lerHorasExtras(h50), horas100: lerHorasExtras(h100), motivo });
      await salvarAjusteFolha(dados);
      await onSaved();
      toast.success("Ajuste de extras salvo.");
    } catch (e) {
      const erro = e as Error & { issues?: { message: string }[] };
      toast.error(erro.issues?.[0]?.message ?? erro.message);
    } finally { setOcupado(false); }
  }

  return <form className="space-y-3 border-y py-3" onSubmit={salvar}>
    <h4 className="text-sm font-semibold">{ajuste ? "Editar ajuste de extras" : "Adicionar extras anteriores"}</h4>
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => { setInicio("2026-11-02"); setFim("2026-11-08"); }}>02/11 a 08/11/2026</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => { setInicio("2026-11-09"); setFim("2026-11-15"); }}>09/11 a 15/11/2026</Button>
    </div>
    <label className="block space-y-1 text-sm">Colaborador
      <select required className="block h-9 w-full rounded-md border bg-background px-2" value={colaborador} onChange={(e) => setColaborador(e.target.value)} disabled={ocupado || !!ajuste}>
        <option value="">Selecionar colaborador</option>
        {ordenarColaboradores(cols).map((c) => <option key={c.id} value={c.id}>{c.nome}{!c.ativo && " (Desligado)"}</option>)}
      </select>
    </label>
    <div className="grid grid-cols-2 gap-3">
      <label className="min-w-0 space-y-1 text-sm">Início das extras<Input aria-label="Início das extras" type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} disabled={ocupado} /></label>
      <label className="min-w-0 space-y-1 text-sm">Fim das extras<Input aria-label="Fim das extras" type="date" required value={fim} onChange={(e) => setFim(e.target.value)} disabled={ocupado} /></label>
      <label className="min-w-0 space-y-1 text-sm">Horas extras 50%<Input aria-label="Horas extras 50%" placeholder="0:00" value={h50} onChange={(e) => setH50(e.target.value)} disabled={ocupado} /></label>
      <label className="min-w-0 space-y-1 text-sm">Horas extras 100%<Input aria-label="Horas extras 100%" placeholder="0:00" value={h100} onChange={(e) => setH100(e.target.value)} disabled={ocupado} /></label>
    </div>
    <label className="block space-y-1 text-sm">Motivo<Input required aria-label="Motivo do ajuste" value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={ocupado} /></label>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={ocupado} onClick={onCancel}><X />Cancelar</Button><Button disabled={ocupado} type="submit"><Save />{ocupado ? "Salvando…" : "Salvar ajuste"}</Button></div>
  </form>;
}