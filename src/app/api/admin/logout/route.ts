import { logError } from '@/lib/observability/logger';
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true }, { status: 200 });
    
    // Clear the session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    logError('logout_failed', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}
