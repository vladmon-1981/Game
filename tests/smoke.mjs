// Smoke-тест игры: ловит ошибки в game loop, которые визуально незаметны.
//
// Зачем: ошибки внутри update() не роняют страницу — глобальный обработчик
// показывает красную плашку на 10 сек, а игра продолжает рендериться. Поэтому
// баги вроде "ReferenceError: pos is not defined" в очереди у ресепшн глазами
// не видно, но половина игровой логики при этом молча мертва.
//
// Что делает: открывает актуальный game_*.html (берёт его из index.html),
// отводит игрока в сторону, чтобы не блокировать путь пациенту, и ждёт, пока
// пациент дойдёт от входа до регистратуры и встанет в очередь — то есть пока
// отработают все ветки состояний в update(). Любая ошибка страницы = провал.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright резолвим через require: в CI он ставится в node_modules,
// локально может быть установлен глобально (тогда помогает PLAYWRIGHT_PATH).
const require = createRequire(import.meta.url);
function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    'playwright',
    'playwright-core',
    '/opt/node22/lib/node_modules/playwright'
  ].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch { /* пробуем следующий */ }
  }
  console.error('❌ Не найден пакет playwright. Установи: npm i -D playwright');
  process.exit(1);
}
const { chromium } = loadPlaywright();
// PLAYWRIGHT_CHROME_PATH — путь к системному Chrome/Chromium, если браузеры
// Playwright не установлены (playwright-core всегда требует executablePath).
// В CI переменная не задана — используется дефолтный браузер Playwright.
const launchOpts = process.env.PLAYWRIGHT_CHROME_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH }
  : {};

const BASE = process.env.BASE_URL || 'http://localhost:8091';

// Актуальный файл игры — тот, на который редиректит index.html
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = indexHtml.match(/url=\.\/(game_\d+\.html)/) || indexHtml.match(/\.\/(game_\d+\.html)/);
if (!match) {
  console.error('❌ Не удалось определить актуальный game_*.html из index.html');
  process.exit(1);
}
const gameFile = match[1];
console.log('▶ Тестируем:', gameFile);

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage();

const errors = [];
page.on('pageerror', err => errors.push('pageerror: ' + err.message));
page.on('console', msg => {
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
});

await page.goto(`${BASE}/${gameFile}`, { waitUntil: 'load' });
await page.waitForTimeout(3000);

const snapshot = () => page.evaluate(() => {
  const g = window.__AH__;
  if (!g) return null;
  const p = g.patients[0];
  return {
    player: { x: g.playerPos.x, z: g.playerPos.z },
    patient: p && p.mesh ? { state: p.state, z: p.mesh.position.z } : null,
    animTime: g.animTime
  };
});

const before = await snapshot();
if (!before) {
  console.error('❌ window.__AH__ недоступен — тестовый хук пропал из игры');
  await browser.close();
  process.exit(1);
}

// Игрок стартует ровно там же, где спавнится пациент (0, 18). Пациент уступает
// дорогу, если игрок ближе 1.4 — уходим вбок, иначе он никогда не дойдёт.
await page.keyboard.down('KeyD');
await page.waitForTimeout(2500);
await page.keyboard.up('KeyD');

const afterMove = await snapshot();

// Как только игрок отошёл, пациент доходит до первой путевой точки и переходит
// в состояние 'in_queue' — дальше каждый кадр работает ветка очереди у ресепшн.
console.log('⏳ Пациент идёт к регистратуре, крутим игровой цикл...');
await page.waitForTimeout(12000);

const after = await snapshot();

// Проверяем, что сцена жива и рендерится
const canvasOk = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return !!c && c.width > 0 && c.height > 0;
});

await browser.close();

const fail = msg => { console.error('❌ ' + msg); process.exitCode = 1; };

if (!canvasOk) fail('Canvas не отрендерился — сцена не поднялась');

if (errors.length) {
  console.error(`❌ Ошибки в game loop (${errors.length}):`);
  for (const e of [...new Set(errors)]) console.error('   ' + e);
  process.exitCode = 1;
}

// Игрок должен реально сдвинуться за 2.5 сек удержания D.
// Ловит "замороженный" game loop (например, если dt схлопнулся в ~0)
// и регрессии в обработке клавиш.
const moved = Math.hypot(afterMove.player.x - before.player.x, afterMove.player.z - before.player.z);
if (moved < 1) {
  fail(`Игрок почти не сдвинулся за 2.5с удержания D (${moved.toFixed(3)} ед.) — игровой цикл заморожен или сломан ввод`);
} else {
  console.log(`   игрок сместился на ${moved.toFixed(1)} ед.`);
}

// Пациент должен дойти до регистратуры и встать в очередь.
if (!after.patient) {
  fail('Пациента нет в сцене — spawnPatient() не отработал');
} else if (after.patient.state !== 'in_queue') {
  fail(`Пациент не дошёл до очереди (state="${after.patient.state}")`);
} else if (before.patient && after.patient.z >= before.patient.z - 1) {
  fail(`Пациент стоит на месте (z ${before.patient.z.toFixed(1)} → ${after.patient.z.toFixed(1)})`);
} else {
  console.log(`   пациент в очереди, дошёл до z=${after.patient.z.toFixed(1)}`);
}

if (process.exitCode) process.exit(1);
console.log('✅ Игровой цикл жив: игрок двигается, пациент дошёл до очереди, ошибок нет');
