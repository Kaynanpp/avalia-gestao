import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/services/settings.service';
import { requireAdmin } from '@/lib/services/auth.service';
import { createAuditLog } from '@/lib/services/audit.service';
import { updateSettingsSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ success: true, data: await getSettings() });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Não autenticado') ? 401 : message.includes('Acesso negado') ? 403 : 500;
    return NextResponse.json({ success: false, error: status === 500 ? 'Erro ao carregar configurações.' : message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const settings = updateSettingsSchema.parse(await request.json());
    await updateSettings(settings, user.id);
    await createAuditLog({
      action: 'SETTINGS_UPDATED',
      entityType: 'settings',
      entityId: 'app',
      description: 'Configurações do sistema atualizadas',
      performedBy: user.id,
      performedByName: user.name,
      metadata: { fields: Object.keys(settings) },
    });
    return NextResponse.json({ success: true, data: await getSettings() });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.errors.map((issue) => issue.message).join(', ') }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Não autenticado') ? 401 : message.includes('Acesso negado') ? 403 : 500;
    return NextResponse.json({ success: false, error: status === 500 ? 'Não foi possível salvar as configurações.' : message }, { status });
  }
}
