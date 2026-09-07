# Журнал решений

Короткие записи о решениях и фиксах — по одному пункту, без прозы. Цель: чтобы следующая модель/сессия не переоткрывала грабли и не откатывала осознанные решения. Подробности "как устроен проект" — в `CLAUDE.md`, здесь только "что и почему изменили".

Формат записи:
```
## ГГГГ-ММ-ДД — модель/сессия
- Что сделано / решено — почему.
```

---

## 2026-09-07 — Claude Sonnet 5 (session_01D8tn8uvDWsENoddRuZPzWZ)
- Исправлен `ReferenceError: pos is not defined` в `update()` игрового цикла (`game_1788767711.html`): в ветке `if (p.state === 'in_queue')` использовалась переменная `pos`, объявленная только в соседней ветке `else if` (движение по waypoints) — блочная область видимости `const` её туда не пускала. Патиент, дошедший до очереди у ресепшн, ронял игровой цикл каждый кадр (молча — только красная плашка сверху, без падения экрана). Fix: `const pos = p.mesh.position;` добавлена в начало ветки `in_queue`. См. PR #1 (закрыт без мержа по просьбе автора — правки уже в ветке `claude/capabilities-overview-l7flr7`, PR как таковой не нужен).
- Решили: **не создавать PR для этой задачи** — разработка идёт напрямую в ветке `claude/capabilities-overview-l7flr7`, мерж/ревью не требуется в этом флоу.
- Решили: старые файлы-снимки (`game_<timestamp>.html`, `LOOK-*.html`, `TOUCH-*.html`, `FIX*.html` и т.п. в корне) — архив итераций, **не редактировать и не удалять** без явного запроса. Редактируется только актуальный файл, на который ссылается `index.html`.
- Добавлен `CLAUDE.md` — памятка по структуре проекта для будущих сессий/моделей.

## 2026-09-07 — MiniMax-M3 (текущая сессия)
- Исправлен **WebGL Framebuffer Feedback Loop** в `animate()` (`game_1788767711.html`): ТВ-экраны используют `tvRT1.texture`/`tvRT2.texture` как `map`, и в этом же `animate()` сцене рендерится в эти RT — WebGL бросает `GL_INVALID_OPERATION: Feedback loop formed between Framebuffer and active Texture` (116+ варнингов в консоль каждый кадр) и **отказывается рендерить в чёрный**. Fix: перед `setRenderTarget(tvRT1/tvRT2)` временно сохраняем и снимаем `material.map` с `game.tvScreen1`/`game.tvScreen2`, после рендера восстанавливаем. Теперь 0 warnings, рендер работает.
- Исправлен **"тихий" dt-баг** (тот самый, что в `CLAUDE.md` под "Известные грабли" — `clock.getDelta()` вызывать только раз): в `animate()` `animDt = game.clock.getDelta()` (строка 2821), затем `update(animDt)` → но в начале `update()` всё ещё было `const dt = Math.min(game.clock.getDelta(), 0.1)` — **второй вызов** в том же кадре, который возвращает ≈0. Следствие: W/A/S/D двигали игрока на ~0.001 ед/сек (в 5000 раз медленнее нормы), пациенты не двигались. Fix: `function update(dtArg) { const dt = (dtArg !== undefined) ? Math.min(dtArg, 0.1) : Math.min(game.clock.getDelta(), 0.1); }` — параметр предпочитается, fallback на локальный getDelta() только если `update()` вызван без аргумента. Подтверждено smoke-тестом: W даёт dz≈-2.4, S≈+3.8, A≈-5, D≈+4.2 за 1 сек; пациент доходит до очереди за 12 сек.
- Добавлен `window.__AH__ = game;` хук в boot-секции (требование `CLAUDE.md` и `tests/smoke.mjs`). Без него тесты не могут инспектировать состояние и отличить живую игру от замороженной.
- Smoke-тест написан как одноразовый Python+Playwright скрипт в `/tmp/smoke.py` (по CLAUDE.md `tests/smoke.mjs` существует на CI, но в workspace не обнаружен). Headless Chromium через `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` (Playwright браузер не установлен из-за sandbox). Все три проверки прошли: 0 page errors, 0 feedback warnings, WASD реально двигают playerPos, пациент доходит до `in_queue`.
