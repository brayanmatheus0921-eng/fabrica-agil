import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { parse } from "csv-parse/sync";
import mammoth from "mammoth";
import { canvasCsv, type CanvasContent } from "@/core/workspace-artifacts";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export function attachmentType(name: string, data: Buffer) {
  if (!data.length || data.length > MAX_FILE_BYTES) throw new Error("Envie um arquivo de até 5 MB.");
  const ext = name.split(".").at(-1)?.toLowerCase();
  if (ext === "png" && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if ((ext === "jpg" || ext === "jpeg") && data[0] === 255 && data[1] === 216 && data[2] === 255) return "image/jpeg";
  if (ext === "csv" && !data.includes(0)) return "text/csv";
  if ((ext === "xlsx" || ext === "docx") && data.readUInt32LE(0) === 0x04034b50) {
    // Bound advertised ZIP expansion before handing office files to parsers.
    let total = 0, entries = 0;
    for (let i = 0; i + 46 <= data.length; i++) {
      if (data.readUInt32LE(i) !== 0x02014b50) continue;
      total += data.readUInt32LE(i + 24); entries++;
      if (total > 30 * 1024 * 1024 || entries > 1500) throw new Error("Arquivo muito complexo. Envie uma versão menor ou CSV.");
      i += 45 + data.readUInt16LE(i + 28) + data.readUInt16LE(i + 30) + data.readUInt16LE(i + 32);
    }
    return ext === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  throw new Error("Formato não aceito. Use CSV, XLSX, DOCX, JPG ou PNG.");
}
export async function extractAttachment(name: string, data: Buffer) {
  const mime = attachmentType(name, data);
  if (mime.startsWith("image/")) return { text: null, image: { mime, base64: data.toString("base64") } };
  let text = "";
  if (mime === "text/csv") {
    const raw = data.toString("utf8");
    const delimiter = raw.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
    const rows = parse(raw, { delimiter, bom: true, skip_empty_lines: true, max_record_size: 15000, to: 501 }) as string[][];
    if (rows.length > 500) throw new Error("Envie até 500 linhas por arquivo para uma leitura completa.");
    text = rows.map((r, i) => `Linha ${i + 1}: ${JSON.stringify(r)}`).join("\n");
  } else if (mime.includes("spreadsheet")) {
    const book = new ExcelJS.Workbook(); await book.xlsx.load(data as never);
    const lines: string[] = []; let count = 0;
    book.eachSheet(sheet => sheet.eachRow((row, i) => {
      count++; if (count > 500) throw new Error("Envie até 500 linhas por arquivo.");
      const cells: string[] = []; row.eachCell({ includeEmpty: true }, cell => { if (cells.length > 30) throw new Error("Envie até 30 colunas por planilha."); cells.push(cell.text); });
      lines.push(`${sheet.name} · linha ${i}: ${JSON.stringify(cells)}`);
    })); text = lines.join("\n");
  } else { text = (await mammoth.extractRawText({ buffer: data })).value; }
  if (text.length > 60000) throw new Error("O conteúdo é grande. Divida o arquivo em partes menores.");
  if (!text.trim()) throw new Error("Não encontrei texto ou dados. Envie uma foto legível ou um arquivo preenchido.");
  return { text, image: undefined };
}
export async function exportCanvas(content: CanvasContent, format: string) {
  if (format === "csv" && content.kind === "SPREADSHEET") return { data: Buffer.from(canvasCsv(content)), mime: "text/csv; charset=utf-8" };
  if (format === "xlsx" && content.kind === "SPREADSHEET") {
    const book = new ExcelJS.Workbook(); book.creator = "Fábrica Ágil";
    const sheet = book.addWorksheet("Preencher", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = content.columns.map(header => ({ header, width: 26 }));
    content.rows.forEach(row => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).height = 28;
    sheet.getRow(1).eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16324F" } }; });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: content.columns.length } };
    const help = book.addWorksheet("Como usar"); help.columns = [{ width: 30 }, { width: 90 }];
    help.addRows([[content.title], ["Objetivo", content.purpose], ["Como preencher", content.instructions], ["Exemplo fictício — não é resultado"]]);
    help.addRow(content.columns); help.addRow(content.example);
    help.eachRow(row => { row.alignment = { wrapText: true, vertical: "top" }; row.height = 45; });
    return { data: Buffer.from(await book.xlsx.writeBuffer()), mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  }
  if (format === "docx" && content.kind === "DOCUMENT") {
    const doc = new Document({ creator: "Fábrica Ágil", title: content.title, styles: { default: { document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { after: 160 } } } } }, sections: [{ children: [
      new Paragraph({ text: content.title, heading: HeadingLevel.TITLE }),
      new Paragraph(content.purpose), new Paragraph({ children: [new TextRun({ text: "Como preencher: ", bold: true }), new TextRun(content.instructions)] }),
      ...content.sections.flatMap(s => [new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_2 }), ...s.body.split("\n").map(line => new Paragraph(line || " "))]),
    ] }] }); return { data: await Packer.toBuffer(doc), mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }
  throw new Error("Formato incompatível com esta ferramenta.");
}
