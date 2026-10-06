import { NextRequest, NextResponse } from 'next/server';
import { requireRH } from '@/lib/services/auth.service';
import { createDevelopmentPlan, getDevelopmentPlans } from '@/lib/services/development-plans.service';
import { developmentPlanSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';
const response = (error: unknown) => {
  if (error instanceof ZodError) return NextResponse.json({ success: false, error: error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
  const message = error instanceof Error ? error.message : '';
  const status = message === 'Não autenticado' ? 401 : message.includes('Acesso negado') || message === 'Troca de senha obrigatória' ? 403 : 400;
  return NextResponse.json({ success: false, error: status === 401 ? 'Não autenticado.' : status === 403 ? 'Acesso restrito ao RH/DP.' : message || 'Não foi possível concluir a operação.' }, { status });
};
export async function GET() { try { await requireRH(); return NextResponse.json({ success: true, data: await getDevelopmentPlans() }); } catch (error) { return response(error); } }
export async function POST(request: NextRequest) { try { const actor = await requireRH(); const data = developmentPlanSchema.parse(await request.json()); return NextResponse.json({ success: true, data: await createDevelopmentPlan(data, actor) }, { status: 201 }); } catch (error) { return response(error); } }
