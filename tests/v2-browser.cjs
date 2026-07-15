const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'output', 'playwright');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png'
};

const CPFS = {
  holder: '24681357928',
  representative: '13579246828',
  rogo: '31415926590',
  witness1: '27182818205',
  witness2: '16180339805'
};

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error('Chrome/Chromium não encontrado. Defina CHROME_PATH.');
  return executable;
}

function startServer() {
  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = requestPath === '/' ? 'v2.html' : requestPath.replace(/^\/+/, '');
    const file = path.resolve(ROOT, relative);
    if (!file.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function guardedContext(browser, origin, options = {}) {
  const external = [];
  const mutations = [];
  const context = await browser.newContext(options);
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      external.push(request.url());
      await route.abort();
      return;
    }
    if (request.method() !== 'GET') mutations.push(`${request.method()} ${request.url()}`);
    await route.continue();
  });
  return { context, external, mutations };
}

async function fillControls(page, values) {
  for (const [id, value] of Object.entries(values)) {
    const selector = `#${id}`;
    const tagName = await page.locator(selector).evaluate((element) => element.tagName);
    if (tagName === 'SELECT') await page.selectOption(selector, value);
    else await page.fill(selector, value);
  }
}

async function fillProcurement(page, scenario) {
  await page.goto(`${scenario.origin}/v2.html`, { waitUntil: 'domcontentloaded' });
  if (scenario.viewport.width < 1200) await page.click('#mobilePanelButton');
  if (scenario.documentMode === 'procuracao') await page.check('input[name="documentMode"][value="procuracao"]');
  if (!scenario.skipBenefit) await page.selectOption('#benefitId', scenario.benefit || 'bpc-pcd');
  await page.selectOption('#representationMode', scenario.mode);
  if (scenario.mode !== 'self') await page.selectOption('#representationRole', scenario.role);
  if (scenario.illiterate) await page.check('#illiterate');

  const values = {
    holderName: 'Titular de Teste',
    holderCpf: CPFS.holder,
    holderPhone: '77991234567',
    address: 'Rua de Teste',
    addressNumber: '100',
    neighborhood: 'Centro',
    city: 'Vitoria da Conquista',
    stateUf: 'BA'
  };
  if (scenario.mode !== 'self') Object.assign(values, {
    representativeName: 'Representante de Teste',
    representativeCpf: CPFS.representative
  });
  if (scenario.illiterate) Object.assign(values, {
    rogoName: 'Signatario de Teste',
    rogoCpf: CPFS.rogo,
    witness1Name: 'Primeira Testemunha',
    witness1Cpf: CPFS.witness1,
    witness2Name: 'Segunda Testemunha',
    witness2Cpf: CPFS.witness2
  });
  await fillControls(page, values);
  if (scenario.viewport.width < 1200) await page.keyboard.press('Escape');
}

async function assertA4(page, expectedPages) {
  const result = await page.evaluate(() => ({
    body: { clientWidth: document.body.clientWidth, scrollWidth: document.body.scrollWidth },
    sheets: [...document.querySelectorAll('.print-sheet')].map((sheet) => ({
      clientWidth: sheet.clientWidth,
      scrollWidth: sheet.scrollWidth,
      clientHeight: sheet.clientHeight,
      scrollHeight: sheet.scrollHeight
    })),
    ready: document.querySelector('#reviewStatus')?.textContent || ''
  }));
  assert.equal(result.sheets.length, expectedPages);
  assert.match(result.ready, /pronto/i);
  assert.ok(result.body.scrollWidth <= result.body.clientWidth + 1, `overflow horizontal: ${JSON.stringify(result.body)}`);
  result.sheets.forEach((sheet) => {
    assert.ok(sheet.scrollWidth <= sheet.clientWidth, `overflow horizontal A4: ${JSON.stringify(sheet)}`);
    assert.ok(sheet.scrollHeight <= sheet.clientHeight, `overflow vertical A4: ${JSON.stringify(sheet)}`);
  });
}

