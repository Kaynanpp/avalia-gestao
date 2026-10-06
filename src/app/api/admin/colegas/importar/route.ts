import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { requireRH } from '@/lib/services/auth.service';
import { importCoworkers } from '@/lib/peer/service';
import { peerImportSchema } from '@/lib/peer/validation';
import { assertPeerOrigin, PeerError, peerErrorResponse, peerResponse, readPeerJson } from '@/lib/peer/http';
import { consumeRateLimit, sensitiveActionRateLimitPolicy } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

async function excelToCsv(file: File) {
  if (file.size > 2_000_000) throw new PeerError('Use um arquivo Excel de até 2 MB.');
  const workbook = new ExcelJS.Workbook();
  const input = Buffer.from(await file.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(input);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new PeerError('O arquivo não possui uma planilha para importar.');
  const rows: string[] = [];
  sheet.eachRow({ includeEmpty: false }, (row: ExcelJS.Row) => {
    const values = [1, 2, 3, 4].map((column) => row.getCell(column).text.trim());
    if (values.some(Boolean)) rows.push(values.map(csvCell).join(';'));
  });
  if (rows.length > 501) throw new PeerError('Importe no máximo 500 pessoas por vez.');
  return rows.join('\r\n');
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRH();
    await consumeRateLimit('coworker-import:actor', actor.id, sensitiveActionRateLimitPolicy());
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      assertPeerOrigin(request);
      const form = await request.formData();
      const file = form.get('file');
      const preview = form.get('preview') !== 'false';
      if (!(file instanceof File)) throw new PeerError('Selecione um arquivo CSV ou Excel.');
      const extension = file.name.toLocaleLowerCase('pt-BR');
      let text: string;
      if (extension.endsWith('.xlsx')) text = await excelToCsv(file);
      else if (extension.endsWith('.csv') || extension.endsWith('.txt')) {
        if (file.size > 650_000) throw new PeerError('Use um arquivo CSV de até 650 KB.');
        text = await file.text();
      } else throw new PeerError('Formato não aceito. Envie um arquivo .xlsx ou .csv.');
      return peerResponse(await importCoworkers(text, preview, actor));
    }
    const input = peerImportSchema.parse(await readPeerJson(request, 650000));
    return peerResponse(await importCoworkers(input.text, input.preview, actor));
  } catch (error) {
    return peerErrorResponse(error, request);
  }
}
