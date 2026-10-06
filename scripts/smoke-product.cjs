const assert = require('node:assert/strict');
const guides = require('../src/content/public-guides.json');
const url = new URL(process.env.SMOKE_URL || 'http://127.0.0.1:3010');
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Smoke de produto limitado a processo local explicitamente separado.');
async function main() {
  const routes = ['/api/health', '/produto', '/produto/edicoes', '/produto/demonstracao', '/produto/contato', '/produto/documentacao', ...guides.map((guide) => `/produto/documentacao/${guide.slug}`), '/brand/avalia-gestao.svg', '/robots.txt', '/sitemap.xml', '/produto/opengraph-image'];
  for (const route of routes) {
    const response = await fetch(new URL(route, url), { signal: AbortSignal.timeout(120000) });
    assert.equal(response.status, 200, `${route}: ${response.status}`);
    if (route === '/produto/opengraph-image') assert.match(response.headers.get('content-type'), /image\/png/);
    if (route.startsWith('/produto') && route !== '/produto/opengraph-image') {
      const html = await response.text();
      assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${route}: um h1`);
      assert.ok(html.includes('noindex'), `${route}: preview privado sem indexação`);
    }
  }
  if (process.env.SMOKE_INSTITUTIONAL === 'true') {
    assert.equal((await fetch(url)).status, 200);
    for (const route of ['/admin/login', '/avaliar', '/avaliar-colega', '/api/avaliacoes', '/api/admin/usuarios']) assert.equal((await fetch(new URL(route, url))).status, 404, route);
    const mutation = await fetch(new URL('/api/avaliacoes', url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(mutation.status, 404);
  }
  console.log(JSON.stringify({ checkedRoutes: routes.length, institutional: process.env.SMOKE_INSTITUTIONAL === 'true', passed: true }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