async function assertDesktopComposition(page) {
  const result = await page.evaluate(() => {
    const panel = document.querySelector('.side-panel').getBoundingClientRect();
    const toolbar = document.querySelector('.workspace-bar').getBoundingClientRect();
    const paper = document.querySelector('[data-document="procuracao"]');
    const paperBox = paper.getBoundingClientRect();
    const lastBox = paper.querySelector('.doc-body').lastElementChild.getBoundingClientRect();
    return {
      panelWidth: panel.width,
      toolbarHeight: toolbar.height,
      paperY: paperBox.y,
      occupiedRatio: (lastBox.bottom - paperBox.top) / paperBox.height,
      footers: document.querySelectorAll('.doc-footer').length
    };
  });
  assert.ok(result.panelWidth <= 300, `painel largo demais: ${JSON.stringify(result)}`);
  assert.ok(result.toolbarHeight <= 50, `barra alta demais: ${JSON.stringify(result)}`);
  assert.ok(result.paperY >= 80 && result.paperY <= 105, `papel mal posicionado: ${JSON.stringify(result)}`);
  assert.ok(result.occupiedRatio >= 0.85 && result.occupiedRatio <= 0.98, `procuração mal distribuída: ${JSON.stringify(result)}`);
  assert.equal(result.footers, 0, 'rodapé lateral não deve voltar ao PDF');
}

async function savePdf(page, filename, expectedPages) {
  const file = path.join(OUTPUT, filename);
  await page.pdf({ path: file, printBackground: true, preferCSSPageSize: true });
  const pdf = await PDFDocument.load(fs.readFileSync(file));
  assert.equal(pdf.getPageCount(), expectedPages, `${filename} com contagem incorreta`);
}

async function testValidation(browser, origin) {
  const guarded = await guardedContext(browser, origin, { viewport: { width: 1280, height: 720 } });
  const page = await guarded.context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${origin}/v2.html`, { waitUntil: 'domcontentloaded' });

  await guarded.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  await page.selectOption('#benefitId', 'bpc-pcd');
  await page.click('#benefitGuideDetails > summary');
  await page.click('#copyChecklist');
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /DOCUMENTOS - BPC\/LOAS/);
  await page.evaluate(() => {
    window.print = () => {
      window.__checklistPrint = {
        active: document.body.classList.contains('print-checklist-mode'),
        text: document.querySelector('#printChecklistSheet').textContent,
        juridicalPages: document.querySelectorAll('.print-sheet').length
      };
    };
  });
  await page.click('#printChecklist');
  const checklistPrint = await page.evaluate(() => window.__checklistPrint);
  assert.equal(checklistPrint.active, true);
  assert.match(checklistPrint.text, /Checklist de documentos/);
  assert.equal(checklistPrint.juridicalPages, 2);
  await page.evaluate(() => document.body.classList.remove('print-checklist-mode'));

  await page.fill('#holderCpf', '12345678910');
  await page.fill('#holderPhone', '20991234567');
  assert.match(await page.locator('[data-error-for="holderCpf"]').textContent(), /inválido/i);
  assert.match(await page.locator('[data-error-for="holderPhone"]').textContent(), /inválido/i);
  await page.fill('#holderPhone', '77988888888');
  assert.match(await page.locator('[data-error-for="holderPhone"]').textContent(), /inválido/i);

  await page.selectOption('#representationMode', 'represented');
  await page.selectOption('#representationRole', 'tutor_nato');
  await page.fill('#holderCpf', CPFS.holder);
  await page.fill('#representativeCpf', CPFS.holder);
  assert.match(await page.locator('[data-error-for="representativeCpf"]').textContent(), /não pode repetir/i);

  await page.selectOption('#representationMode', 'self');
  await page.check('#illiterate');
  await page.fill('#rogoCpf', '12345678910');
  await page.uncheck('#illiterate');
  const activeErrors = await page.locator('#reviewList').textContent();
  assert.doesNotMatch(activeErrors, /representante|assina a rogo|testemunha/i);

  await page.dispatchEvent('#generatePdf', 'pointerdown', { button: 0 });
  await page.waitForTimeout(1250);
  assert.equal(await page.locator('#internalPrintDialog').evaluate((dialog) => dialog.open), true);
  await page.locator('#internalPrintDialog .secondary-button[value="cancel"]').click();

  await page.keyboard.press('Tab');
  assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), 'BODY');
  assert.deepEqual(errors, []);
  assert.deepEqual(guarded.external, []);
  assert.deepEqual(guarded.mutations, []);
  await page.close({ runBeforeUnload: false });
  await guarded.context.close();
}

async function testRevocation(browser, origin) {
  const guarded = await guardedContext(browser, origin, { viewport: { width: 1440, height: 900 } });
  const page = await guarded.context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${origin}/revogacao-v2.html`, { waitUntil: 'domcontentloaded' });
  await page.check('input[name="representationMode"][value="represented"]');
  await page.selectOption('#representationRole', 'curador');
  await page.check('#illiterate');
  await page.click('[data-step-target="data"]');
  await fillControls(page, {
    holderName: 'Titular de Teste', holderCpf: CPFS.holder, holderPhone: '77991234567',
    address: 'Rua de Teste', addressNumber: '100', neighborhood: 'Centro', city: 'Vitoria da Conquista', stateUf: 'BA',
    representativeName: 'Representante de Teste', representativeCpf: CPFS.representative,
    rogoName: 'Signatario de Teste', rogoCpf: CPFS.rogo,
    witness1Name: 'Primeira Testemunha', witness1Cpf: CPFS.witness1,
    witness2Name: 'Segunda Testemunha', witness2Cpf: CPFS.witness2
  });
  await page.click('[data-step-target="review"]');
  await assertA4(page, 1);
  await page.screenshot({ path: path.join(OUTPUT, 'revogacao-v2-1440x900.png'), fullPage: true });
  await savePdf(page, 'revogacao-v2.pdf', 1);
  assert.deepEqual(errors, []);
  assert.deepEqual(guarded.external, []);
  assert.deepEqual(guarded.mutations, []);
  await page.close({ runBeforeUnload: false });
  await guarded.context.close();
}

