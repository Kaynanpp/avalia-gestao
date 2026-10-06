import { NextRequest, NextResponse } from 'next/server';
import { requireRH } from '@/lib/services/auth.service';
import { deleteDevelopmentPlan, updateDevelopmentPlan } from '@/lib/services/development-plans.service';
import { updateDevelopmentPlanSchema } from '@/lib/validators';
import { ZodError } from 'zod';

const response = (error: unknown) => {
  if (error instanceof ZodError) return NextResponse.json({ success: false, error: error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
  const message = error instanceof Error ? error.message : '';
  const status = message === 'Não autenticado' ? 401 : message.includes('Acesso negado') || message === 'Troca de senha obrigatória' ? 403 : message.includes('não encontrado') ? 404 : 400;
  return NextResponse.json({ success: false, error: status === 401 ? 'Não autenticado.' : status === 403 ? 'Acesso restrito ao RH/DP.' : message || 'Não foi possível concluir a operação.' }, { status });
};
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const actor = await requireRH(); const data = updateDevelopmentPlanSchema.parse(await request.json()); return NextResponse.json({ success: true, data: await updateDevelopmentPlan((await params).id, data, actor) }); } catch (error) { return response(error); } }
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const actor = await requireRH(); await deleteDevelopmentPlan((await params).id, actor); return NextResponse.json({ success: true }); } catch (error) { return response(error); } }
