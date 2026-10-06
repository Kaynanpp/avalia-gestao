const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Readable } = require('node:stream');
const net = require('node:net');
const { createRequire } = require('node:module');

test('reviewed dependency graph removes unused Jest and unknown buffers chain without moving dev advisories into runtime', () => {
  const lock = JSON.parse(fs.readFileSync('package-lock.json'));
  for (const name of ['buffers', 'binary', 'chainsaw', 'traverse', 'jest', 'ts-jest', '@jest/globals']) {
    assert.equal(Object.keys(lock.packages).some(p => p.endsWith('/node_modules/' + name) || p === 'node_modules/' + name), false, name);
  }
  assert.equal(lock.packages['node_modules/unzipper'].version, '0.12.5');
  assert.equal(lock.packages['node_modules/basic-ftp'].version, '6.2.2');
  for (const [key, pkg] of Object.entries(lock.packages)) {
    if (/node_modules\/(braces|basic-ftp|@opentelemetry\/core)$/.test(key)) assert.equal(pkg.dev, true, key);
  }
});

test('ExcelJS XLSX export and import preserve 600 synthetic rows, accents, dates, formulas and styles', async () => {
  const Excel = require('exceljs');
  const workbook = new Excel.Workbook();
  const sheet = workbook.addWorksheet('Relatório fictício');
  sheet.columns = [{ header: 'Pessoa', key: 'name' }, { header: 'Nota', key: 'score' }, { header: 'Data', key: 'date' }];
  for (let n = 1; n <= 600; n++) sheet.addRow({ name: 'Colaboração fictícia ' + n, score: n % 5 + 1, date: new Date('2026-10-06T12:00:00Z') });
  sheet.getCell('D2').value = { formula: 'B2+1', result: 3 };
  sheet.getCell('A1').font = { bold: true };
  const restored = new Excel.Workbook();
  await restored.xlsx.load(await workbook.xlsx.writeBuffer());
  const result = restored.getWorksheet('Relatório fictício');
  assert.equal(result.rowCount, 601);
  assert.equal(result.getCell('A601').value, 'Colaboração fictícia 600');
  assert.equal(result.getCell('C2').value.toISOString(), '2026-10-06T12:00:00.000Z');
  assert.equal(result.getCell('D2').value.formula, 'B2+1');
  assert.equal(result.getCell('A1').font.bold, true);
});

test('ExcelJS streaming reader uses reviewed unzipper Parse API and handles 600 rows', async () => {
  const Excel = require('exceljs');
  const workbook = new Excel.Workbook();
  const sheet = workbook.addWorksheet('Setor fictício');
  for (let n = 1; n <= 600; n++) sheet.addRow(['Colega ' + n, n]);
  const reader = new Excel.stream.xlsx.WorkbookReader(Readable.from([Buffer.from(await workbook.xlsx.writeBuffer())]), { worksheets: 'emit', sharedStrings: 'cache' });
  let rows = 0;
  for await (const worksheet of reader) for await (const row of worksheet) { rows++; assert.equal(row.getCell(2).value, rows); }
  assert.equal(rows, 600);
});