(async () => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const server = await startServer();
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ headless: true, executablePath: findChrome() });
  const scenarios = [
    { name: 'titular-normal', mode: 'self', role: '', illiterate: false, pages: 2, viewport: { width: 1280, height: 720 } },
    { name: 'somente-procuracao', mode: 'self', role: '', illiterate: false, pages: 1, documentMode: 'procuracao', skipBenefit: true, viewport: { width: 1280, height: 720 } },
    { name: 'tutor-nato', mode: 'represented', role: 'tutor_nato', illiterate: false, pages: 3, viewport: { width: 768, height: 1024 } },
    { name: 'assistido', mode: 'assisted', role: 'tutor_nato', illiterate: false, pages: 3, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
    { name: 'curador', mode: 'represented', role: 'curador', illiterate: false, pages: 3, viewport: { width: 1440, height: 900 } },
    { name: 'administrador-provisorio', mode: 'represented', role: 'administrador_provisorio', illiterate: false, pages: 4, viewport: { width: 1440, height: 900 } },
    { name: 'rogo-titular', mode: 'self', role: '', illiterate: true, pages: 2, viewport: { width: 1280, height: 720 } },
    { name: 'rogo-tutor', mode: 'represented', role: 'tutor_nato', illiterate: true, pages: 3, viewport: { width: 768, height: 1024 } },
    { name: 'rogo-assistido', mode: 'assisted', role: 'tutor_nato', illiterate: true, pages: 3, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
    { name: 'rogo-curador', mode: 'represented', role: 'curador', illiterate: true, pages: 3, viewport: { width: 1440, height: 900 } },
    { name: 'rogo-administrador', mode: 'represented', role: 'administrador_provisorio', illiterate: true, pages: 4, viewport: { width: 1440, height: 900 } }
  ];

  try {
    await testValidation(browser, origin);
    for (const scenario of scenarios) {
      const guarded = await guardedContext(browser, origin, { viewport: scenario.viewport, reducedMotion: scenario.reducedMotion });
      const page = await guarded.context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await fillProcurement(page, { ...scenario, origin });
      await assertA4(page, scenario.pages);
      if (['titular-normal', 'administrador-provisorio', 'rogo-administrador'].includes(scenario.name)) await assertDesktopComposition(page);
      if (scenario.reducedMotion === 'reduce') {
        const duration = await page.locator('.step-section.is-active').evaluate((element) => getComputedStyle(element).animationDuration);
        assert.ok(parseFloat(duration) <= 0.001, `movimento reduzido não respeitado: ${duration}`);
      }
      if (['titular-normal', 'tutor-nato', 'assistido', 'administrador-provisorio'].includes(scenario.name)) {
        await page.screenshot({ path: path.join(OUTPUT, `${scenario.name}-${scenario.viewport.width}x${scenario.viewport.height}.png`), fullPage: true });
      }
      if (['titular-normal', 'administrador-provisorio', 'rogo-administrador'].includes(scenario.name)) {
        await savePdf(page, `${scenario.name}.pdf`, scenario.pages);
      }
      assert.deepEqual(errors, [], `${scenario.name}: erros de navegador`);
      assert.deepEqual(guarded.external, [], `${scenario.name}: requisição externa`);
      assert.deepEqual(guarded.mutations, [], `${scenario.name}: mutação de rede`);
      await page.close({ runBeforeUnload: false });
      await guarded.context.close();
      process.stdout.write(`OK ${scenario.name}: ${scenario.pages} página(s)\n`);
    }
    await testRevocation(browser, origin);
    process.stdout.write('OK validação, privacidade, viewports, PDFs e revogação v2\n');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
