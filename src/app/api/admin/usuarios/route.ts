import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireAdmin } from '@/lib/services/auth.service';
import { createAdminUser, getAdminUsers } from '@/lib/services/auth.service';
import { createUserSchema } from '@/lib/validators';
import { consumeRateLimit, rateLimitHeaders, RateLimitExceededError, sensitiveActionRateLimitPolicy } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const users = await getAdminUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Não autenticado') ? 401 : message.includes('Acesso negado') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Não foi possível carregar os usuários.' : message },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    await consumeRateLimit('admin-user-create:actor', actor.id, sensitiveActionRateLimitPolicy());
    const input = createUserSchema.parse(await request.json());
    const temporaryPassword = `${randomBytes(3).toString('base64url')}Aa1!`;
    const result = await createAdminUser(
      input.email,
      temporaryPassword,
      input.name,
      input.role,
      actor
    );

    if (!result.success) {
      const status = result.error?.includes('já está em uso') ? 409 : 500;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      data: { id: result.data?.id, email: input.email, name: input.name, role: input.role },
      temporaryPassword,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 429, headers: rateLimitHeaders(error) });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors.map((entry) => entry.message).join(', ') },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('Não autenticado') ? 401 : message.includes('Acesso negado') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Não foi possível criar o usuário.' : message },
      { status }
    );
  }
}
