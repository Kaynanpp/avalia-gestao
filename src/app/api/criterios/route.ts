import { NextRequest, NextResponse } from 'next/server';
import { getCriteria, createCriterion, updateCriteriaOrder } from '@/lib/services/criteria.service';
import { requireAdmin, requireRH } from '@/lib/services/auth.service';
import { createCriterionSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRH();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';
    
    const modalityParam = searchParams.get('modality');
    if (modalityParam && modalityParam !== 'LEADERSHIP' && modalityParam !== 'PEER') return NextResponse.json({ success: false, error: 'Modalidade inválida.' }, { status: 400 });
    const modality: 'LEADERSHIP' | 'PEER' | undefined = modalityParam === 'LEADERSHIP' ? 'LEADERSHIP' : modalityParam === 'PEER' ? 'PEER' : undefined;
    const criteria = await getCriteria(activeOnly, modality);
    return NextResponse.json({ success: true, data: criteria });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar critérios' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const data = createCriterionSchema.parse(body);

    const criterion = await createCriterion(data, user.id, user.name);
    return NextResponse.json({ success: true, data: criterion }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Não autenticado') ? 401 : error.message.includes('Acesso negado') ? 403 : 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    
    if (body.action === 'REORDER' && Array.isArray(body.orders)) {
      await updateCriteriaOrder(body.orders, user.id, user.name);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Não autenticado') ? 401 : error.message.includes('Acesso negado') ? 403 : 500 }
    );
  }
}
