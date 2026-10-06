import { NextResponse } from 'next/server';
import { PRODUCT } from '@/lib/product';
import ExcelJS from 'exceljs';
import { requireRH } from '@/lib/services/auth.service';
import { getDepartments } from '@/lib/services/departments.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRH();
    const departments = (await getDepartments(true)).map((department) => department.name);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = PRODUCT.name;
    const sheet = workbook.addWorksheet('Colaboradores', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = [
      { header: 'Nome', key: 'name', width: 34 },
      { header: 'Matrícula', key: 'registration', width: 18 },
      { header: 'Setor', key: 'department', width: 28 },
      { header: 'Cargo/Função', key: 'position', width: 30 },
    ];
    sheet.addRow({ name: 'Pessoa de exemplo', registration: '0001', department: departments[0] || 'Produção', position: 'Auxiliar de produção' });
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
    header.height = 24;
    sheet.autoFilter = 'A1:D1';
    const guide = workbook.addWorksheet('Orientações');
    guide.columns = [{ header: 'Orientação', key: 'text', width: 110 }];
    guide.addRows([
      { text: 'Não altere os nomes das quatro colunas da planilha Colaboradores.' },
      { text: 'A matrícula é obrigatória, deve ser única e pode conter letras, números, ponto, hífen e sublinhado.' },
      { text: 'O setor deve estar escrito exatamente como aparece na lista abaixo.' },
      { text: 'O sistema exibirá uma prévia e não importará nenhuma linha enquanto houver erros.' },
      { text: '' },
      { text: `Setores ativos: ${departments.join(' · ') || 'nenhum setor ativo cadastrado'}` },
    ]);
    guide.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    guide.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    const file = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="modelo-colaboradores-avaliagestao.xlsx"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message === 'Não autenticado' ? 401 : 403;
    return NextResponse.json({ success: false, error: status === 401 ? 'Entre novamente para continuar.' : 'Acesso restrito ao RH/DP.' }, { status });
  }
}
