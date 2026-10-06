const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function product() {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.resolve('src/lib/product.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)((name) => name === '../../package.json' ? require('../../package.json') : require(name), module, module.exports);
  return module.exports;
}
test('product identity and candidate version share package metadata', () => {
  const { PRODUCT } = product();
  assert.equal(PRODUCT.name, 'Avalia Gestão');
  assert.equal(PRODUCT.copyright, 'Kaynan');
  assert.equal(PRODUCT.version, require('../../package.json').version);
  assert.equal(PRODUCT.releaseTarget, require('../../package.json').version);
});
test('public product links reject unsafe protocols, credentials and malformed addresses', () => {
  const { validatedPublicUrl } = product();
  for (const value of ['javascript:alert(1)', 'http://example.invalid', 'https://user:pass@example.invalid', 'https://example.invalid/?token=test', 'invalid']) assert.equal(validatedPublicUrl(value), undefined);
  assert.equal(validatedPublicUrl('https://example.invalid/'), 'https://example.invalid');
});
test('institutional indexing is disabled unless explicitly configured', () => {
  const saved = [process.env.PRODUCT_SITE_URL, process.env.PRODUCT_INDEXING_ENABLED];
  try {
    delete process.env.PRODUCT_SITE_URL; process.env.PRODUCT_INDEXING_ENABLED = 'true';
    assert.equal(product().productPublication().indexable, false);
    process.env.PRODUCT_SITE_URL = 'https://example.invalid'; process.env.PRODUCT_INDEXING_ENABLED = 'false';
    assert.equal(product().productPublication().indexable, false);
    process.env.PRODUCT_INDEXING_ENABLED = 'true';
    assert.equal(product().productPublication().indexable, true);
  } finally { for (const [i, name] of ['PRODUCT_SITE_URL', 'PRODUCT_INDEXING_ENABLED'].entries()) { if (saved[i] === undefined) delete process.env[name]; else process.env[name] = saved[i]; } }
});
test('public guide slugs are unique and generated Markdown matches the shared source', () => {
  const guides = require('../../src/content/public-guides.json');
  assert.equal(new Set(guides.map((guide) => guide.slug)).size, guides.length);
  for (const guide of guides) {
    assert.match(guide.slug, /^[a-z-]+$/);
    const markdown = fs.readFileSync(path.resolve(`docs/public/${guide.slug}.md`), 'utf8');
    assert.ok(markdown.includes(guide.title));
    for (const step of guide.steps) assert.ok(markdown.includes(step));
  }
});
test('read-only website demonstration has no production service, API submission or customer credentials', () => {
  const text = fs.readFileSync(path.resolve('src/app/produto/demonstracao/page.tsx'), 'utf8');
  assert.ok(text.includes('fictícia'));
  assert.ok(!/firebase|fetch\(|admin\/login|participationToken/.test(text));
});
