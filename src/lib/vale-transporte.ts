import { addDays, iso, mondayOf, ordenarColaboradores, type Colaborador } from "./frequencia";

export const VALOR_VT = 50;
export const segundaVt = (data: Date) => iso(mondayOf(data));
export function periodoVt(data: string) {
  const inicio = mondayOf(new Date(`${data}T12:00:00`));
  return { inicio: iso(inicio), fim: iso(addDays(inicio, 6)) };
}
export function linhasVt(colaboradores: Colaborador[], transportados: string[] = []) {
  return ordenarColaboradores(colaboradores).map((c) => ({
    id: c.id, nome: c.nome, funcao: c.funcao, valor: VALOR_VT, transportado: transportados.includes(c.id),
  }));
}
const dataBr = (data: string) => data.split("-").reverse().join("/");

/** Ficha para assinatura no papel; gerar não registra uma entrega. */
export async function criarFichaVt(colaboradores: Colaborador[], data: string, transportados: string[] = []): Promise<Blob> {
  if (!colaboradores.length || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !Number.isFinite(new Date(`${data}T12:00:00`).getTime())) throw new Error("Dados inválidos para a ficha.");
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const periodo = periodoVt(data);
  const linhas = linhasVt(colaboradores, transportados);
  autoTable(doc, {
    startY: 51,
    head: [["Nome do colaborador", "Função", "VT semanal", "Transportado por colega", "Assinatura de recebimento"]],
    body: linhas.map((c) => [c.nome, c.funcao, "R$ 50,00", "", ""]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, minCellHeight: 15, textColor: 0, lineColor: 140, lineWidth: 0.2, valign: "middle" },
    headStyles: { fillColor: 235, textColor: 0, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 50 }, 2: { cellWidth: 25 }, 3: { cellWidth: 39 }, 4: { cellWidth: 75 } },
    margin: { top: 51, bottom: 21, left: 14, right: 14 },
    rowPageBreak: "avoid",
    didDrawCell: (cell) => {
      if (cell.section !== "body" || cell.column.index !== 3) return;
      const x = cell.cell.x + cell.cell.width / 2 - 2.5;
      const y = cell.cell.y + cell.cell.height / 2 - 2.5;
      doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(x, y, 5, 5);
      if (linhas[cell.row.index]?.transportado) {
        doc.line(x + 1, y + 1, x + 4, y + 4); doc.line(x + 4, y + 1, x + 1, y + 4);
      }
    },
    didDrawPage: () => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(15);
      doc.text("RJR CONSTRUÇÃO NAVAL", 14, 19);
      doc.setFontSize(12); doc.text("CONTROLE DE RECEBIMENTO DE VALE-TRANSPORTE (VT)", 14, 28);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.text(`Semana: ${dataBr(periodo.inicio)} a ${dataBr(periodo.fim)}    |    Entrega: ${dataBr(data)}`, 14, 37);
      doc.text("VT: R$ 50,00 por colaborador / semana · Entrega habitual: segunda-feira", 14, 44);
      doc.setFontSize(9); doc.text("Quadrado marcado: colaborador transportado por outro colaborador. Assinatura confirma o recebimento do VT.", 14, 195);
    },
  });
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p); doc.setFontSize(8); doc.text(`RJR Construção Naval · Vale-transporte · ${p}/${doc.getNumberOfPages()}`, 14, 203);
  }
  return doc.output("blob");
}

export async function baixarFichaVt(blob: Blob, data: string) {
  const filename = `vale-transporte-rjr-${data}.pdf`;
  const file = new File([blob], filename, { type: "application/pdf" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Recebimento de VT" }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}