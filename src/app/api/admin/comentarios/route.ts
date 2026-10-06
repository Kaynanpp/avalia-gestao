import { NextRequest, NextResponse } from 'next/server';
import { requireRH } from '@/lib/services/auth.service';
import { getTeamCommentsForManagerAndPeriod } from '@/lib/services/evaluations.service';
import { getManagerById } from '@/lib/services/managers.service';
import { getPeriodById } from '@/lib/services/periods.service';
import { getManagerResult, getSettings } from '@/lib/services/reports.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRH();
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId');
    const periodId = searchParams.get('periodId');

    if (!managerId || !periodId) {
      return NextResponse.json({ success: false, error: 'Selecione um período e uma liderança.' }, { status: 400 });
    }

    const settings = await getSettings();
    const [manager, period, result] = await Promise.all([
      getManagerById(managerId),
      getPeriodById(periodId),
      getManagerResult(managerId, periodId, settings.minEvaluationsForDisplay),
    ]);

    if (!manager || !period) {
      return NextResponse.json({ success: false, error: 'Liderança ou período não encontrado.' }, { status: 404 });
    }

    const protectedResult = !result?.hasEnoughData;
    const comments = protectedResult ? [] : await getTeamCommentsForManagerAndPeriod(managerId, periodId);
    return NextResponse.json({
      success: true,
      data: {
        managerName: manager.name,
        periodName: period.name,
        comments,
        protected: protectedResult,
        minimum: settings.minEvaluationsForDisplay,
      },
      privacy: 'Nenhuma resposta armazena o nome do funcionário. Os comentários são apresentados sem identificação.',
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Não autenticado') ? 401
      : message.includes('Acesso negado') ? 403
      : 500;
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Não foi possível carregar os comentários.' : message },
      { status }
    );
  }
}
