// ============================================================
// ANIMAL HOSPITAL 3D — Минимальная рабочая версия
// ============================================================

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

console.log('[AH] Модуль загружен');

// ============================================================
// AUDIO
// ============================================================
const Audio = {
  ctx: null,
  enabled: true,
  init() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      console.log('[AH] Audio context создан');
    } catch (e) {
      console.log('[AH] Audio init failed:', e);
      this.ctx = null;
    }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  tone(freq, dur, type, vol) {
    if (!this.ctx || !this.enabled) return;
    type = type || 'sine';
    vol = vol || 0.3;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },
  click() { this.tone(800, 0.05, 'square', 0.05); },
  footstep() { this.tone(100, 0.05, 'triangle', 0.05); }
};

// ============================================================
// DATA
// ============================================================
const ANIMAL_POOL = [
  { id: 'bunny', name: 'Зайчик', color: 0xf5b8c0, earColor: 0xf5b8c0 },
  { id: 'puppy', name: 'Щенок', color: 0xc89968, earColor: 0x8b6239 },
  { id: 'kitten', name: 'Котёнок', color: 0xf5b942, earColor: 0xd49620 },
  { id: 'bear', name: 'Медвежонок', color: 0x7a4a25, earColor: 0x5d3720 },
  { id: 'fox', name: 'Лисёнок', color: 0xe87330, earColor: 0xa8481e },
  { id: 'panda', name: 'Панда', color: 0xfafafa, earColor: 0x1a1a1a }
];

const CONDITIONS = [
  { id: 'cold', label: 'Простуда', symptom: 'Чихание', treat: 'Тёплое одеяло' },
  { id: 'broken', label: 'Перелом', symptom: 'Хромота', treat: 'Гипс' },
  { id: 'infection', label: 'Инфекция', symptom: 'Покраснение', treat: 'Антибиотики' },
  { id: 'fleas', label: 'Блохи', symptom: 'Чешется', treat: 'Шампунь' },
  { id: 'eye', label: 'Глазная инфекция', symptom: 'Мутный глаз', treat: 'Глазные капли' }
];

const TREATMENTS = ['Тёплое одеяло', 'Антибиотики', 'Гипс', 'Глазные капли', 'Шампунь', 'Витамины', 'Капельница', 'Сироп от кашля'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

function makePatient() {
  const base = pick(ANIMAL_POOL);
  const condition = pick(CONDITIONS);
  return {
    id: 'p-' + Math.random().toString(36).slice(2, 9),
    base,
    condition,
    isAnomaly: Math.random() < 0.2,
    name: base.name,
    state: 'waiting'
  };
}

// ============================================================
// 3D ANIMAL MODEL
// ============================================================
function makeAnimalModel(base) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: base.color, roughness: 0.6 });
  const earMat = new THREE.MeshStandardMaterial({ color: base.earColor, roughness: 0.6 });

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), bodyMat);
  body.scale.set(1, 0.85, 0.95);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), bodyMat);
  head.position.set(0, 0.75, 0.45);
  group.add(head);
  group.userData.head = head;

  // Ears
  const earGeo = new THREE.ConeGeometry(0.1, 0.3, 4);
  const lEar = new THREE.Mesh(earGeo, earMat);
  lEar.position.set(-0.2, 0.4, 0);
  lEar.rotation.z = -0.1;
  head.add(lEar);
  const rEar = new THREE.Mesh(earGeo, earMat);
  rEar.position.set(0.2, 0.4, 0);
  rEar.rotation.z = 0.1;
  head.add(rEar);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const lE = new THREE.Mesh(eyeGeo, eyeMat); lE.position.set(-0.13, 0.1, 0.35); head.add(lE);
  const rE = new THREE.Mesh(eyeGeo, eyeMat); rE.position.set(0.13, 0.1, 0.35); head.add(rE);

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.07, 0.2, 4, 6);
  const legPositions = [[-0.25, 0.1, 0.25], [0.25, 0.1, 0.25], [-0.25, 0.1, -0.25], [0.25, 0.1, -0.25]];
  legPositions.forEach(p => {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(p[0], p[1], p[2]);
    group.add(leg);
  });

  // Tail
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), bodyMat);
  tail.position.set(0, 0.5, -0.45);
  tail.scale.set(0.7, 0.7, 1.3);
  group.add(tail);
  group.userData.tail = tail;

  return group;
}

