import { z } from "zod";
import type { Estado } from "./nuvem";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
});
const minuto = z.number().int().min(0).max(1439);
const estadoSchema = z.object({
  cols: z.array(z.object({ id: z.string().uuid(), nome: z.string().trim().min(1), cpf: z.string().regex(/^\d{11}$/), funcao: z.string().min(1), ativo: z.boolean() })),
  marcas: z.record(z.enum(["P", "F", "J"])),
  horas: z.record(z.number().finite().min(0).max(24)),
  pontos: z.record(z.object({ e: minuto.optional(), s: minuto.optional() })),
  jornada: z.object({ feriados: z.array(data) }),
  salarios: z.object({ porFuncao: z.record(z.number().finite().nonnegative()), divisor: z.number().finite().positive(), pct50: z.number().finite().nonnegative(), pct100: z.number().finite().nonnegative() }),
}).superRefine((e, ctx) => {
  const ids = new Set(e.cols.map((c) => c.id));
  if (ids.size !== e.cols.length || new Set(e.cols.map((c) => c.cpf)).size !== e.cols.length) ctx.addIssue({ code: "custom", message: "Colaboradores duplicados" });
  for (const key of new Set([...Object.keys(e.marcas), ...Object.keys(e.horas), ...Object.keys(e.pontos)])) {
    const [id, dia, extra] = key.split("|");
    if (!id || !ids.has(id) || !data.safeParse(dia).success || extra !== undefined) ctx.addIssue({ code: "custom", message: "Registro sem colaborador ou data válida" });
  }
  if (new Set(e.jornada.feriados).size !== e.jornada.feriados.length) ctx.addIssue({ code: "custom", message: "Feriados duplicados" });
});
const schema = z.object({ aplicativo: z.literal("rjr-frequencia"), versao: z.literal(1), exportadoEm: z.string().datetime(), dados: estadoSchema });

export function criarBackup(dados: Estado): string {
  return JSON.stringify(schema.parse({ aplicativo: "rjr-frequencia", versao: 1, exportadoEm: new Date().toISOString(), dados }), null, 2);
}
export function lerBackup(texto: string): Estado {
  try { return schema.parse(JSON.parse(texto)).dados; }
  catch { throw new Error("Arquivo inválido ou incompatível. Selecione um backup JSON exportado pela planilha RJR."); }
}
export function contarRegistros(e: Estado) {
  return new Set([...Object.keys(e.marcas), ...Object.keys(e.horas), ...Object.keys(e.pontos)]).size;
}
export function baixarBackup(texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: "application/json;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `backup-rjr-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}