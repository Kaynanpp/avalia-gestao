import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { deleteAdminUser, updateAdminUserStatus } from '@/lib/services/auth.service';
import { requireAdmin } from '@/lib/services/auth.service';
import { updateAdminUserSchema } from '@/lib/validators';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdmin();
    const input = updateAdminUserSchema.parse(await request.json());
    await updateAdminUserStatus((await params).id, input.active, actor);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors.map((entry) => entry.message).join(', ') },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Não autenticado') ? 401
      : message.includes('Acesso negado') ? 403
      : message.includes('não encontrado') ? 404
      : message.includes('Mantenha pelo menos um') || message.includes('própria conta') ? 409
      : 500;
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Não foi possível atualizar o acesso.' : message },
      { status }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdmin();
    await deleteAdminUser((await params).id, actor);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Não autenticado') ? 401
      : message.includes('Acesso negado') ? 403
      : message.includes('não encontrado') ? 404
      : message.includes('Mantenha pelo menos um') || message.includes('própria conta') ? 409
      : 500;
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Não foi possível excluir a conta.' : message },
      { status }
    );
  }
}