// ============================================================
// GAME STATE
// ============================================================
const game = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  clock: null,
  patients: [],
  selectedPatient: null,
  keys: {},
  moveSpeed: 5,
  playerHeight: 1.6,
  bobTime: 0,
  animTime: 0,
  shift: 1,
  shiftTarget: 5,
  shiftProgress: 0,
  coins: 50,
  sanity: 100,
  deaths: 0,
  hasScanner: false,
  audioOn: true,
  modal: null,
  showShiftIntro: true,
  // raycasting
  raycaster: new THREE.Raycaster()
};

// ============================================================
// LOG
// ============================================================
function addLog(type, text) {
  console.log('[' + type + ']', text);
  const logDiv = document.getElementById('logEntries');
  if (logDiv) {
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + type;
    entry.textContent = '[' + new Date().toLocaleTimeString('ru-RU', { hour12: false }) + '] ' + text;
    logDiv.prepend(entry);
    while (logDiv.children.length > 12) logDiv.removeChild(logDiv.lastChild);
  }
}

function showToast(msg, kind) {
  const toast = document.createElement('div');
  toast.className = 'toast ' + (kind || 'info');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ============================================================
// THREE.JS SETUP
// ============================================================
function initThree() {
  console.log('[AH] initThree() старт');
  const root = document.getElementById('root');
  root.innerHTML = '';

  // Scene
  game.scene = new THREE.Scene();
  game.scene.background = new THREE.Color(0x0a0f17);
  game.scene.fog = new THREE.Fog(0x0a0f17, 5, 30);

  // Camera
  game.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  game.camera.position.set(0, 1.6, 18);

  // Renderer
  game.renderer = new THREE.WebGLRenderer({ antialias: true });
  game.renderer.setSize(window.innerWidth, window.innerHeight);
  game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  root.appendChild(game.renderer.domElement);

  // Lighting
  const ambient = new THREE.AmbientLight(0x6080a0, 0.6);
  game.scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xfff5d6, 0.5);
  dir.position.set(5, 15, 5);
  game.scene.add(dir);

  // Point lights (4 ceiling)
  const positions = [[-5, 3.5, -5], [5, 3.5, -5], [-5, 3.5, 5], [5, 3.5, 5]];
  positions.forEach(p => {
    const light = new THREE.PointLight(0xfff5d6, 0.6, 15, 1.5);
    light.position.set(p[0], p[1], p[2]);
    game.scene.add(light);
  });

  // Floor
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.7 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  game.scene.add(floor);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e131c, roughness: 0.9 });
  const walls = [
    { pos: [0, 2, -20], size: [40, 4, 0.2] },
    { pos: [0, 2, 20], size: [40, 4, 0.2] },
    { pos: [-20, 2, 0], size: [0.2, 4, 40] },
    { pos: [20, 2, 0], size: [0.2, 4, 40] }
  ];
  walls.forEach(w => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]), wallMat);
    wall.position.set(w.pos[0], w.pos[1], w.pos[2]);
    game.scene.add(wall);
  });

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x050709 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 4;
  game.scene.add(ceil);

  // Reception desk
  const desk = new THREE.Group();
  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.1, 1),
    new THREE.MeshStandardMaterial({ color: 0x5a3e15, roughness: 0.5 })
  );
  deskTop.position.y = 1;
  desk.add(deskTop);
  desk.position.set(0, 0, -10);
  game.scene.add(desk);

  // Exam tables (4 rooms)
  const roomPositions = [[-8, 0, -5], [8, 0, -5], [-8, 0, 5], [8, 0, 5]];
  roomPositions.forEach((p, i) => {
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xe8edf5 })
    );
    table.position.set(p[0], 0.8, p[2]);
    table.userData.spawnPoint = true;
    table.userData.spawnIdx = i;
    game.scene.add(table);
  });

  // Controls
  game.controls = new PointerLockControls(game.camera, game.renderer.domElement);
  game.clock = new THREE.Clock();

  // Resize handler
  window.addEventListener('resize', () => {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  console.log('[AH] initThree() завершён');
}

// ============================================================
// INPUT
// ============================================================
function setupInput() {
  console.log('[AH] setupInput() старт');
  document.addEventListener('keydown', (e) => {
    game.keys[e.code] = true;
    if (e.code === 'KeyE') tryInteract();
    if (e.code === 'Escape') {
      if (game.controls.isLocked) game.controls.unlock();
    }
  });
  document.addEventListener('keyup', (e) => {
    game.keys[e.code] = false;
  });
  document.addEventListener('mousedown', () => {
    if (!game.controls.isLocked && !game.modal && !game.showShiftIntro) {
      game.controls.lock();
    }
  });
  game.controls.addEventListener('lock', () => {
    Audio.init();
    Audio.resume();
    game.showShiftIntro = false;
    renderHud();
    console.log('[AH] Pointer locked');
  });
  game.controls.addEventListener('unlock', () => {
    console.log('[AH] Pointer unlocked');
  });
  console.log('[AH] setupInput() завершён');
}

// ============================================================
// INTERACT
// ============================================================
function tryInteract() {
  if (!game.controls.isLocked) {
    game.controls.lock();
    return;
  }
  // Raycast
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(game.camera.quaternion);
  const origin = game.camera.position.clone();
  game.raycaster.set(origin, forward);
  game.raycaster.far = 4;

  const patientMeshes = game.patients.map(p => p.mesh).filter(Boolean);
  const intersects = game.raycaster.intersectObjects(patientMeshes, true);
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !obj.userData.patient) obj = obj.parent;
    if (obj && obj.userData.patient) {
      const p = game.patients.find(x => x.id === obj.userData.patient.id);
      if (p) selectPatient(p);
    }
  }
}

