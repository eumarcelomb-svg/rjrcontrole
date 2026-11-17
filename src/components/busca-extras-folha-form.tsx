import { useState } from "react";
import { Search, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtH, type Colaborador, type Jornada, type Salarios } from "@/lib/frequencia";
import { buscarExtrasPeriodo, type ResultadoBuscaExtras } from "@/lib/busca-extras-folha";
import { lerFrequenciaIntervalo, listarAjustesFolha, listarFechamentos, salvarAjustesFolhaLote } from "@/lib/folha-nuvem";

type Props = { dataPagamento: string; cols: Colaborador[]; jornada: Jornada; salarios: Salarios; onSaved: () => Promise<void>; onCancel: () => void };
const br = (s: string) => s.split("-").reverse().join("/");

export function BuscaExtrasFolhaForm({ dataPagamento, cols, jornada, salarios, onSaved, onCancel }: Props) {
  const [inicio, setInicio] = useState("2026-11-02");
  const [fim, setFim] = useState("2026-11-08");
  const [resultado, setResultado] = useState<ResultadoBuscaExtras | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const ajustes = resultado?.flatMap((r) => r.ajustes) ?? [];
  const incluidos = resultado?.filter((r) => r.ajustes.length).length ?? 0;
  const horas50 = resultado?.reduce((t, r) => t + r.horas50, 0) ?? 0;
  const horas100 = resultado?.reduce((t, r) => t + r.horas100, 0) ?? 0;
  function alterar(a: string, b: string) { setInicio(a); setFim(b); setResultado(null); setErro(""); }

  async function buscar(e: React.FormEvent) {
    e.preventDefault(); setOcupado(true); setErro(""); setResultado(null);
    try {
      const [registros, existentes, fechamentos] = await Promise.all([lerFrequenciaIntervalo(inicio, fim), listarAjustesFolha(), listarFechamentos()]);
      setResultado(buscarExtrasPeriodo(dataPagamento, inicio, fim, cols, registros.marcas, registros.horas, jornada, registros.pontos, salarios, existentes, fechamentos));
    } catch (e) { setErro((e as Error).message); }
    finally { setOcupado(false); }
  }

  async function adicionar() {
    setOcupado(true); setErro("");
    try {
      // Atualiza as exclusões antes de gravar para não repetir um ajuste feito desde a busca.
      const [existentes, fechamentos, registros] = await Promise.all([listarAjustesFolha(), listarFechamentos(), lerFrequenciaIntervalo(inicio, fim)]);
      const atual = buscarExtrasPeriodo(dataPagamento, inicio, fim, cols, registros.marcas, registros.horas, jornada, registros.pontos, salarios, existentes, fechamentos);
      const novos = atual.flatMap((r) => r.ajustes);
      if (JSON.stringify(novos) !== JSON.stringify(ajustes)) {
        setResultado(atual); throw new Error("Os registros mudaram. Confira o resultado atualizado antes de adicionar.");
      }
      await salvarAjustesFolhaLote(novos);
      setResultado(null);
      await onSaved();
      toast.success(`Extras adicionadas para ${incluidos} colaboradores.`);
    } catch (e) { setErro((e as Error).message); }
    finally { setOcupado(false); }
  }

  return <form onSubmit={buscar} className="space-y-3 border-y py-3">
    <h4 className="text-sm font-semibold">Buscar extras anteriores de todos os colaboradores</h4>
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={() => alterar("2026-11-02", "2026-11-08")}>02/11 a 08/11/2026</Button>
      <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={() => alterar("2026-11-09", "2026-11-15")}>09/11 a 15/11/2026</Button>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <label className="min-w-0 space-y-1 text-sm">Início das extras<Input aria-label="Início das extras" type="date" required value={inicio} onChange={(e) => alterar(e.target.value, fim)} disabled={ocupado} /></label>
      <label className="min-w-0 space-y-1 text-sm">Fim das extras<Input aria-label="Fim das extras" type="date" required value={fim} onChange={(e) => alterar(inicio, e.target.value)} disabled={ocupado} /></label>
    </div>
    <Button type="submit" variant="outline" disabled={ocupado}><Search />{ocupado ? "Aguarde…" : "Buscar extras"}</Button>
    {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    {resultado && <div className="space-y-2" aria-live="polite">
      {!resultado.length ? <p className="text-sm text-muted-foreground">Nenhuma hora extra encontrada nos registros deste intervalo.</p> : <>
        <p className="text-sm font-medium">{incluidos} colaboradores disponíveis · 50%: {fmtH(horas50)} · 100%: {fmtH(horas100)}</p>
        {resultado.map((r) => <div key={r.colaborador.id} className="border-b py-2 text-sm">
          <p className="font-medium">{r.colaborador.nome}{!r.colaborador.ativo && " (Desligado)"}</p>
          <p className="text-xs text-muted-foreground">{r.colaborador.funcao}</p>
          {r.extras.map((e) => <div key={e.data} className="flex flex-wrap justify-between gap-x-2 text-xs"><span>{br(e.data)} · {fmtH(e.horas)} · {e.pct}%</span><span className="text-muted-foreground">{e.bloqueio || "Disponível para adicionar"}</span></div>)}
        </div>)}
        {!ajustes.length && <p className="text-sm text-muted-foreground">Todas as extras encontradas já estão contabilizadas. Nenhum valor será duplicado.</p>}
      </>}
    </div>}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={ocupado} onClick={onCancel}><X />Cancelar</Button><Button type="button" disabled={ocupado || !ajustes.length} onClick={adicionar}><Plus />Adicionar extras de todos</Button></div>
  </form>;
}