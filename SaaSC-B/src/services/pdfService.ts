import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function pdfEscape(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').replace(/([()\\])/g, '\\$1');
}

export async function createStatementPdf(lines: string[], filename: string) {
  const directory = path.resolve('uploads', 'estados-cuenta');
  await mkdir(directory, { recursive: true });
  const content = lines.map((line, index) => `BT /F1 ${index === 0 ? 18 : 11} Tf 54 ${760 - index * 24} Td (${pdfEscape(line)}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const filePath = path.join(directory, filename);
  await writeFile(filePath, pdf, 'binary');
  return filePath.replace(/\\/g, '/');
}
