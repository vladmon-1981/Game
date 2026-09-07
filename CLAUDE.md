# Animal Hospital 3D — памятка для Claude

3D-ремейк Roblox "Animal Hospital" на чистом Three.js (r160), FPS-управление от первого/третьего лица. Один самодостаточный HTML-файл, без сборки, без npm.

## Где актуальная версия игры

- **`index.html`** — просто редиректит на актуальный `game_*.html` (через `<meta http-equiv="refresh">` + `window.location.replace`, чтобы обойти кеш GitHub Pages CDN).
- Актуальный файл смотри внутри `index.html`, сейчас это **`game_1788767711.html`** — единственный файл, который нужно редактировать.
- Вся игровая логика (JS + HTML + CSS) лежит **в одном файле** — это не шаблон + `game.js`, а самодостаточная страница с `<script type="module">` внутри.

## ⚠️ Важно: куча старых файлов в корне — НЕ ТРОГАТЬ

В корне репозитория десятки файлов вида `game_<timestamp>.html`, `LOOK-*.html`, `TOUCH-*.html`, `QUEUE-*.html`, `FIX*.html` и т.п. — это **снимки прошлых итераций разработки** (каждый коммит одно время создавал новый файл вместо правки существующего, чтобы обходить кеш браузера/CDN). Они не используются в проде и не импортируются друг из друга.

Также в корне: `game.js`, `animal-hospital.js`, `animal-hospital.html`, `play.html`, `test.html`, `AH-GAME.html`, `diagnose.html` — более ранние/альтернативные версии прототипа, тоже не используются текущим `index.html`.

**Правило:** прежде чем что-то чинить или менять — сначала открой `index.html`, найди на какой `game_*.html` он редиректит, и работай только с этим файлом. Не трать время на другие `.html` в корне, если явно не попросили.

## Технологии

- **Three.js r160** (vendor-копия в `vendor/three/three.module.js`, `vendor/three/addons/controls/PointerLockControls.js`) — не CDN, всё локально.
- ES-модули через `importmap` (`"three": "./vendor/three/three.module.js"`).
- Web Audio API — все звуки синтезируются кодом (нет аудиофайлов).
- Все текстуры — `CanvasTexture`, рисуются кодом (пол, стены, потолок, таблички).
- `PointerLockControls` для мышиного обзора; на мобильных — кастомные touch-джойстики (виртуальный стик движения + стик взгляда), реализованные через `elementFromPoint` (на iOS Safari `event.target` для тачей ненадёжен).

## Структура одного файла (`game_*.html`)

Внутри `<script type="module">`, сверху вниз:
1. `Audio` — объект для звуков (`tone()`, `click()`, `footstep()`).
2. `ANIMAL_POOL`, `CONDITIONS`, `TREATMENTS` — данные пациентов.
3. `makeAnimalModel(base, isAnomaly)` — процедурная генерация 3D-модели животного (разная геометрия по виду).
4. `game` — единый объект глобального состояния (сцена, камера, пациенты, очередь, монеты, sanity и т.д.). Не экспортируется в `window` — если нужно инспектировать в devtools/тестах, временно добавь `window.game = game;` **и убери перед коммитом**.
5. `initThree()` — сборка сцены: пол/стены/потолок, ресепшн, кабинеты, двери, NPC, TV с 2 камерами (CCTV-рендер в render targets).
6. `spawnPatient()` / `treatPatient()` / `rejectPatient()` / `removePatient()` — жизненный цикл пациента.
7. `update()` — единый game loop (движение игрока, взгляд, очередь у ресепшн, движение NPC, двери, автоспавн, автовыбор пациента). **Самое важное место при багфиксах.**
8. `animate()` — `requestAnimationFrame` + рендер (включая 2 CCTV-камеры в render targets для телевизора).
9. `setupInput()` — клавиатура, мышь, touch-джойстики.
10. Boot-секция внизу — `try/catch` вокруг `initThree(); setupInput(); spawnPatient(); animate();`, глобальные `window.addEventListener('error'/'unhandledrejection')` показывают красную плашку сверху (`showRuntimeError`), не блокируя игру.

## Известные грабли

- **Блочная область видимости в `update()`**: код в `game.patients.forEach(...)` содержит несколько `if / else if` веток (по `p.state`). Переменные, объявленные `const`/`let` внутри одной ветки, **не видны** в соседней — легко словить `ReferenceError`, если скопировать код между ветками не перенеся объявление (см. коммит fix "pos is not defined" в очереди `in_queue`, PR #1).
- Ошибки в модуле ловятся глобальным `window.addEventListener('error', ..., true)` и показываются как красная плашка сверху на 10 сек — **игра не падает визуально**, но если ошибка бросается каждый кадр внутри `update()`, весь код после места ошибки в этом кадре не выполняется (двери, NPC, автоспавн, автовыбор пациента могут молча перестать работать). При подозрении на баг — проверяй консоль браузера, не только визуально.
- Аномалии (`isAnomaly`) **визуально неотличимы** от обычных животных вживую — это специально (отличие видно только на CCTV-телевизоре через `anomalyAuras`, которые `visible = true` только во время рендера в `tvRT1`/`tvRT2`).
- Мобильная версия — отдельная ветка CSS (`@media (pointer: coarse), (max-width: 900px)`) + отдельный блок touch-обработчиков в конце скрипта. При правке HUD/карточки пациента не забывай про обе версии стилей.

## Как тестировать локально

```bash
cd /home/user/Game
python3 -m http.server 8091
# открыть http://localhost:8091/game_1788767711.html (или актуальный из index.html)
```

Headless-проверка без браузера пользователя — Playwright + Chromium уже установлены в окружении:
```js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
```
Слушай `page.on('pageerror', ...)` — это самый быстрый способ поймать `ReferenceError`/`TypeError` в game loop, которые визуально почти незаметны (см. выше про плашку).

## Ветка разработки

`claude/capabilities-overview-l7flr7` — основная ветка для изменений в этой сессии/задаче. PR: см. https://github.com/vladmon-1981/Game/pulls
