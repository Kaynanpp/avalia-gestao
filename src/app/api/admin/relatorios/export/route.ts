import { NextRequest, NextResponse } from 'next/server';
import { PRODUCT } from '@/lib/product';
import ExcelJS from 'exceljs';
import { getAllManagerResults, getSettings } from '@/lib/services/reports.service';
import { getPeriodById } from '@/lib/services/periods.service';
import { requireRH } from '@/lib/services/auth.service';
import { createAuditLog } from '@/lib/services/audit.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRH();

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodo');
    const departmentId = searchParams.get('setor') || undefined;
    if (!periodId) {
      return NextResponse.json({ success: false, error: 'Selecione um período.' }, { status: 400 });
    }

    const settingsPromise = getSettings();
    const resultsPromise = settingsPromise.then((settings) => getAllManagerResults(
      periodId,
      departmentId ? { departmentId } : {},
      settings.minEvaluationsForDisplay
    ));
    const [period, settings, results] = await Promise.all([
      getPeriodById(periodId),
      settingsPromise,
      resultsPromise,
    ]);
    if (!period) {
      return NextResponse.json({ success: false, error: 'Período não encontrado.' }, { status: 404 });
    }

    const summaryRows = results.map((result) => ({
      leadership: result.managerName,
      position: result.position,
      department: result.departmentName,
      responses: result.hasEnoughData ? result.teamEvaluationCount : 'Protegido',
      average: result.hasEnoughData ? result.teamOverallAverage : 'Protegido',
      status: result.hasEnoughData ? 'Resultado disponível' : 'Aguardando mínimo de respostas',
    }));

    const criteriaRows = results.flatMap((result) => result.criteriaResults.map((criterion) => ({
      leadership: result.managerName,
      department: result.departmentName,
      criterion: criterion.criterionName,
      average: criterion.teamAverage ?? 'Protegido',
      responses: criterion.teamAverage !== null ? criterion.teamCount : 'Protegido',
    })));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = PRODUCT.name;
    workbook.created = new Date();
    const summarySheet = workbook.addWorksheet('Resumo', { views: [{ state: 'frozen', ySplit: 1 }] });
    summarySheet.columns = [
      { header: 'Liderança', key: 'leadership', width: 28 },
      { header: 'Cargo', key: 'position', width: 24 },
      { header: 'Setor', key: 'department', width: 22 },
      { header: 'Respostas da equipe', key: 'responses', width: 20 },
      { header: 'Média da equipe', key: 'average', width: 18 },
      { header: 'Situação', key: 'status', width: 36 },
    ];
    summarySheet.addRows(summaryRows);
    const criteriaSheet = workbook.addWorksheet('Critérios', { views: [{ state: 'frozen', ySplit: 1 }] });
    criteriaSheet.columns = [
      { header: 'Liderança', key: 'leadership', width: 28 },
      { header: 'Setor', key: 'department', width: 22 },
      { header: 'Critério', key: 'criterion', width: 36 },
      { header: 'Média da equipe', key: 'average', width: 18 },
      { header: 'Respostas do critério', key: 'responses', width: 24 },
    ];
    criteriaSheet.addRows(criteriaRows);
    const guideSheet = workbook.addWorksheet('Orientações');
    guideSheet.columns = [{ header: 'Campo', key: 'field', width: 26 }, { header: 'Informação', key: 'information', width: 100 }];
    guideSheet.addRows([
      { field: 'Período', information: period.name },
      { field: 'Modalidade', information: 'Avaliação de lideranças pela equipe' },
      { field: 'Proteção dos resultados', information: `Mínimo de ${settings.minEvaluationsForDisplay} respostas por liderança e por critério. Campos protegidos não significam nota zero.` },
      { field: 'Colegas de setor', information: 'Acompanhamento separado na área Avaliação de colegas.' },
    ]);
    for (const sheet of workbook.worksheets) {
      const header = sheet.getRow(1);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      header.alignment = { vertical: 'middle' };
      header.height = 24;
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
    }

    const file = await workbook.xlsx.writeBuffer();
    const safePeriodName = period.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '') || 'periodo';
    await createAuditLog({
      action: 'REPORT_EXPORTED', entityType: 'reports', entityId: period.id,
      description: `Relatório consolidado exportado para o período ${period.name}`,
      performedBy: actor.id, performedByName: actor.name,
      metadata: { periodId: period.id, departmentFiltered: Boolean(departmentId) },
    });
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="relatorio-${safePeriodName}.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Não autenticado') ? 401 : message.includes('Acesso negado') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Não foi possível gerar o relatório.' : message },
      { status }
    );
  }
}
