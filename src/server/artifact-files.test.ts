import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { exportCanvas, extractAttachment } from "./artifact-files";
import { validateCanvas } from "@/core/workspace-artifacts";
test("XLSX preserva dados e separa exemplo das linhas reais",async()=>{
  const content=validateCanvas({kind:"SPREADSHEET",title:"Medição",purpose:"Contar peças",instructions:"Preencha ao concluir",sections:[],columns:["Pedido","Peças"],rows:[["P01","12"]],example:["EXEMPLO","5"]});
  const file=await exportCanvas(content,"xlsx"),book=new ExcelJS.Workbook();await book.xlsx.load(file.data as never);
  assert.equal(book.getWorksheet("Preencher")?.getCell("B2").text,"12");
  assert.equal(book.getWorksheet("Preencher")?.rowCount,2);
  assert.ok(book.getWorksheet("Como usar"));
  assert.match((await extractAttachment("teste.xlsx",file.data)).text!,/P01/);
});
test("DOCX abre como documento válido com acentos e instruções",async()=>{
  const content=validateCanvas({kind:"DOCUMENT",title:"Descrição de cargo",purpose:"Combinar responsabilidades",instructions:"Preencha antes de contratar",sections:[{heading:"Responsável",body:"A preencher"}],columns:[],rows:[],example:[]});
  const file=await exportCanvas(content,"docx");const text=(await mammoth.extractRawText({buffer:file.data})).value;
  assert.match(text,/Descrição de cargo/);assert.match(text,/Responsável/);
});
test("CSV com ponto e vírgula e valores citados é extraído com origem por linha",async()=>{
  const result=await extractAttachment("medicao.csv",Buffer.from('Pedido;Observação\nP01;"Parou; faltou material"'));
  assert.match(result.text!,/Linha 2/);assert.match(result.text!,/Parou; faltou material/);
});
