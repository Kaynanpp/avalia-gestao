import { NextRequest, NextResponse } from 'next/server';
import { updateDepartment, deleteDepartment } from '@/lib/services/departments.service';
import { requireRH } from '@/lib/services/auth.service';
import { updateDepartmentSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRH();
    const body = await req.json();
    const data = updateDepartmentSchema.parse(body);

    const department = await updateDepartment((await params).id, data, user.id, user.name);
    return NextResponse.json({ success: true, data: department });
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
    const user = await requireRH();
    await deleteDepartment((await params).id, user.id, user.name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Não autenticado') ? 401 : error.message.includes('Acesso negado') ? 403 : 400 }
    );
  }
}
