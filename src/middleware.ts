import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const siteMode = process.env.SITE_MODE || 'dedicated';
  if (!['dedicated', 'institutional'].includes(siteMode)) return new NextResponse('Serviço indisponível.', { status: 503 });
  if (siteMode === 'institutional') {
    if (pathname === '/') return NextResponse.rewrite(new URL('/produto', request.url));
    const publicRoute = pathname === '/produto' || pathname.startsWith('/produto/') ||
      ['/robots.txt', '/sitemap.xml', '/brand/avalia-gestao.svg', '/api/health'].includes(pathname);
    if (!publicRoute) return new NextResponse('Página não encontrada.', { status: 404 });
    return NextResponse.next();
  }
  // Preserve the existing dedicated application behavior outside its API.
  if (!pathname.startsWith('/api/')) return NextResponse.next();
  const suppliedRequestId = request.headers.get('x-request-id')?.trim();
  const requestId = suppliedRequestId && /^[A-Za-z0-9._-]{8,100}$/.test(suppliedRequestId)
    ? suppliedRequestId
    : crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  const errorResponse = (error: string, status: number) => NextResponse.json(
    { success: false, error },
    { status, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } },
  );

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const site = request.headers.get('sec-fetch-site');
    let sameOrigin = !origin;
    if (origin) {
      try {
        const forwardedProtocol = process.env.TRUST_PROXY === 'true'
          ? request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
          : undefined;
        const expectedProtocol = forwardedProtocol ? `${forwardedProtocol}:` : request.nextUrl.protocol;
        sameOrigin = new URL(origin).host === request.headers.get('host') && new URL(origin).protocol === expectedProtocol;
      }
      catch { sameOrigin = false; }
    }
    if (!sameOrigin || site === 'cross-site') {
      return errorResponse('Abra o sistema pelo endereço oficial para realizar esta ação.', 403);
    }
    const multipartImport = request.nextUrl.pathname === '/api/admin/colegas/importar' &&
      request.method === 'POST' && request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data;');
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && !multipartImport && request.nextUrl.pathname !== '/api/admin/logout' &&
        !request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return errorResponse('Envie os dados do formulário no formato correto.', 415);
    }
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('X-Request-ID', requestId);
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
