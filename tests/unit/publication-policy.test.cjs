const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('source release has approved own license and preserves third-party separation',()=>{
  assert.equal(JSON.parse(fs.readFileSync('package.json')).license,'AGPL-3.0-only');
  assert.equal(JSON.parse(fs.readFileSync('package-lock.json')).packages[''].license,'AGPL-3.0-only');
  assert.match(fs.readFileSync('LICENSE','utf8'),/GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(fs.readFileSync('COPYRIGHT','utf8'),/Copyright \(C\) 2026 Kaynan/);
  assert.match(fs.readFileSync('COPYRIGHT','utf8'),/EXCEÇÕES/);
  assert.deepEqual(fs.readFileSync('LICENSE'),fs.readFileSync('public/legal/LICENSE.txt'));
});
test('draft CLA cannot accept external rights and vulnerabilities use a private channel',()=>{
  assert.match(fs.readFileSync('CLA.md','utf8'),/RASCUNHO, NÃO VIGENTE/);
  assert.match(fs.readFileSync('CONTRIBUTING.md','utf8'),/Não incorporar contribuições externas/);
  const security=fs.readFileSync('SECURITY.md','utf8');
  assert.match(security,/suporteatalaiaprados@gmail\.com/);
  assert.match(security,/Não abrir Issue/);
  assert.match(fs.readFileSync('.github/ISSUE_TEMPLATE/config.yml','utf8'),/mailto:suporteatalaiaprados@gmail\.com/);
});
