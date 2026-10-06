import { NextRequest, NextResponse } from 'next/server';
import { updatePeriod, openPeriod, closePeriod } from '@/lib/services/periods.service';
import { requireRH } from '@/lib/services/auth.service';
import { updatePeriodSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRH();
    const body = await req.json();
    const data = updatePeriodSchema.parse(body);

    const period = await updatePeriod((await params).id, data, user.id, user.name);
    return NextResponse.json({ success: true, data: period });
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRH();
    const body = await req.json();
    
    if (body.action === 'OPEN') {
      const period = await openPeriod((await params).id, user.id, user.name);
      return NextResponse.json({ success: true, data: period });
    } else if (body.action === 'CLOSE') {
      const period = await closePeriod((await params).id, user.id, user.name);
      return NextResponse.json({ success: true, data: period });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message.includes('Não autenticado') ? 401 : error.message.includes('Acesso negado') ? 403 : 400 } // 400 for business logic errors like "already open"
    );
  }
}