function selectPatient(p) {
  Audio.click();
  game.selectedPatient = p;
  addLog('info', 'Выбран: ' + p.name);
  renderHud();
}

function treatPatient() {
  if (!game.selectedPatient) return;
  const p = game.selectedPatient;
  if (p.isAnomaly) {
    addLog('bad', '⚠ АНОМАЛИЯ! ' + p.name + ' — это была ловушка!');
    showToast('Аномалия! Пациент исчез...', 'bad');
    p.mesh.material.color.setHex(0xdc2626);
    setTimeout(() => removePatient(p), 1000);
  } else {
    Audio.tone(880, 0.15, 'sine', 0.2);
    Audio.tone(1100, 0.2, 'sine', 0.2);
    game.coins += 15;
    addLog('ok', 'Вылечен: ' + p.name + '. +15 монет.');
    showToast('+15 монет!', 'ok');
    removePatient(p);
  }
}

function rejectPatient() {
  if (!game.selectedPatient) return;
  const p = game.selectedPatient;
  if (p.isAnomaly) {
    Audio.tone(1200, 0.1, 'sine', 0.2);
    game.coins += 20;
    addLog('ok', 'Отклонена аномалия: ' + p.name + '. +20 монет.');
    showToast('Верно! Аномалия отклонена. +20', 'ok');
  } else {
    Audio.tone(200, 0.2, 'square', 0.2);
    addLog('bad', 'Ошибка! ' + p.name + ' был настоящим пациентом.');
    showToast('Это был настоящий!', 'bad');
  }
  removePatient(p);
}

function removePatient(p) {
  if (p.mesh) game.scene.remove(p.mesh);
  game.patients = game.patients.filter(x => x.id !== p.id);
  if (game.selectedPatient && game.selectedPatient.id === p.id) game.selectedPatient = null;
  game.shiftProgress++;
  if (game.shiftProgress >= game.shiftTarget) {
    addLog('ok', '=== СМЕНА ' + game.shift + ' ЗАВЕРШЕНА! ===');
    showToast('Смена завершена!', 'ok');
    game.shift++;
    game.shiftTarget += 2;
    game.shiftProgress = 0;
  } else {
    setTimeout(() => spawnPatient(), 500);
  }
  renderHud();
}

