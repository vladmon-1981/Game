// Общий хелпер для headless-тестов: загрузка playwright и запуск браузера.
//
// Порядок поиска браузера:
//   1. PLAYWRIGHT_CHROME_PATH — явный путь к Chrome/Chromium;
//   2. известные пути системного Chrome/Chromium (macOS/Linux);
//   3. дефолтный браузер Playwright (как в CI, где ставится
//      `npx playwright install chromium`).
// Пакет: сначала `playwright`, потом `playwright-core` (достаточно для
// запуска с executablePath; ставится в репо через `npm i`).
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    'playwright',
    'playwright-core',
    '/opt/node22/lib/node_modules/playwright'
  ].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch { /* пробуем следующий */ }
  }
  console.error('❌ Не найден пакет playwright. Установи: npm i');
  process.exit(1);
}

const { chromium } = loadPlaywright();

const KNOWN_CHROMES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
];

export async function launchBrowser() {
  const paths = [process.env.PLAYWRIGHT_CHROME_PATH, ...KNOWN_CHROMES].filter(Boolean);
  for (const executablePath of paths) {
    try {
      return await chromium.launch({ executablePath });
    } catch (e) {
      // нет такого файла / не запускается — пробуем следующий путь
    }
  }
  // Последний шанс: браузер Playwright, установленный через
  // `npx playwright install chromium` (путь в CI).
  return await chromium.launch();
}
