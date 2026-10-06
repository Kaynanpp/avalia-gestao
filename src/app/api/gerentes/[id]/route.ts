import { NextRequest, NextResponse } from 'next/server';
import { updateManager, activateManager, deactivateManager, deleteManager } from '@/lib/services/managers.service';
import { requireRH } from '@/lib/services/auth.service';
import { updateManagerSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRH();
    const body = await req.json();
    const data = updateManagerSchema.parse(body);

    const manager = await updateManager((await params).id, data, user.id, user.name);
    return NextResponse.json({ success: true, data: manager });
  } catch (error) {
    return errorResponse(error, 'Não foi possível salvar a liderança. Tente novamente.');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRH();
    const body = await req.json();
    
    if (body.action === 'ACTIVATE') {
      await activateManager((await params).id, user.id, user.name);
      return NextResponse.json({ success: true });
    } else if (body.action === 'DEACTIVATE') {
      await deactivateManager((await params).id, user.id, user.name);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return errorResponse(error, 'Não foi possível alterar o status da liderança. Tente novamente.');
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRH();
    await deleteManager((await params).id, user.id, user.name);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Não foi possível excluir a liderança. Tente novamente.');
  }
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json({ success: false, error: error.errors.map(issue => issue.message).join(', ') }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : '';
  const status = message.includes('Não autenticado') ? 401
    : message.includes('Acesso negado') ? 403
    : message.includes('não encontrada') ? 404
    : message.includes('possui avaliações ou links') ? 409
    : message.includes('setor ativo') || error instanceof SyntaxError ? 400
    : 500;
  return NextResponse.json({ success: false, error: status === 500 ? fallback : error instanceof SyntaxError ? 'Dados inválidos. Revise o cadastro.' : message }, { status });
}
