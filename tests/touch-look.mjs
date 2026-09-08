// Регрессионный тест сенсорного обзора: камера не должна получать КРЕН (roll)
// и не должна переворачиваться при комбинированных поворотах (стик взгляда + drag).
//
// Почему: при эйлеровом порядке 'XYZ' (дефолт Three.js) совместные pitch+yaw дают
// крен — горизонт заваливается, картинка «переворачивается», нормальный ракурс
// сложно поймать. Фикс — rotation.order = 'YXZ' (FPS-порядок: сначала yaw, потом
// pitch) + жёсткий кламп pitch ±(pi/2 - 0.1) + rotation.z = 0 в путях ввода.
// С 'YXZ' правый вектор камеры всегда горизонтален (right.y ≈ 0) — это и проверяем.
//
// Запуск (после python3 -m http.server 8091):
//   node tests/touch-look.mjs
// Браузер ищется сам: PLAYWRIGHT_CHROME_PATH → системный Chrome → браузер
// Playwright из CI. Пакет playwright-core ставится в репо через `npm i`.

import { readFileSync } from 'node:fs';
import { launchBrowser } from './launch.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:8091';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = indexHtml.match(/url=\.\/(game_\d+\.html)/) || indexHtml.match(/\.\/(game_\d+\.html)/);
if (!match) {
  console.error('❌ Не удалось определить актуальный game_*.html из index.html');
  process.exit(1);
}
const gameFile = match[1];
console.log('▶ Тестируем:', gameFile);

const browser = await launchBrowser();
const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 900, height: 700 } });
const page = await ctx.newPage();
const errors = [];
const notFound = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('response', r => { if (r.status() === 404) notFound.push(r.url()); });
page.on('console', m => {
  if (m.type() !== 'error') return;
  if (m.text().includes('Failed to load resource')) return; // 404-ресурсы учитываем отдельно
  errors.push('console.error: ' + m.text());
});

await page.goto(`${BASE}/${gameFile}`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const fail = msg => { console.error('❌ ' + msg); process.exitCode = 1; };
const ok = msg => console.log('   ok: ' + msg);

// Синтезируем TouchEvent (обработчики игры висят на document, нужен bubbles: true)
await page.evaluate(() => {
  window.__touchSeq = (el, pts, holdMsPerStep) => new Promise(resolve => {
    const mk = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    const fire = (type, t) => el.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [t],
      targetTouches: type === 'touchend' ? [] : [t], changedTouches: [t],
    }));
    let i = 0;
    const step = () => {
      if (i >= pts.length) {
        fire('touchend', mk(pts[pts.length - 1][0], pts[pts.length - 1][1]));
        resolve(); return;
      }
      fire(i === 0 ? 'touchstart' : 'touchmove', mk(pts[i][0], pts[i][1]));
      i++;
      setTimeout(step, holdMsPerStep || 60);
    };
    step();
  });
});

const lookState = () => page.evaluate(() => {
  const c = window.__AH__.camera;
  const e = c.matrixWorld.elements; // column-major: e[0..2]=right, e[4..6]=up
  return {
    order: c.rotation.order,
    pitch: c.rotation.x,
    yaw: c.rotation.y,
    rightY: e[1], // y правого вектора: 0 <=> нет крена (горизонт не завален)
    upY: e[5],    // y верхнего вектора: >0 <=> не вверх ногами
  };
});

const clamp = Math.PI / 2 - 0.1;
const checkNoRoll = (s, label) => {
  if (Math.abs(s.rightY) > 1e-4) fail(`КРЕН после ${label}: right.y = ${s.rightY} — горизонт завален`);
  else ok(`нет крена после ${label}`);
  if (s.upY <= 0) fail(`камера вверх ногами после ${label}`);
  if (Math.abs(s.pitch) > clamp + 1e-6) fail(`pitch вне клампа: ${s.pitch}`);
};

