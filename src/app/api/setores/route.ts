import { NextRequest, NextResponse } from 'next/server';
import { getDepartments, createDepartment } from '@/lib/services/departments.service';
import { requireRH } from '@/lib/services/auth.service';
import { createDepartmentSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRH();
    const departments = await getDepartments();
    return NextResponse.json({ success: true, data: departments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Não autenticado') ? 401 : error.message.includes('Acesso negado') ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRH();
    const body = await req.json();
    const data = createDepartmentSchema.parse(body);

    const department = await createDepartment(data, user.id, user.name);
    return NextResponse.json({ success: true, data: department }, { status: 201 });
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
