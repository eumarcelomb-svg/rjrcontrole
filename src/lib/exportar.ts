import { fmtCpf, iso, type Colaborador, type Marcas } from "./frequencia";

export interface ReportInput {
  titulo: string;
  dias: Date[];
  colaboradores: Colaborador[];
  marcas: Marcas;
}

const dayLabel = (d: Date) =>
  `${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;

function rows({ dias, colaboradores, marcas }: ReportInput) {
  return colaboradores.map((c) => {
    const vals = dias.map((d) => marcas[`${c.id}|${iso(d)}`] ?? "");
    const t = (s: string) => vals.filter((v) => v === s).length;
    return [c.nome, fmtCpf(c.cpf), c.funcao, ...vals, t("P"), t("F"), t("J")];
  });
}
const header = (dias: Date[]) => ["Nome", "CPF", "Função", ...dias.map(dayLabel), "P", "F", "J"];

export async function exportXlsx(input: ReportInput) {
  const XLSX = await import("xlsx");
  const aoa = [[`RJR CONSTRUÇÃO NAVAL — ${input.titulo}`], [], header(input.dias), ...rows(input)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 38 }, { wch: 16 }, { wch: 24 }, ...input.dias.map(() => ({ wch: 7 })), { wch: 4 }, { wch: 4 }, { wch: 4 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Frequência");
  XLSX.writeFile(wb, `frequencia-rjr-${input.titulo.replace(/[^\w]+/g, "-")}.xlsx`);
}

export async function exportPdf(input: ReportInput, logoUrl: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  try {
    const img = await fetch(logoUrl).then((r) => r.blob()).then(
      (b) => new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b); }),
    );
    doc.addImage(img, "JPEG", 10, 8, 30, 14);
  } catch { /* ignore */ }
  doc.setFontSize(14);
  doc.text("LISTA DE PRESENÇA — COLABORADORES RJR CONSTRUÇÃO NAVAL", 45, 14);
  doc.setFontSize(10);
  doc.text(input.titulo, 45, 20);
  const monthly = input.dias.length > 7;
  autoTable(doc, {
    startY: 26,
    head: [[...header(input.dias), ...(monthly ? [] : ["Assinatura"])]],
    body: rows(input).map((r) => (monthly ? r : [...r, ""])),
    styles: { fontSize: monthly ? 6 : 8, cellPadding: monthly ? 1 : 2, halign: "center" },
    headStyles: { fillColor: [20, 45, 80] },
    columnStyles: { 0: { halign: "left" }, 2: { halign: "left" }, ...(monthly ? {} : { [input.dias.length + 6]: { cellWidth: 45 } }) },
    margin: { left: 8, right: 8 },
  });
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  if (y < 195) {
    doc.line(20, y, 110, y); doc.line(180, y, 270, y);
    doc.setFontSize(9);
    doc.text("Encarregado responsável", 45, y + 5);
    doc.text("Supervisão / RH", 210, y + 5);
  }
  doc.save(`frequencia-rjr-${input.titulo.replace(/[^\w]+/g, "-")}.pdf`);
}