// --- 1. FPS-порядок эйлеровых углов ----------------------------------------
const s0 = await lookState();
if (s0.order !== 'YXZ') fail(`rotation.order = ${s0.order}, ожидался YXZ (крен при pitch+yaw)`);
else ok('rotation.order = YXZ');

// --- 2. стик взгляда: диагональ, держим ~1.2с -------------------------------
const stickBox = await page.locator('#lookStick').boundingBox();
const sc = { x: stickBox.x + stickBox.width / 2, y: stickBox.y + stickBox.height / 2 };
const ptsStick = [];
for (let i = 0; i <= 20; i++) {
  const k = Math.min(1, i / 4); // быстро выходим на полное отклонение
  ptsStick.push([sc.x - 24 * k, sc.y - 24 * k]);
}
await page.evaluate(([el, pts]) => window.__touchSeq(el, pts, 60),
  [await page.$('#lookStick'), ptsStick]);
await page.waitForTimeout(200);
const s1 = await lookState();
console.log(`   стик: pitch=${s1.pitch.toFixed(2)} yaw=${s1.yaw.toFixed(2)} rightY=${s1.rightY.toExponential(2)}`);
checkNoRoll(s1, 'стика');
if (Math.abs(s1.pitch) < 0.3 && Math.abs(s1.yaw) < 0.3) fail('стик почти не повернул камеру — взгляд мёртв?');

// --- 3. drag-обзор по экрану -------------------------------------------------
const vp = page.viewportSize();
const ptsDrag = [];
for (let i = 0; i <= 12; i++) ptsDrag.push([vp.width / 2 + 300 * i / 12, vp.height / 2 - 200 * i / 12]);
await page.evaluate(([el, pts]) => window.__touchSeq(el, pts, 40),
  [await page.$('canvas'), ptsDrag]);
await page.waitForTimeout(200);
const s2 = await lookState();
console.log(`   drag: pitch=${s2.pitch.toFixed(2)} yaw=${s2.yaw.toFixed(2)} rightY=${s2.rightY.toExponential(2)}`);
checkNoRoll(s2, 'drag-обзора');

// --- 4. экстремум: 4 резких вертикальных drag вниз до упора ------------------
for (let round = 0; round < 4; round++) {
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push([vp.width / 2 + 40 * i, vp.height / 2 + 600 * i / 10]);
  await page.evaluate(([el, pts2]) => window.__touchSeq(el, pts2, 30), [await page.$('canvas'), pts]);
  await page.waitForTimeout(120);
}
const s3 = await lookState();
console.log(`   экстремум: pitch=${s3.pitch.toFixed(2)} rightY=${s3.rightY.toExponential(2)} upY=${s3.upY.toFixed(3)}`);
if (Math.abs(s3.pitch) > clamp + 1e-6) fail(`pitch вышел за кламп: ${s3.pitch}`);
else ok(`pitch в клампе (|pitch| = ${Math.abs(s3.pitch).toFixed(2)} <= ${clamp.toFixed(2)})`);
if (s3.upY <= 0) fail(`камера перевёрнута: up.y = ${s3.upY}`);
else ok(`камера не перевёрнута при максимальном тангаже (up.y = ${s3.upY.toFixed(3)} > 0)`);

// --- 5. ошибок игры быть не должно -------------------------------------------
const real404 = notFound.filter(u => !u.includes('favicon'));
if (real404.length) fail('игровые ресурсы не загрузились (404): ' + real404.join(', '));
if (errors.length) {
  console.error(`Ошибки страницы (${errors.length}):`);
  for (const e of [...new Set(errors)]) console.error('   ' + e);
  fail('ошибки в game loop во время вращения камеры');
} else ok('0 ошибок страницы/консоли во время всех вращений');

await browser.close();
if (process.exitCode) process.exit(1);
console.log('✅ TOUCH-LOOK: камера без крена, не переворачивается, клампы держатся');
