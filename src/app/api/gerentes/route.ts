import { NextRequest, NextResponse } from 'next/server';
import { getManagers, createManager } from '@/lib/services/managers.service';
import { requireRH } from '@/lib/services/auth.service';
import { createManagerSchema, managerFiltersSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRH();
    const { searchParams } = new URL(req.url);
    const { page, pageSize, ...filters } = managerFiltersSchema.parse(Object.fromEntries(searchParams));
    const managers = await getManagers(filters);
    if (page !== undefined || pageSize !== undefined) {
      const size = pageSize || 25;
      const totalPages = Math.max(1, Math.ceil(managers.length / size));
      const currentPage = Math.min(page || 1, totalPages);
      return NextResponse.json({
        success: true,
        data: managers.slice((currentPage - 1) * size, currentPage * size),
        pagination: { page: currentPage, pageSize: size, total: managers.length, totalPages },
      });
    }
    return NextResponse.json({ success: true, data: managers });
  } catch (error) {
    return errorResponse(error, 'Não foi possível carregar as lideranças. Tente novamente.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRH();
    const body = await req.json();
    const data = createManagerSchema.parse(body);

    const manager = await createManager(data, user.id, user.name);
    return NextResponse.json({ success: true, data: manager }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Não foi possível cadastrar a liderança. Tente novamente.');
  }
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json({ success: false, error: error.errors.map(issue => issue.message).join(', ') }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : '';
  const status = message.includes('Não autenticado') ? 401
    : message.includes('Acesso negado') ? 403
    : message.includes('setor ativo') || error instanceof SyntaxError ? 400
    : 500;
  return NextResponse.json({ success: false, error: status === 500 ? fallback : error instanceof SyntaxError ? 'Dados inválidos. Revise o cadastro.' : message }, { status });
}