test('updated unzipper reads ZIP unicode names, empty entries and deflated content without legacy buffers', async () => {
  const JSZip = require('jszip');
  const unzipper = createRequire(require.resolve('exceljs'))('unzipper');
  const zip = new JSZip();
  zip.file('fictício/ação.txt', 'conteúdo sintético');
  zip.file('vazio.txt', '');
  const directory = await unzipper.Open.buffer(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  assert.equal((await directory.files.find(f => f.path === 'fictício/ação.txt').buffer()).toString(), 'conteúdo sintético');
  assert.equal((await directory.files.find(f => f.path === 'vazio.txt').buffer()).length, 0);
});

test('get-uri remains compatible with basic-ftp 6.2.2 for loopback listing fallback and download', { timeout: 15000 }, async t => {
  const servers = [], sockets = new Set();
  t.after(async () => { for (const s of sockets) s.destroy(); await Promise.all(servers.map(s => new Promise(resolve => s.close(resolve)))); });
  const payload = 'arquivo fictício para compatibilidade';
  const control = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {});
    socket.write('220 Synthetic local FTP\r\n');
    let buffered = '', dataSocket, connected;
    socket.on('data', bytes => {
      buffered += bytes.toString();
      while (buffered.includes('\r\n')) {
        const end = buffered.indexOf('\r\n'), line = buffered.slice(0, end); buffered = buffered.slice(end + 2);
        const command = line.split(' ')[0].toUpperCase();
        if (command === 'USER') socket.write('331 Password required\r\n');
        else if (command === 'PASS') socket.write('230 Synthetic access\r\n');
        else if (command === 'FEAT') socket.write('211 No features\r\n');
        else if (command === 'MDTM') socket.write('500 Use LIST\r\n');
        else if (command === 'EPSV') {
          connected = new Promise(resolve => { const data = net.createServer(s => { dataSocket = s; sockets.add(s); s.on('close', () => sockets.delete(s)); s.on('error', () => {}); resolve(); }); servers.push(data); data.listen(0, '127.0.0.1', () => socket.write('229 Entering Extended Passive Mode (|||' + data.address().port + '|)\r\n')); });
        } else if (command === 'LIST' || command === 'MLSD' || command === 'RETR') {
          socket.write('150 Transfer\r\n');
          connected.then(() => { dataSocket.end(command === 'RETR' ? payload : 'type=file;size=40;modify=20261006120000; sample.txt\r\n', () => socket.write('226 Done\r\n')); });
        } else if (command === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write('200 OK\r\n');
      }
    });
  });
  servers.push(control);
  await new Promise(resolve => control.listen(0, '127.0.0.1', resolve));
  const { getUri } = require('get-uri');
  const stream = await getUri('ftp://synthetic:synthetic@127.0.0.1:' + control.address().port + '/sample.txt');
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString(), payload);
  assert.ok(stream.lastModified instanceof Date);
});

test('patched source-map-js preserves basic and indexed mappings and source content', () => {
  const { SourceMapGenerator, SourceMapConsumer, SourceNode } = require('source-map-js');
  const generator = new SourceMapGenerator({ file: 'generated.css' });
  generator.addMapping({ generated: { line: 1, column: 0 }, original: { line: 2, column: 0 }, source: 'synthetic.css' });
  generator.setSourceContent('synthetic.css', '/* fictício */\n.test { color: orange; }');
  const consumer = new SourceMapConsumer(generator.toJSON());
  assert.equal(consumer.originalPositionFor({ line: 1, column: 0 }).line, 2);
  assert.match(consumer.sourceContentFor('synthetic.css'), /fictício/);
  assert.equal(SourceNode.fromStringWithSourceMap('.test{color:orange}', consumer).toString(), '.test{color:orange}');
  const indexed = new SourceMapConsumer({ version: 3, sections: [{ offset: { line: 1, column: 0 }, map: generator.toJSON() }] });
  const mappings = []; indexed.eachMapping(m => mappings.push(m));
  assert.equal(mappings[0].generatedLine, 2);
  assert.equal(mappings[0].originalLine, 2);
  const bounded = require('node:child_process').execFileSync(process.execPath, ['-e', `
    const { SourceMapConsumer, SourceNode } = require('source-map-js');
    const assert = require('node:assert/strict');
    assert.throws(() => new SourceMapConsumer({version:3,sections:[{offset:{line:1000000000,column:0},map:${JSON.stringify(generator.toJSON())}}]}), /Section offset line/);
    const map = new SourceMapConsumer({version:3,sections:[{offset:{line:1000000,column:0},map:${JSON.stringify(generator.toJSON())}}]});
    if (SourceNode.fromStringWithSourceMap('x', map).toString() !== 'x') process.exit(1);
    process.stdout.write('BOUNDED');
  `], { encoding: 'utf8', timeout: 5000 });
  assert.equal(bounded, 'BOUNDED');
});

test('patched selector parser supports Tailwind variants and nested CSS in current PostCSS chain', async () => {
  const postcss = require('postcss');
  const result = await postcss([require('tailwindcss')({ content: [{ raw: '<div class="hover:bg-orange-500 group-hover:text-white sm:flex"></div>', extension: 'html' }], corePlugins: { preflight: false } }), require('postcss-nested')]).process('@tailwind utilities; .synthetic { &:hover { color: orange; } }', { from: undefined });
  assert.match(result.css, /hover\\:bg-orange-500:hover/);
  assert.match(result.css, /group:hover/);
  assert.match(result.css, /\.synthetic:hover/);
});
