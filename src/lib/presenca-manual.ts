import { ordenarColaboradores, type Colaborador } from "./frequencia";

export async function criarPresencaManual(colaboradores: Colaborador[], data: string): Promise<Blob> {
  if (!colaboradores.length) throw new Error("Nenhum colaborador selecionado.");
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [ano, mes, dia] = data.split("-");
  autoTable(doc, {
    startY: 46,
    head: [["Nome", "Função", "Assinatura do colaborador"]],
    body: ordenarColaboradores(colaboradores).map((c) => [c.nome, c.funcao, ""]),
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3, minCellHeight: 14, textColor: 0, lineColor: 140, lineWidth: 0.2, valign: "middle" },
    headStyles: { fillColor: 235, textColor: 0, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 67 }, 1: { cellWidth: 47 }, 2: { cellWidth: 68 } },
    margin: { top: 46, bottom: 20, left: 14, right: 14 },
    rowPageBreak: "avoid",
    didDrawPage: () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("RJR CONSTRUÇÃO NAVAL", 14, 20);
      doc.setFontSize(12);
      doc.text("FICHA DE PRESENÇA MANUAL", 14, 29);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Data: ${dia}/${mes}/${ano}`, 14, 39);
    },
  });
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.text(`RJR Construção Naval · Presença manual · ${p}/${total}`, 14, 287);
  }
  return doc.output("blob");
}

export async function baixarPresencaManual(blob: Blob, data: string) {
  const filename = `presenca-manual-rjr-${data}.pdf`;
  const file = new File([blob], filename, { type: "application/pdf" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Ficha de presença manual" }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}