function spawnPatient() {
  if (game.patients.length >= 3) return;
  const p = makePatient();
  const model = makeAnimalModel(p.base);
  // Random position in a room
  const rx = (Math.random() < 0.5 ? -1 : 1) * 8;
  const rz = (Math.random() < 0.5 ? -1 : 1) * 5;
  model.position.set(rx, 0, rz);
  model.userData.patient = p;
  game.scene.add(model);
  game.patients.push({ ...p, mesh: model, animPhase: Math.random() * 10 });
  addLog('info', 'Новый пациент: ' + p.name);
  renderHud();
}

// ============================================================
// HUD
// ============================================================
function renderHud() {
  const hud = document.getElementById('hud');
  if (!hud) return;

  let html = '';

  // Top bar
  html += '<div class="hud-top">';
  html += '<div class="hud-logo">🏥 ANIMAL HOSPITAL <span>3D</span></div>';
  html += '<div class="hud-pill blue">Смена <b>' + game.shift + '</b></div>';
  html += '<div class="hud-pill">📋 <b>' + game.shiftProgress + '/' + game.shiftTarget + '</b></div>';
  html += '<div class="hud-pill">💰 <b>' + game.coins + '</b></div>';
  html += '<div class="hud-pill warn">☕ <b>' + game.sanity + '</b>%</div>';
  html += '<div class="hud-pill ' + (game.deaths > 0 ? 'bad' : '') + '">☠ <b>' + game.deaths + '</b>/3</div>';
  html += '</div>';

  // Crosshair
  html += '<div class="crosshair"><div class="crosshair-ring"></div></div>';

  // Toasts will be added dynamically

  // Selected patient
  if (game.selectedPatient && !game.showShiftIntro) {
    const p = game.selectedPatient;
    html += '<div class="patient-card">';
    html += '<h3>' + p.name + '</h3>';
    html += '<div class="spec">' + p.condition.label + '</div>';
    html += '<div class="symptom">⚠ ' + p.condition.symptom + '</div>';
    html += '<div class="row">';
    html += '<button class="b-treat" id="treatBtn">💊 Лечить</button>';
    html += '<button class="b-reject" id="rejectBtn">✖ Отклонить</button>';
    html += '</div>';
    html += '</div>';
  }

  // Log
  html += '<div class="log">';
  html += '<h4>Журнал</h4>';
  html += '<div id="logEntries"></div>';
  html += '</div>';

  // Interact prompt
  if (game.controls && game.controls.isLocked) {
    html += '<div class="interact"><span class="key">E</span>Взаимодействовать</div>';
  }

  // Hints
  if (!game.controls || !game.controls.isLocked) {
    if (!game.showShiftIntro) {
      html += '<div class="hints">Кликни в окно, чтобы захватить курсор. <kbd>WASD</kbd> движение, <kbd>Мышь</kbd> обзор, <kbd>E</kbd> взаимодействие</div>';
    }
  }

  hud.innerHTML = html;

  // Attach button handlers
  const treatBtn = document.getElementById('treatBtn');
  if (treatBtn) treatBtn.onclick = treatPatient;
  const rejectBtn = document.getElementById('rejectBtn');
  if (rejectBtn) rejectBtn.onclick = rejectPatient;
}

// ============================================================
// SHIFT INTRO
// ============================================================
function showShiftIntro() {
  game.modal = 'shiftIntro';
  const div = document.createElement('div');
  div.className = 'modal';
  div.id = 'shiftIntro';
  div.innerHTML = '<div class="card">' +
    '<h2>🏥 Animal Hospital 3D</h2>' +
    '<p>Добро пожаловать на <b>ночную смену</b>!</p>' +
    '<h3 style="color:var(--accent);font-size:14px;margin-top:14px;">Управление:</h3>' +
    '<ul style="color:var(--muted);line-height:1.8;font-size:12px;list-style:none;padding:0;text-align:left;">' +
    '<li>• <b>WASD</b> — движение</li>' +
    '<li>• <b>Мышь</b> — обзор на 360°</li>' +
    '<li>• <b>Shift</b> — бег</li>' +
    '<li>• <b>E</b> — взаимодействие с пациентом</li>' +
    '<li>• Подойдите к пациенту и нажмите E, затем выберите Лечить или Отклонить</li>' +
    '</ul>' +
    '<h3 style="color:var(--accent);font-size:14px;margin-top:14px;">Цель:</h3>' +
    '<p>Пройдите 6 смен. Лечите настоящих пациентов, отклоняйте аномалии.</p>' +
    '<p style="color:var(--warn);font-weight:700;">⚠ Аномалии нельзя лечить — они атакуют!</p>' +
    '<button class="modal-btn" id="beginBtn">Начать смену 1 →</button>' +
    '</div>';
  document.getElementById('root').appendChild(div);
  document.getElementById('beginBtn').onclick = () => {
    Audio.click();
    game.showShiftIntro = false;
    game.modal = null;
    document.getElementById('shiftIntro').remove();
    game.controls.lock();
    spawnPatient();
    renderHud();
  };
}

