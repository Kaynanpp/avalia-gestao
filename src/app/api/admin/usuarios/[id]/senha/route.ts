import { NextResponse } from 'next/server';
import { requireAdmin, resetAdminUserPassword } from '@/lib/services/auth.service';
import { consumeRateLimit, credentialActionRateLimitPolicy, rateLimitHeaders, RateLimitExceededError } from '@/lib/security/rate-limit';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdmin();
    await consumeRateLimit('admin-password-reset:actor', actor.id, credentialActionRateLimitPolicy());
    const temporaryPassword = await resetAdminUserPassword((await params).id, actor);
    return NextResponse.json({ success: true, temporaryPassword });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 429, headers: rateLimitHeaders(error) });
    }
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Não autenticado') ? 401
      : message.includes('Acesso negado') ? 403
      : message.includes('não encontrado') ? 404
      : message.includes('própria senha') ? 409
      : 500;
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Não foi possível redefinir a senha.' : message },
      { status }
    );
  }
}
