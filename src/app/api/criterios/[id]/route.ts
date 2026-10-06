import { NextRequest, NextResponse } from 'next/server';
import { updateCriterion, deleteCriterion } from '@/lib/services/criteria.service';
import { requireAdmin } from '@/lib/services/auth.service';
import { updateCriterionSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const data = updateCriterionSchema.parse(body);

    const criterion = await updateCriterion((await params).id, data, user.id, user.name);
    return NextResponse.json({ success: true, data: criterion });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    await deleteCriterion((await params).id, user.id, user.name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Não autenticado') ? 401 : error.message.includes('Acesso negado') ? 403 : 400 }
    );
  }
}