// ============================================================
// GAME LOOP
// ============================================================
function update() {
  const dt = Math.min(game.clock.getDelta(), 0.1);
  game.animTime += dt;

  // Movement
  if (game.controls && game.controls.isLocked && !game.modal && !game.showShiftIntro) {
    const forward = (game.keys['KeyW'] ? 1 : 0) - (game.keys['KeyS'] ? 1 : 0);
    const strafe = (game.keys['KeyD'] ? 1 : 0) - (game.keys['KeyA'] ? 1 : 0);
    const speedMult = (game.keys['ShiftLeft'] || game.keys['ShiftRight']) ? 1.8 : 1;
    if (forward !== 0 || strafe !== 0) {
      const v = new THREE.Vector3(strafe, 0, -forward).normalize().multiplyScalar(game.moveSpeed * speedMult * dt);
      game.controls.moveRight(v.x);
      game.controls.moveForward(v.z);
      game.bobTime += dt * (speedMult === 1.8 ? 12 : 8);
      if (Math.random() < 0.04) Audio.footstep();
    }
    // Head bob
    const bobY = Math.sin(game.bobTime) * 0.04;
    game.camera.position.y = game.playerHeight + bobY;
  }

  // Animate patients
  game.patients.forEach(p => {
    if (!p.mesh) return;
    p.animPhase = (p.animPhase || 0) + dt;
    p.mesh.position.y = Math.sin(p.animPhase * 2) * 0.05;
    if (p.mesh.userData.tail) {
      p.mesh.userData.tail.rotation.y = Math.sin(p.animPhase * 5) * 0.5;
    }
    if (p.mesh.userData.head) {
      p.mesh.userData.head.rotation.y = Math.sin(p.animPhase * 0.5) * 0.3;
    }
  });

  // Auto-spawn
  if (game.controls && game.controls.isLocked && game.patients.length < 2) {
    if (Math.random() < 0.005) spawnPatient();
  }
}

function animate() {
  requestAnimationFrame(animate);
  update();
  if (game.renderer) game.renderer.render(game.scene, game.camera);
}

// ============================================================
// BOOT
// ============================================================
window.addEventListener('error', (e) => {
  console.error('[AH] Global error:', e.message, '@', e.filename, ':', e.lineno);
  const out = document.createElement('pre');
  out.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;background:#400;color:#fca;padding:20px;z-index:9999;white-space:pre-wrap;font-size:12px;';
  out.textContent = 'ERROR: ' + e.message + '\n@ ' + e.filename + ':' + e.lineno + '\n' + (e.error && e.error.stack || '');
  document.body.appendChild(out);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[AH] Promise rejection:', e.reason);
  const out = document.createElement('pre');
  out.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;background:#400;color:#fca;padding:20px;z-index:9999;white-space:pre-wrap;font-size:12px;';
  out.textContent = 'PROMISE REJECTION: ' + (e.reason && e.reason.message || e.reason);
  document.body.appendChild(out);
});

try {
  console.log('[AH] Boot старт');
  initThree();
  setupInput();
  renderHud();
  showShiftIntro();
  animate();
  addLog('ok', 'Система готова. Кликни "Начать смену 1"');
  console.log('[AH] Boot завершён');
} catch (e) {
  console.error('[AH] Boot exception:', e);
  const out = document.createElement('pre');
  out.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;background:#400;color:#fca;padding:20px;z-index:9999;white-space:pre-wrap;font-size:12px;';
  out.textContent = 'BOOT FAILED: ' + e.message + '\n' + e.stack;
  document.body.appendChild(out);
}
