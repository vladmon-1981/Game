// ============================================================
// ANIMAL HOSPITAL 3D — Минимальная рабочая версия
// VERIFIED_FRESH_LOAD_v4
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
function makeAnimalModel(base, isAnomaly) {
  const group = new THREE.Group();
  // Аномалии выглядят АБСОЛЮТНО так же, как обычные животные.
  // Отличие видно ТОЛЬКО на телевизоре с камерами (красная метка).
  const bodyMat = new THREE.MeshStandardMaterial({ color: base.color, roughness: 0.6, metalness: 0 });
  const earMat = new THREE.MeshStandardMaterial({ color: base.earColor, roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2 });
  const noseMat = new THREE.MeshStandardMaterial({ color: base.id === 'pig' ? 0xf9b4be : 0x7c3aed, roughness: 0.4 });

  // === ТЕЛО — разная форма для разных животных ===
  let bodyGeo, bodyScale, bodyY = 0.5;
  if (base.id === 'bunny') {
    bodyGeo = new THREE.SphereGeometry(0.5, 16, 12);
    bodyScale = [1, 1, 1.1];
  } else if (base.id === 'puppy') {
    bodyGeo = new THREE.BoxGeometry(1.0, 0.8, 1.3);
    bodyScale = [1, 1, 1];
  } else if (base.id === 'kitten') {
    bodyGeo = new THREE.SphereGeometry(0.5, 16, 12);
    bodyScale = [0.9, 0.8, 1.1];
  } else if (base.id === 'bear') {
    bodyGeo = new THREE.SphereGeometry(0.6, 16, 12);
    bodyScale = [1, 1, 1];
    bodyY = 0.55;
  } else if (base.id === 'fox') {
    bodyGeo = new THREE.SphereGeometry(0.5, 16, 12);
    bodyScale = [0.95, 0.9, 1.2];
  } else if (base.id === 'panda') {
    bodyGeo = new THREE.SphereGeometry(0.55, 16, 12);
    bodyScale = [1, 1, 1];
  } else if (base.id === 'pig') {
    bodyGeo = new THREE.SphereGeometry(0.55, 16, 12);
    bodyScale = [1.1, 0.95, 1.2];
  } else {
    bodyGeo = new THREE.SphereGeometry(0.5, 16, 12);
    bodyScale = [1, 0.85, 0.95];
  }
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(...bodyScale);
  body.position.y = bodyY;
  group.add(body);

  // === ГОЛОВА ===
  const head = new THREE.Group();
  head.position.set(0, bodyY + 0.3, 0.45);
  group.add(head);
  group.userData.head = head;

  let headGeo, headScale;
  if (base.id === 'pig') {
    headGeo = new THREE.SphereGeometry(0.35, 12, 10);
    headScale = [1, 0.95, 1.1];
  } else if (base.id === 'puppy') {
    headGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
    headScale = [1, 1, 1];
  } else if (base.id === 'bear' || base.id === 'panda') {
    headGeo = new THREE.SphereGeometry(0.42, 16, 12);
    headScale = [1, 1, 1];
  } else {
    headGeo = new THREE.SphereGeometry(0.4, 16, 12);
    headScale = [1, 1, 1];
  }
  const headMesh = new THREE.Mesh(headGeo, bodyMat);
  headMesh.scale.set(...headScale);
  head.add(headMesh);

  // === УШИ — разная форма для разных видов ===
  if (base.id === 'bunny' || base.id === 'fox') {
    // Длинные уши (зайчик, лис)
    const earGeo = new THREE.CapsuleGeometry(0.08, 0.4, 4, 8);
    const lEar = new THREE.Mesh(earGeo, earMat);
    lEar.position.set(-0.18, 0.5, -0.05);
    head.add(lEar);
    const rEar = new THREE.Mesh(earGeo, earMat);
    rEar.position.set(0.18, 0.5, -0.05);
    head.add(rEar);
  } else if (base.id === 'kitten' || base.id === 'pig') {
    // Острые треугольные (кот, свинья)
    const earGeo = new THREE.ConeGeometry(0.1, 0.3, 4);
    const lEar = new THREE.Mesh(earGeo, earMat);
    lEar.position.set(-0.2, 0.4, 0);
    lEar.rotation.z = -0.1;
    head.add(lEar);
    const rEar = new THREE.Mesh(earGeo, earMat);
    rEar.position.set(0.2, 0.4, 0);
    rEar.rotation.z = 0.1;
    head.add(rEar);
  } else if (base.id === 'bear' || base.id === 'panda') {
    // Круглые маленькие
    const earGeo = new THREE.SphereGeometry(0.13, 8, 8);
    const lEar = new THREE.Mesh(earGeo, earMat);
    lEar.position.set(-0.22, 0.32, 0);
    head.add(lEar);
    const rEar = new THREE.Mesh(earGeo, earMat);
    rEar.position.set(0.22, 0.32, 0);
    head.add(rEar);
    // Для панды — добавить чёрные пятна вокруг глаз
    if (base.id === 'panda') {
      const patchMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
      const lPatch = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), patchMat);
      lPatch.position.set(-0.14, 0.1, 0.3);
      lPatch.scale.set(1, 0.7, 0.4);
      head.add(lPatch);
      const rPatch = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), patchMat);
      rPatch.position.set(0.14, 0.1, 0.3);
      rPatch.scale.set(1, 0.7, 0.4);
      head.add(rPatch);
    }
  } else if (base.id === 'puppy') {
    // Висячие
    const earGeo = new THREE.CapsuleGeometry(0.1, 0.3, 4, 8);
    const lEar = new THREE.Mesh(earGeo, earMat);
    lEar.position.set(-0.22, 0.05, 0.1);
    lEar.rotation.z = 0.6;
    head.add(lEar);
    const rEar = new THREE.Mesh(earGeo, earMat);
    rEar.position.set(0.22, 0.05, 0.1);
    rEar.rotation.z = -0.6;
    head.add(rEar);
  }

  // === ГЛАЗА — с белками (более выразительные) ===
  const eyeOffX = 0.13, eyeOffY = 0.08, eyeOffZ = 0.35;
  const lEyeW = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), eyeMat);
  lEyeW.position.set(-eyeOffX, eyeOffY, eyeOffZ);
  head.add(lEyeW);
  const rEyeW = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), eyeMat);
  rEyeW.position.set(eyeOffX, eyeOffY, eyeOffZ);
  head.add(rEyeW);
  const lPup = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), pupilMat);
  lPup.position.set(-eyeOffX, eyeOffY, eyeOffZ + 0.04);
  head.add(lPup);
  const rPup = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), pupilMat);
  rPup.position.set(eyeOffX, eyeOffY, eyeOffZ + 0.04);
  head.add(rPup);

  // === НОС — у каждого свой ===
  if (base.id === 'pig') {
    // Пятачок (большой плоский круг впереди)
    const snout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: 0xf9b4be, roughness: 0.5 })
    );
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.05, 0.45);
    head.add(snout);
    // Ноздри
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshStandardMaterial({ color: 0x7c3aed }));
    const lN = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshStandardMaterial({ color: 0x4c1d95 }));
    lN.position.set(-0.04, -0.05, 0.5);
    head.add(lN);
    const rN = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshStandardMaterial({ color: 0x4c1d95 }));
    rN.position.set(0.04, -0.05, 0.5);
    head.add(rN);
  } else if (base.id === 'puppy') {
    // Длинный нос щенка
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.12),
      noseMat
    );
    nose.position.set(0, -0.1, 0.4);
    head.add(nose);
  } else {
    // Маленький круглый носик
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), noseMat);
    nose.position.set(0, -0.05, 0.4);
    head.add(nose);
  }

  // === РОТ (улыбка) ===
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 12, Math.PI), mouthMat);
  mouth.position.set(0, -0.18, 0.38);
  mouth.rotation.x = Math.PI;
  head.add(mouth);

  // === ЛАПЫ — разные ===
  if (base.id === 'pig') {
    // Короткие толстые копытца
    const legGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.18, 8);
    const legPositions = [[-0.25, 0.08, 0.25], [0.25, 0.08, 0.25], [-0.25, 0.08, -0.25], [0.25, 0.08, -0.25]];
    legPositions.forEach(p => {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(p[0], p[1], p[2]);
      group.add(leg);
    });
  } else if (base.id === 'puppy') {
    // 4 ножки щенка
    const legGeo = new THREE.CapsuleGeometry(0.08, 0.25, 4, 6);
    const legPositions = [[-0.3, 0.12, 0.4], [0.3, 0.12, 0.4], [-0.3, 0.12, -0.4], [0.3, 0.12, -0.4]];
    legPositions.forEach(p => {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(p[0], p[1], p[2]);
      group.add(leg);
    });
  } else {
    // Стандартные
    const legGeo = new THREE.CapsuleGeometry(0.07, 0.2, 4, 6);
    const legPositions = [[-0.25, 0.1, 0.25], [0.25, 0.1, 0.25], [-0.25, 0.1, -0.25], [0.25, 0.1, -0.25]];
    legPositions.forEach(p => {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(p[0], p[1], p[2]);
      group.add(leg);
    });
  }

  // === ХВОСТ — разный ===
  if (base.id === 'bunny') {
    // Короткий круглый хвостик
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfef3f5 }));
    tail.position.set(0, 0.5, -0.45);
    group.add(tail);
    group.userData.tail = tail;
  } else if (base.id === 'puppy') {
    // Длинный виляющий хвост
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.4, 4, 6), bodyMat);
    tail.position.set(0, 0.6, -0.55);
    tail.rotation.x = 0.5;
    group.add(tail);
    group.userData.tail = tail;
  } else if (base.id === 'fox') {
    // Пушистый хвост лисы
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), bodyMat);
    tail.position.set(0, 0.5, -0.5);
    tail.scale.set(0.8, 0.8, 1.5);
    group.add(tail);
    group.userData.tail = tail;
    // Белый кончик
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfef3e2 }));
    tailTip.position.set(0, 0.5, -0.7);
    group.add(tailTip);
  } else if (base.id === 'pig') {
    // Кудрявый хвостик
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12), bodyMat);
    tail.position.set(0, 0.5, -0.5);
    tail.rotation.x = Math.PI / 2;
    group.add(tail);
    group.userData.tail = tail;
  } else {
    // Стандартный
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), bodyMat);
    tail.position.set(0, 0.5, -0.45);
    tail.scale.set(0.7, 0.7, 1.3);
    group.add(tail);
    group.userData.tail = tail;
  }

  // === МЕТКА АНОМАЛИИ (видна ТОЛЬКО на телевизоре с камерами) ===
  // Вживую невидима: пациент выглядит как обычный.
  if (isAnomaly) {
    if (!game.anomalyAuras) game.anomalyAuras = [];
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.45, depthWrite: false })
    );
    aura.position.y = 0.6;
    aura.visible = false; // вживую скрыта
    aura.userData.isAnomalyAura = true;
    group.add(aura);
    game.anomalyAuras.push(aura);
    const aura2 = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.3, depthWrite: false })
    );
    aura2.position.y = 0.6;
    aura2.visible = false;
    aura2.userData.isAnomalyAura = true;
    group.add(aura2);
    game.anomalyAuras.push(aura2);
  }
  group.userData.isAnomaly = !!isAnomaly;

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
  hasPointerLock: false, // выставится в true после создания controls, если API доступен
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
  game.scene.fog = new THREE.Fog(0x0a0f17, 8, 30);

  // Camera
  game.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  game.camera.position.set(0, 1.6, 18);
  // Логическая позиция игрока (точка на полу) — авторитет для движения и коллизий
  game.playerPos = new THREE.Vector3(0, 0, 18);

  // Renderer
  game.renderer = new THREE.WebGLRenderer({ antialias: true });
  game.renderer.setSize(window.innerWidth, window.innerHeight);
  game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  root.appendChild(game.renderer.domElement);

  // HUD-слой (поверх canvas) — без него карточка пациента не отображается!
  if (!document.getElementById('hud')) {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.className = 'hud';
    hud.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:10;';
    hud.addEventListener('click', (e) => {
      if (e.target.id === 'treatBtn') treatPatient();
      else if (e.target.id === 'rejectBtn') rejectPatient();
    });
    root.appendChild(hud);
  }

  // Сильное освещение
  game.scene.add(new THREE.AmbientLight(0x8aa0c0, 0.9));
  const dir = new THREE.DirectionalLight(0xfff5d6, 0.7);
  dir.position.set(5, 15, 5);
  game.scene.add(dir);

  // Потолочные лампы (6 штук, ярче)
  const lampPositions = [[-8, 3.5, -10], [8, 3.5, -10], [-8, 3.5, 0], [8, 3.5, 0], [-8, 3.5, 10], [8, 3.5, 10]];
  lampPositions.forEach(p => {
    const light = new THREE.PointLight(0xfff5d6, 1.0, 12, 1.5);
    light.position.set(p[0], p[1], p[2]);
    game.scene.add(light);
    // Плафон лампы
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.1, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af })
    );
    housing.position.set(p[0], 3.85, p[2]);
    game.scene.add(housing);
  });

  // === ПОЛ с плиткой ===
  // Создаём канвас-текстуру плитки
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512; floorCanvas.height = 512;
  const fctx = floorCanvas.getContext('2d');
  // Шахматная плитка 4x4 (крупные светлые/серо-голубые плиты)
  const tileSize = 128;
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const even = (tx + ty) % 2 === 0;
      fctx.fillStyle = even ? '#dfe7ee' : '#b8c8d8';
      fctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
      // Лёгкий градиент на каждой плитке
      const grad = fctx.createLinearGradient(tx * tileSize, ty * tileSize, (tx + 1) * tileSize, (ty + 1) * tileSize);
      grad.addColorStop(0, 'rgba(255,255,255,0.15)');
      grad.addColorStop(1, 'rgba(0,0,0,0.08)');
      fctx.fillStyle = grad;
      fctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
      // Мелкие крапинки (каменная фактура)
      for (let k = 0; k < 40; k++) {
        fctx.fillStyle = `rgba(${120 + Math.random() * 80},${130 + Math.random() * 80},${140 + Math.random() * 80},0.12)`;
        fctx.fillRect(tx * tileSize + Math.random() * tileSize, ty * tileSize + Math.random() * tileSize, 2, 2);
      }
    }
  }
  // Швы между плитками
  fctx.strokeStyle = '#8a99ab';
  fctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * 512;
    fctx.beginPath(); fctx.moveTo(p, 0); fctx.lineTo(p, 512); fctx.stroke();
    fctx.beginPath(); fctx.moveTo(0, p); fctx.lineTo(512, p); fctx.stroke();
  }
  const floorTex = new THREE.CanvasTexture(floorCanvas);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(5, 5);
  floorTex.anisotropy = 4;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  game.scene.add(floor);

  // === СТЕНЫ: обои с крестиками + панели + плинтус ===
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 512; wallCanvas.height = 256;
  const wctx = wallCanvas.getContext('2d');
  // Верхняя часть — светлые обои
  wctx.fillStyle = '#cfe3f5';
  wctx.fillRect(0, 0, 512, 256);
  // Мелкие крестики (больничный паттерн)
  wctx.fillStyle = 'rgba(120,170,210,0.35)';
  for (let yy = 8; yy < 170; yy += 24) {
    for (let xx = 8; xx < 512; xx += 24) {
      const ox = (Math.floor(yy / 24) % 2) * 12;
      wctx.fillRect(xx + ox - 1, yy - 4, 3, 10);
      wctx.fillRect(xx + ox - 4, yy - 1, 10, 3);
    }
  }
  // Горизонтальная отделочная полоса
  wctx.fillStyle = '#9fc4e0';
  wctx.fillRect(0, 170, 512, 4);
  // Нижняя часть — белые панели (панны)
  wctx.fillStyle = '#eef2f6';
  wctx.fillRect(0, 174, 512, 66);
  wctx.strokeStyle = '#c3ccd6';
  wctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    wctx.strokeRect(i * 128 + 10, 180, 108, 52);
  }
  // Плинтус
  wctx.fillStyle = '#7b8794';
  wctx.fillRect(0, 240, 512, 16);
  wctx.fillStyle = '#6b7683';
  wctx.fillRect(0, 240, 512, 3);
  const wallTex = new THREE.CanvasTexture(wallCanvas);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(8, 1);
  wallTex.anisotropy = 4;
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.65 });
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

  // === ПОТОЛОК ===
  const ceilCanvas = document.createElement('canvas');
  ceilCanvas.width = 256; ceilCanvas.height = 256;
  const cctx = ceilCanvas.getContext('2d');
  cctx.fillStyle = '#e5e7eb';
  cctx.fillRect(0, 0, 256, 256);
  // Панели
  cctx.strokeStyle = '#9ca3af';
  cctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * 256;
    cctx.beginPath(); cctx.moveTo(p, 0); cctx.lineTo(p, 256); cctx.stroke();
    cctx.beginPath(); cctx.moveTo(0, p); cctx.lineTo(256, p); cctx.stroke();
  }
  const ceilTex = new THREE.CanvasTexture(ceilCanvas);
  ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
  ceilTex.repeat.set(8, 8);
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.8 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 4;
  game.scene.add(ceil);

  // === РЕСЕПШН ===
  const desk = new THREE.Group();
  // Столешница
  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.15, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x5a3e15, roughness: 0.5 })
  );
  deskTop.position.y = 1;
  desk.add(deskTop);
  // Передняя панель
  const deskFront = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.9, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.7 })
  );
  deskFront.position.set(0, 0.45, 0.55);
  desk.add(deskFront);
  // Монитор
  const monitor = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.6, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  monitor.position.set(-1, 1.4, 0);
  desk.add(monitor);
  // Экран монитора (яркий)
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee })
  );
  screen.position.set(-1, 1.4, 0.03);
  desk.add(screen);
  // Растение
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.18, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4423 })
  );
  pot.position.set(1.4, 1.2, 0.3);
  desk.add(pot);
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x10b981 })
  );
  leaves.position.set(1.4, 1.7, 0.3);
  desk.add(leaves);
  // Табличка "РЕСЕПШН"
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512; signCanvas.height = 128;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#0c1018';
  sctx.fillRect(0, 0, 512, 128);
  sctx.fillStyle = '#6ee7b7';
  sctx.font = 'bold 64px monospace';
  sctx.textAlign = 'center';
  sctx.fillText('РЕСЕПШН', 256, 80);
  const signTex = new THREE.CanvasTexture(signCanvas);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 0.75),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  sign.position.set(0, 3, -7);
  desk.add(sign);
  desk.position.set(0, 0, -10);
  game.scene.add(desk);

  // === 4 КАБИНЕТА С КУШЕТКАМИ + СТЕНЫ + ДВЕРИ ===
  const roomPositions = [
    { pos: [-10, 0, -8], doorSide: 'top' },    // дверь со стороны +Z
    { pos: [10, 0, -8], doorSide: 'top' },
    { pos: [-10, 0, 8], doorSide: 'bottom' },  // дверь со стороны -Z
    { pos: [10, 0, 8], doorSide: 'bottom' }
  ];
  // Материал стен кабинета (тот же, что у больничных стен)
  const roomWallMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.7 });

  roomPositions.forEach((rp, i) => {
    const p = rp.pos;
    const room = new THREE.Group();
    const roomW = 5; // ширина кабинета
    const roomD = 5; // глубина
    const roomH = 3.2; // высота стен (ниже потолка)

    // === ПОЛ (ковёр) ===
    const carpet = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.05, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x4a1d96, roughness: 0.7 })
    );
    carpet.position.y = 0.025;
    room.add(carpet);

    // === СТЕНЫ (4 стены, в одной — дверной проём) ===
    // Задняя стена (от входа) — сплошная
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(roomW, roomH, 0.15),
      roomWallMat
    );
    backWall.position.set(0, roomH / 2, -roomD / 2);
    room.add(backWall);

    // Боковые стены — сплошные
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, roomH, roomD),
      roomWallMat
    );
    leftWall.position.set(-roomW / 2, roomH / 2, 0);
    room.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, roomH, roomD),
      roomWallMat
    );
    rightWall.position.set(roomW / 2, roomH / 2, 0);
    room.add(rightWall);

    // Передняя стена (со стороны входа) — с дверным проёмом
    const doorWidth = 1.4;
    const doorHeight = 2.4;
    // Левая часть передней стены (до двери)
    const frontLeftW = (roomW - doorWidth) / 2;
    if (frontLeftW > 0.1) {
      const frontLeft = new THREE.Mesh(
        new THREE.BoxGeometry(frontLeftW, roomH, 0.15),
        roomWallMat
      );
      frontLeft.position.set(-(doorWidth / 2 + frontLeftW / 2), roomH / 2, roomD / 2);
      room.add(frontLeft);
      // Верх над дверью
      const frontTopH = roomH - doorHeight;
      if (frontTopH > 0.1) {
        const frontTop = new THREE.Mesh(
          new THREE.BoxGeometry(doorWidth, frontTopH, 0.15),
          roomWallMat
        );
        frontTop.position.set(0, doorHeight + frontTopH / 2, roomD / 2);
        room.add(frontTop);
      }
    }
    // Правая часть передней стены
    if (frontLeftW > 0.1) {
      const frontRight = new THREE.Mesh(
        new THREE.BoxGeometry(frontLeftW, roomH, 0.15),
        roomWallMat
      );
      frontRight.position.set(doorWidth / 2 + frontLeftW / 2, roomH / 2, roomD / 2);
      room.add(frontRight);
    }

    // === ДВЕРНОЙ ПРОЁМ (рамка без двери — дверь открыта) ===
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a2810 });
    // Верхняя планка проёма
    const frameTop = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + 0.2, 0.12, 0.2),
      frameMat
    );
    frameTop.position.set(0, doorHeight + 0.06, roomD / 2);
    room.add(frameTop);
    // Левая стойка
    const frameL = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, doorHeight + 0.1, 0.2),
      frameMat
    );
    frameL.position.set(-doorWidth / 2 - 0.06, (doorHeight + 0.1) / 2, roomD / 2);
    room.add(frameL);
    // Правая стойка
    const frameR = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, doorHeight + 0.1, 0.2),
      frameMat
    );
    frameR.position.set(doorWidth / 2 + 0.06, (doorHeight + 0.1) / 2, roomD / 2);
    room.add(frameR);

    // === ДВЕРЬ (на петле у левого косяка, закрыта, открывается при подходе) ===
    const door = new THREE.Group();
    // Панель: от петли (x=0) до x=doorWidth
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, doorHeight, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.45 })
    );
    doorPanel.position.set(doorWidth / 2, doorHeight / 2, 0);
    door.add(doorPanel);
    // Декоративная накладка
    const doorPlate = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth - 0.3, doorHeight - 0.5, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xa06a35, roughness: 0.4 })
    );
    doorPlate.position.set(doorWidth / 2, doorHeight / 2, 0.045);
    door.add(doorPlate);
    // Круглое окно
    const doorWindow = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 16),
      new THREE.MeshStandardMaterial({ color: 0xbfdbfe, roughness: 0.1, metalness: 0.3 })
    );
    doorWindow.position.set(doorWidth / 2, doorHeight * 0.72, 0.055);
    door.add(doorWindow);
    // Ручка
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.15 })
    );
    handle.position.set(doorWidth - 0.12, doorHeight * 0.48, 0.07);
    door.add(handle);
    // Петли
    for (const hy of [0.25, 0.75]) {
      const hinge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.12, 6),
        new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7, roughness: 0.3 })
      );
      hinge.rotation.z = Math.PI / 2;
      hinge.position.set(-0.02, doorHeight * hy, 0);
      door.add(hinge);
    }
    // Петля = левый косяк проёма (x = -doorWidth/2 ровно, дверь плотно закрывает проём)
    door.position.set(-doorWidth / 2, 0, roomD / 2);
    door.rotation.y = 0; // закрыта
    door.userData.isDoor = true;
    door.userData.openAngle = Math.PI / 2.4; // открывается ВНУТРЬ кабинета
    room.add(door);
    if (!game.doors) game.doors = [];
    game.doors.push(door);

    // КОЛЛАЙДЕРЫ стен кабинета (чтобы нельзя было пройти сквозь)
    if (!game.colliders) game.colliders = [];
    const cx1 = p[0] - roomW / 2, cx2 = p[0] + roomW / 2;
    const cz1 = p[2] - roomD / 2, cz2 = p[2] + roomD / 2;
    const t = 0.2; // толщина коллайдера
    // Задняя стена
    game.colliders.push({ x1: cx1, z1: cz1 - t, x2: cx2, z2: cz1 + t });
    // Левая стена
    game.colliders.push({ x1: cx1 - t, z1: cz1, x2: cx1 + t, z2: cz2 });
    // Правая стена
    game.colliders.push({ x1: cx2 - t, z1: cz1, x2: cx2 + t, z2: cz2 });
    // Передняя стена — левая часть (до двери)
    game.colliders.push({ x1: cx1, z1: cz2 - t, x2: -doorWidth / 2 + p[0], z2: cz2 + t });
    // Передняя стена — правая часть (после двери)
    game.colliders.push({ x1: doorWidth / 2 + p[0], z1: cz2 - t, x2: cx2, z2: cz2 + t });
    // Кушетка (нельзя пройти сквозь)
    game.colliders.push({ x1: p[0] - 0.95, z1: p[2] - 1.05, x2: p[0] + 0.95, z2: p[2] });

    // === КУШЕТКА ===
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.25, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xe8edf5, roughness: 0.4 })
    );
    table.position.set(0, 0.55, -0.5);
    table.castShadow = true;
    room.add(table);
    const tableLegs = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.4, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x6b7280 })
    );
    tableLegs.position.set(0, 0.25, -0.5);
    room.add(tableLegs);
    // Подушка
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xfafafa })
    );
    pillow.position.set(0.55, 0.72, -0.5);
    room.add(pillow);

    // === Тумбочка с бутылочкой ===
    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x5a3e15, roughness: 0.6 })
    );
    cabinet.position.set(-1.8, 0.35, -0.5);
    room.add(cabinet);
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.25, 6),
      new THREE.MeshStandardMaterial({ color: 0x84cc16 })
    );
    bottle.position.set(-1.8, 0.83, -0.5);
    room.add(bottle);

    // === Стеллаж с медикаментами (у задней стены) ===
    const shelf = new THREE.Group();
    const shelfFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.6 })
    );
    shelfFrame.position.set(1.7, 0.75, -roomD / 2 + 0.2);
    room.add(shelfFrame);
    // Бутылочки на полках
    const medColors = [0xef4444, 0x60a5fa, 0x10b981, 0xfbbf24, 0xa78bfa, 0xf472b6];
    for (let j = 0; j < 6; j++) {
      const med = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6),
        new THREE.MeshStandardMaterial({ color: medColors[j] })
      );
      med.position.set(1.3 + (j % 3) * 0.4, 0.4 + Math.floor(j / 3) * 0.5, -roomD / 2 + 0.4);
      room.add(med);
    }

    // === Номер кабинета (табличка) ===
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 256; numCanvas.height = 256;
    const nctx = numCanvas.getContext('2d');
    nctx.fillStyle = '#0c1018';
    nctx.fillRect(0, 0, 256, 256);
    nctx.fillStyle = '#6ee7b7';
    nctx.font = 'bold 140px monospace';
    nctx.textAlign = 'center';
    nctx.fillText(String(i + 1), 128, 175);
    nctx.font = 'bold 28px sans-serif';
    nctx.fillText('КАБИНЕТ', 128, 220);
    const numTex = new THREE.CanvasTexture(numCanvas);
    const numSign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: numTex })
    );
    numSign.position.set(0, 2.7, -roomD / 2 + 0.1);
    room.add(numSign);

    // === Лампа на потолке кабинета ===
    const roomLight = new THREE.PointLight(0xfff5d6, 0.8, 6, 1.5);
    roomLight.position.set(0, 2.9, 0);
    room.add(roomLight);
    const roomLampHousing = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.1, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af })
    );
    roomLampHousing.position.set(0, 2.95, 0);
    room.add(roomLampHousing);

    room.position.set(p[0], 0, p[2]);
    game.scene.add(room);
  });

  // === ЗОНА ОТДЫХА (диван) ===
  const lounge = new THREE.Group();
  const couch = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.5, 1),
    new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.7 })
  );
  couch.position.set(0, 0.3, 0);
  lounge.add(couch);
  const couchBack = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.8, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x6d28d9 })
  );
  couchBack.position.set(0, 0.7, -0.45);
  lounge.add(couchBack);
  // Журнальный столик
  const ct = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.1, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x5a3e15 })
  );
  ct.position.set(0, 0.5, 0.9);
  lounge.add(ct);
  // Кофейная чашка
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.07, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0xfafafa })
  );
  cup.position.set(0.3, 0.6, 0.9);
  lounge.add(cup);
  lounge.position.set(0, 0, 15);
  game.scene.add(lounge);

  // === ВЕНДИНГОВЫЙ АВТОМАТ (магазин) ===
  const vending = new THREE.Group();
  const vmBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2.5, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4 })
  );
  vmBody.position.y = 1.25;
  vending.add(vmBody);
  // Стекло
  const vmGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.5),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 })
  );
  vmGlass.position.set(0, 1.5, 0.41);
  vending.add(vmGlass);
  // Предметы внутри
  const itemColors = [0xfbbf24, 0xef4444, 0x60a5fa, 0x10b981, 0xa78bfa, 0xf472b6];
  for (let i = 0; i < 6; i++) {
    const item = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.28, 0.18),
      new THREE.MeshStandardMaterial({ color: itemColors[i] })
    );
    item.position.set((i % 3 - 1) * 0.4, 0.8 + Math.floor(i / 3) * 0.6, 0.45);
    vending.add(item);
  }
  // Кнопки
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.3 })
    );
    btn.position.set(-0.4 + i * 0.4, 0.5, 0.41);
    vending.add(btn);
  }
  vending.position.set(-12, 0, 5);
  vending.userData.shop = true;
  game.scene.add(vending);

  // === СКЛАД С ЗАМКОМ (мини-игра) ===
  const storage = new THREE.Group();
  const sBody = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2.5, 1),
    new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.6 })
  );
  sBody.position.y = 1.25;
  storage.add(sBody);
  // Замок (золотой)
  const lock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 })
  );
  lock.position.set(0.6, 1.2, 0.51);
  lock.rotation.z = Math.PI / 2;
  storage.add(lock);
  // Знак замка
  const lockMark = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.02, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x1f2937 })
  );
  lockMark.position.set(0.6, 1.2, 0.58);
  storage.add(lockMark);
  // Табличка
  const ssCanvas = document.createElement('canvas');
  ssCanvas.width = 256; ssCanvas.height = 128;
  const ssctx = ssCanvas.getContext('2d');
  ssctx.fillStyle = '#1f2937';
  ssctx.fillRect(0, 0, 256, 128);
  ssctx.fillStyle = '#fbbf24';
  ssctx.font = 'bold 36px monospace';
  ssctx.textAlign = 'center';
  ssctx.fillText('СКЛАД', 128, 55);
  ssctx.fillText('🔒', 128, 100);
  const ssTex = new THREE.CanvasTexture(ssCanvas);
  const ssSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.5),
    new THREE.MeshBasicMaterial({ map: ssTex })
  );
  ssSign.position.set(0, 2.5, 0.51);
  storage.add(ssSign);
  storage.position.set(12, 0, 5);
  storage.userData.minigame = 'lockpick';
  game.scene.add(storage);

  // === NPC ДОКТОР ХАРЛОУ ===
  const npc = new THREE.Group();
  // Тело (халат)
  const npcBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 0.7, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.5 })
  );
  npcBody.position.y = 1.0;
  npc.add(npcBody);
  // Голова
  const npcHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfcd9b6, roughness: 0.6 })
  );
  npcHead.position.y = 1.75;
  npc.add(npcHead);
  // Глаза
  const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const lE = new THREE.Mesh(eyeGeo, eyeMat); lE.position.set(-0.08, 1.77, 0.22); npc.add(lE);
  const rE = new THREE.Mesh(eyeGeo, eyeMat); rE.position.set(0.08, 1.77, 0.22); npc.add(rE);
  // Медицинская шапочка
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.05, 16),
    new THREE.MeshStandardMaterial({ color: 0xfafafa })
  );
  cap.position.y = 2.0;
  npc.add(cap);
  // Крест на шапочке
  const crossMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.3 });
  const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.01), crossMat);
  cross1.position.set(0, 2.05, 0.27);
  npc.add(cross1);
  const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.01), crossMat);
  cross2.position.set(0, 2.05, 0.27);
  npc.add(cross2);
  // Имя NPC (табличка над головой)
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 256; nameCanvas.height = 64;
  const nmctx = nameCanvas.getContext('2d');
  nmctx.fillStyle = 'rgba(0,0,0,0)';
  nmctx.strokeStyle = '#000';
  nmctx.lineWidth = 4;
  nmctx.font = 'bold 24px sans-serif';
  nmctx.textAlign = 'center';
  nmctx.strokeText('Др. Харлоу', 128, 40);
  nmctx.fillStyle = '#fff';
  nmctx.fillText('Др. Харлоу', 128, 40);
  const nameTex = new THREE.CanvasTexture(nameCanvas);
  const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex, transparent: true }));
  nameSprite.position.y = 2.4;
  nameSprite.scale.set(1.5, 0.4, 1);
  npc.add(nameSprite);
  npc.position.set(0, 0, -6);
  npc.userData.npc = true;
  npc.userData.npcId = 'harlow';
  // Маршрут патрулирования (ВНЕ кабинетов — по коридорам)
  npc.userData.patrol = [
    new THREE.Vector3(0, 0, -14),
    new THREE.Vector3(-15, 0, -8),
    new THREE.Vector3(-15, 0, 0),
    new THREE.Vector3(-15, 0, 8),
    new THREE.Vector3(0, 0, 14),
    new THREE.Vector3(15, 0, 8),
    new THREE.Vector3(15, 0, 0),
    new THREE.Vector3(15, 0, -8),
    new THREE.Vector3(0, 0, -14)
  ];
  npc.userData.patrolIdx = 0;
  npc.userData.waitTime = 0;
  npc.userData.speed = 1.2;
  game.scene.add(npc);
  game.npc = npc;

  // === ТЕЛЕВИЗОР НАД РЕСЕПШН (камеры наблюдения) ===
  // Рендер-таргет: изображение с камеры видеонаблюдения
  game.tvRT = new THREE.WebGLRenderTarget(512, 288);
  game.tvCam = new THREE.PerspectiveCamera(55, 16 / 9, 0.5, 60);
  game.tvCam.position.set(16, 3.6, 14);
  game.tvCam.lookAt(0, 0, 0);

  const tv = new THREE.Group();
  // Кронштейн к потолку
  const tvPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 })
  );
  tvPole.position.y = 1.25;
  tv.add(tvPole);
  // Корпус ТВ
  const tvFrame = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.0, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35, metalness: 0.5 })
  );
  tvFrame.position.y = 0;
  tv.add(tvFrame);
  // Экран (текстура с камеры)
  const tvScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.15, 1.78),
    new THREE.MeshBasicMaterial({ map: game.tvRT.texture, color: 0xc8ffd8 })
  );
  tvScreen.position.set(0, 0, 0.08);
  tv.add(tvScreen);
  // Рамка-безель
  const tvBezel = new THREE.Mesh(
    new THREE.BoxGeometry(3.55, 2.15, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.5 })
  );
  tvBezel.position.set(0, 0, -0.03);
  tv.add(tvBezel);
  // Красный диод записи
  const tvLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2222 })
  );
  tvLed.position.set(1.6, -0.85, 0.08);
  tv.add(tvLed);
  // Табличка "ВИДЕОНАБЛЮДЕНИЕ"
  const tvSignCanvas = document.createElement('canvas');
  tvSignCanvas.width = 256; tvSignCanvas.height = 64;
  const tsc = tvSignCanvas.getContext('2d');
  tsc.fillStyle = '#0c1018';
  tsc.fillRect(0, 0, 256, 64);
  tsc.fillStyle = '#f87171';
  tsc.font = 'bold 26px monospace';
  tsc.textAlign = 'center';
  tsc.fillText('● ВИДЕОНАБЛЮДЕНИЕ', 128, 40);
  const tvSignTex = new THREE.CanvasTexture(tvSignCanvas);
  const tvSign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.55),
    new THREE.MeshBasicMaterial({ map: tvSignTex })
  );
  tvSign.position.set(0, -1.35, 0.05);
  tv.add(tvSign);

  tv.position.set(0, 2.7, -11.4); // за стойкой ресепшн, лицом к залу (+z)
  game.scene.add(tv);

  // === КОТ-ВРАЧ (для вида от третьего лица) ===
  const cat = new THREE.Group();
  const catMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.55 });
  // Тело
  const catBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.75, 4, 10), catMat);
  catBody.position.y = 1.05;
  cat.add(catBody);
  // Голова
  const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), catMat);
  catHead.position.y = 1.85;
  cat.add(catHead);
  // Уши (треугольные)
  const earGeo = new THREE.ConeGeometry(0.09, 0.18, 4);
  const lEar = new THREE.Mesh(earGeo, catMat);
  lEar.position.set(-0.14, 2.12, 0);
  lEar.rotation.z = 0.25;
  cat.add(lEar);
  const rEar = new THREE.Mesh(earGeo, catMat);
  rEar.position.set(0.14, 2.12, 0);
  rEar.rotation.z = -0.25;
  cat.add(rEar);
  // ЖЁЛТЫЕ глаза (светящиеся)
  const catEyeMat = new THREE.MeshStandardMaterial({ color: 0xffd400, emissive: 0xffcc00, emissiveIntensity: 1.2, roughness: 0.2 });
  const catEyeGeo = new THREE.SphereGeometry(0.055, 10, 8);
  const catLEye = new THREE.Mesh(catEyeGeo, catEyeMat);
  catLEye.position.set(-0.1, 1.9, 0.23);
  cat.add(catLEye);
  const catREye = new THREE.Mesh(catEyeGeo, catEyeMat);
  catREye.position.set(0.1, 1.9, 0.23);
  cat.add(catREye);
  // Хвост
  const catTail = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.5, 4, 6), catMat);
  catTail.position.set(0, 1.15, -0.4);
  catTail.rotation.x = 0.7;
  cat.add(catTail);
  // Халат поверх тела (белая передняя часть)
  const catCoat = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.8, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.7 })
  );
  catCoat.position.set(0, 1.0, 0.26);
  cat.add(catCoat);
  cat.visible = false; // показывается только в 3-м лице
  game.scene.add(cat);
  game.catMesh = cat;
  game.thirdPerson = false;

  // === СПАВН-ПОИНТ для пациентов (внутри кабинета, НЕ на кушетке) ===
  // Кушетка на z=-0.5, пациент справа от неё на свободном месте
  game.spawnPoints = roomPositions.map(rp => new THREE.Vector3(rp.pos[0] + 1.5, 0, rp.pos[2] - 0.5));
  // Точки перед дверями кабинетов (для маршрута пациентов через дверь)
  game.roomDoors = roomPositions.map(rp => new THREE.Vector3(rp.pos[0], 0, rp.pos[2] + 3.6));

  // === КОЛЛАЙДЕРЫ для внешних стен и мебели ===
  // (добавляем к коллайдерам кабинетов)
  const outerColliders = [
    // Внешние стены (границы -20..20)
    { x1: -20, z1: -20.2, x2: 20, z2: -19.8 }, // север
    { x1: -20, z1: 19.8, x2: 20, z2: 20.2 },   // юг
    { x1: -20.2, z1: -20, x2: -19.8, z2: 20 }, // запад
    { x1: 19.8, z1: -20, x2: 20.2, z2: 20 },   // восток
    // Стойка ресепшн
    { x1: -2, z1: -10.5, x2: 2, z2: -9.5 },
    // Диван (зона отдыха)
    { x1: -1.5, z1: 14.5, x2: 1.5, z2: 15.2 },
    // Вендинговый автомат
    { x1: -12.8, z1: 4.5, x2: -11.2, z2: 5.5 },
    // Склад
    { x1: 11, z1: 4.5, x2: 13, z2: 5.5 },
  ];
  outerColliders.forEach(c => game.colliders.push(c));

  // Controls
  game.controls = new PointerLockControls(game.camera, game.renderer.domElement);
  game.clock = new THREE.Clock();
  // Pointer Lock API доступен только на десктопах. На iPad/mobile вызов .lock() упадёт.
  game.hasPointerLock = !!(game.renderer.domElement.requestPointerLock || game.renderer.domElement.mozRequestPointerLock || game.renderer.domElement.webkitRequestPointerLock);

  // Resize handler
  window.addEventListener('resize', () => {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  console.log('[AH] initThree() завершён: сцена с кушетками, ресепшн, магазин, склад, NPC');
}

// ============================================================
// INPUT
// ============================================================
// Безопасный pointer lock — на iPad/mobile API отсутствует
function safeLock() {
  if (!game.controls) return;
  if (!game.hasPointerLock) return; // iOS / мобильные — просто игнорируем
  try {
    game.controls.lock();
  } catch (e) {
    console.warn('[AH] lock() failed:', e);
  }
}

function setupInput() {
  console.log('[AH] setupInput() старт');
  document.addEventListener('keydown', (e) => {
    game.keys[e.code] = true;
    if (e.code === 'KeyE') tryInteract();
    if (e.code === 'KeyF') { if (game.selectedPatient) treatPatient(); }
    if (e.code === 'KeyR') { if (game.selectedPatient) rejectPatient(); }
    if (e.code === 'KeyQ') {
      // Выбрать ближайшего пациента
      selectNearestPatient();
    }
    if (e.code === 'KeyV') {
      // Переключение вида: 1-е лицо ↔ 3-е лицо (кот-врач)
      game.thirdPerson = !game.thirdPerson;
      showToast(game.thirdPerson ? '🐱 Вид от третьего лица' : '👁 Вид от первого лица', 'info');
      Audio.click();
    }
    if (e.code === 'Escape') {
      if (game.controls.isLocked) game.controls.unlock();
    }
  });
  document.addEventListener('keyup', (e) => {
    game.keys[e.code] = false;
  });
  document.addEventListener('mousedown', (e) => {
    // ЛКМ = лечить, ПКМ = отклонить (только когда курсор захвачен и есть выбранный пациент)
    if (game.controls && game.controls.isLocked && game.selectedPatient && !game.modal && !game.showShiftIntro) {
      if (e.button === 0) { treatPatient(); return; }
      if (e.button === 2) { rejectPatient(); return; }
    }
    if (!game.controls.isLocked && !game.modal && !game.showShiftIntro) {
      safeLock();
    }
  });
  // Отключаем контекстное меню (ПКМ = отклонить)
  document.addEventListener('contextmenu', (e) => {
    if (game.controls && game.controls.isLocked) e.preventDefault();
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

  // Глобальный обработчик кликов на кнопки (event delegation)
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    if (target.id === 'treatBtn') {
      console.log('[AH] treatBtn нажат');
      if (game.selectedPatient) treatPatient();
    } else if (target.id === 'rejectBtn') {
      console.log('[AH] rejectBtn нажат');
      if (game.selectedPatient) rejectPatient();
    } else if (target.id === 'beginBtn') {
      // Обработчик уже есть, но на всякий случай
    }
  });

  // === СЕНСОРНОЕ УПРАВЛЕНИЕ (iPhone/iPad/Android) ===
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isTouch) setupTouchUI();

  console.log('[AH] setupInput() завершён');
}

// ============================================================
// TOUCH UI — виртуальный джойстик + кнопки действий
// ============================================================
function setupTouchUI() {
  const root = document.getElementById('root');
  const touch = document.createElement('div');
  touch.id = 'touchUI';
  touch.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 50;
    user-select: none; -webkit-user-select: none; touch-action: none;
    font-family: inherit;
  `;

  // === Джойстик (левый нижний угол, компактный) ===
  const stick = document.createElement('div');
  stick.id = 'joystick';
  stick.style.cssText = `
    position: absolute; left: 18px; bottom: 18px;
    width: 104px; height: 104px; border-radius: 50%;
    background: rgba(255,255,255,0.10);
    border: 2px solid rgba(110,231,183,0.5);
    pointer-events: auto; touch-action: none;
  `;
  const stickKnob = document.createElement('div');
  stickKnob.id = 'joystickKnob';
  stickKnob.style.cssText = `
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%,-50%);
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(110,231,183,0.7);
    border: 2px solid rgba(255,255,255,0.9);
    box-shadow: 0 0 10px rgba(110,231,183,0.6);
    transition: transform 0.05s linear;
  `;
  stick.appendChild(stickKnob);
  touch.appendChild(stick);

  // === Кнопка БЕГ (жёлтая) ===
  const btnRun = makeTouchButton('runBtn', '🏃\nБЕГ', 'left: 130px; bottom: 24px;', '#fbbf24');
  touch.appendChild(btnRun);

  // === Кнопка ЛЕЧИТЬ (зелёная) ===
  const btnTreat = makeTouchButton('treatTouchBtn', '💊\nЛЕЧИТЬ', 'right: 18px; bottom: 118px;', '#16a34a');
  touch.appendChild(btnTreat);

  // === Кнопка ОТКЛОНИТЬ (красная) ===
  const btnReject = makeTouchButton('rejectTouchBtn', '✖\nОТКЛОНИТЬ', 'right: 18px; bottom: 24px;', '#ef4444');
  touch.appendChild(btnReject);

  // === Кнопка ВЗАИМОДЕЙСТВИЕ (бирюзовая) ===
  const btnInteract = makeTouchButton('interactTouchBtn', '👆\nДЕЙСТВИЕ', 'right: 110px; bottom: 24px;', '#6ee7b7');
  touch.appendChild(btnInteract);

  root.appendChild(touch);

  // === Логика джойстика ===
  game.joystick = { x: 0, y: 0, active: false };
  const centerX = () => {
    const r = stick.getBoundingClientRect();
    return r.left + r.width / 2;
  };
  const centerY = () => {
    const r = stick.getBoundingClientRect();
    return r.top + r.height / 2;
  };
  const maxR = 38;

  const onStickStart = (e) => {
    e.preventDefault();
    game.joystick.active = true;
    onStickMove(e);
  };
  const onStickMove = (e) => {
    if (!game.joystick.active) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    let dx = pt.clientX - centerX();
    let dy = pt.clientY - centerY();
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) { dx = dx * maxR / dist; dy = dy * maxR / dist; }
    stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    game.joystick.x = dx / maxR;
    game.joystick.y = dy / maxR;
  };
  const onStickEnd = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    game.joystick.active = false;
    game.joystick.x = 0;
    game.joystick.y = 0;
    stickKnob.style.transform = 'translate(-50%,-50%)';
  };
  stick.addEventListener('pointerdown', onStickStart);
  document.addEventListener('pointermove', (e) => {
    if (game.joystick && game.joystick.active) onStickMove(e);
  });
  document.addEventListener('pointerup', onStickEnd);
  document.addEventListener('pointercancel', onStickEnd);

  // === Кнопки действий ===
  const bindButton = (btn, onPress) => {
    const fire = (e) => { e.preventDefault(); e.stopPropagation(); onPress(); };
    btn.addEventListener('pointerdown', fire);
    btn.addEventListener('click', fire);
  };
  bindButton(btnTreat, () => { if (game.selectedPatient) treatPatient(); });
  bindButton(btnReject, () => { if (game.selectedPatient) rejectPatient(); });
  bindButton(btnInteract, () => tryInteract());
  let runHeld = false;
  bindButton(btnRun, () => {
    runHeld = !runHeld;
    btnRun.style.opacity = runHeld ? '0.5' : '1';
    btnRun.style.background = runHeld ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.45)';
  });
  Object.defineProperty(game, 'runHeld', {
    get: () => runHeld,
    configurable: true
  });

  // === ПРАВЫЙ СТИК ДЛЯ ОБЗОРА (компактный) ===
  const lookStick = document.createElement('div');
  lookStick.id = 'lookStick';
  lookStick.style.cssText = `
    position: absolute; right: 18px; top: 44%; transform: translateY(-50%);
    width: 92px; height: 92px; border-radius: 50%;
    background: rgba(255,255,255,0.06);
    border: 2px solid rgba(100,150,200,0.4);
    pointer-events: auto; touch-action: none; z-index: 51;
  `;
  const lookKnob = document.createElement('div');
  lookKnob.style.cssText = `
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%,-50%);
    width: 38px; height: 38px; border-radius: 50%;
    background: rgba(100,150,200,0.6);
    border: 2px solid rgba(255,255,255,0.7);
    transition: transform 0.05s linear;
  `;
  lookStick.appendChild(lookKnob);
  touch.appendChild(lookStick);

  game.lookJoystick = { x: 0, y: 0, active: false };
  const lookCx = () => { const r = lookStick.getBoundingClientRect(); return r.left + r.width / 2; };
  const lookCy = () => { const r = lookStick.getBoundingClientRect(); return r.top + r.height / 2; };
  const lookMaxR = 32;
  const onLookStart = (e) => { e.preventDefault(); e.stopPropagation(); game.lookJoystick.active = true; onLookMove(e); };
  const onLookMove = (e) => {
    if (!game.lookJoystick.active) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    let dx = pt.clientX - lookCx();
    let dy = pt.clientY - lookCy();
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > lookMaxR) { dx = dx * lookMaxR / dist; dy = dy * lookMaxR / dist; }
    lookKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    game.lookJoystick.x = dx / lookMaxR;
    game.lookJoystick.y = dy / lookMaxR;
  };
  const onLookEnd = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    game.lookJoystick.active = false;
    game.lookJoystick.x = 0;
    game.lookJoystick.y = 0;
    lookKnob.style.transform = 'translate(-50%,-50%)';
  };
  lookStick.addEventListener('pointerdown', onLookStart);
  document.addEventListener('pointermove', (e) => { if (game.lookJoystick && game.lookJoystick.active) onLookMove(e); });
  document.addEventListener('pointerup', onLookEnd);
  document.addEventListener('pointercancel', onLookEnd);

  // === DRAG-ОБЗОР ИЗ ЛЮБОЙ ТОЧКИ ЭКРАНА (стандарт: палец вверх = взгляд вверх) ===
  // Свайп в любом свободном месте вращает камеру:
  //   влево/вправо — поворот, вверх — взгляд вверх, вниз — взгляд вниз (стандарт)
  let dragLookId = null;
  let dragLastX = 0, dragLastY = 0;
  document.addEventListener('pointerdown', (e) => {
    // Игнорируем кнопки, стики и HUD-элементы
    if (e.target.closest('button, #joystick, #lookStick, #hud, #touchUI button')) return;
    // На десктопе с pointer lock drag не нужен
    if (game.hasPointerLock && game.controls && game.controls.isLocked) return;
    dragLookId = e.pointerId;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
  });
  document.addEventListener('pointermove', (e) => {
    if (dragLookId === null || e.pointerId !== dragLookId) return;
    if (!game.camera) return;
    const dx = e.clientX - dragLastX;
    const dy = e.clientY - dragLastY;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
    const sens = 0.004;
    game.camera.rotation.y -= dx * sens;
    game.camera.rotation.x -= dy * sens; // СТАНДАРТ: палец вверх → взгляд вверх
    game.camera.rotation.x = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, game.camera.rotation.x));
  });
  document.addEventListener('pointerup', (e) => {
    if (e.pointerId === dragLookId) dragLookId = null;
  });
  document.addEventListener('pointercancel', (e) => {
    if (e.pointerId === dragLookId) dragLookId = null;
  });
}

function makeTouchButton(id, label, position, color) {
  const btn = document.createElement('button');
  btn.id = id;
  btn.style.cssText = `
    position: absolute; ${position}
    width: 82px; height: 72px; border-radius: 14px;
    background: ${color}55; color: #fff; font-size: 11px; font-weight: 800;
    border: 2px solid ${color}; cursor: pointer; pointer-events: auto;
    touch-action: none; user-select: none; -webkit-user-select: none;
    text-shadow: 0 1px 3px rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    white-space: pre-line; line-height: 1.1; text-align: center;
    transition: transform 0.08s ease, background 0.15s ease;
    font-family: inherit;
    z-index: 51;
  `;
  btn.textContent = label;
  btn.addEventListener('pointerdown', () => { btn.style.transform = 'scale(0.92)'; });
  btn.addEventListener('pointerup', () => { btn.style.transform = 'scale(1)'; });
  btn.addEventListener('pointercancel', () => { btn.style.transform = 'scale(1)'; });
  return btn;
}

function selectNearestPatient() {
  if (!game.camera) return;
  let nearest = null, minDist = 8;
  const camPos = game.playerPos || game.camera.position;
  game.patients.forEach(p => {
    if (!p.mesh) return;
    const d = p.mesh.position.distanceTo(camPos);
    if (d >= minDist) return;
    // Только если есть прямая видимость (нет стены между игроком и пациентом)
    if (!hasLineOfSight(camPos.x, camPos.z, p.mesh.position.x, p.mesh.position.z)) return;
    minDist = d;
    nearest = p;
  });
  if (nearest) {
    selectPatient(nearest);
    showToast('Выбран: ' + nearest.name + ' (' + minDist.toFixed(1) + ' ед.)', 'info');
  } else {
    showToast('Нет пациентов рядом', 'warn');
  }
}

// ============================================================
// INTERACT
// ============================================================
function tryInteract() {
  if (!game.controls.isLocked) {
    safeLock();
    return;
  }
  // 1. Попробуем raycast (прицел на пациенте)
  const forward = new THREE.Vector3();
  game.camera.getWorldDirection(forward);
  const origin = game.camera.position.clone();
  game.raycaster.set(origin, forward);
  game.raycaster.far = 8;

  const patientMeshes = game.patients.map(p => p.mesh).filter(Boolean);
  const intersects = game.raycaster.intersectObjects(patientMeshes, true);
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !obj.userData.patient) obj = obj.parent;
    if (obj && obj.userData.patient) {
      const p = game.patients.find(x => x.id === obj.userData.patient.id);
      if (p) {
        selectPatient(p);
        showToast('Выбран: ' + p.name, 'ok');
        return;
      }
    }
  }

  // 2. Fallback: ближайший пациент в радиусе 6 (только если нет стены между ним и игроком)
  let nearest = null, minDist = 6;
  const camPos = game.playerPos || game.camera.position;
  game.patients.forEach(p => {
    if (!p.mesh) return;
    const d = p.mesh.position.distanceTo(camPos);
    if (d >= minDist) return;
    if (!hasLineOfSight(camPos.x, camPos.z, p.mesh.position.x, p.mesh.position.z)) return;
    minDist = d;
    nearest = p;
  });
  if (nearest) {
    selectPatient(nearest);
    showToast('Выбран: ' + nearest.name + ' (рядом, ' + minDist.toFixed(1) + ' ед.)', 'ok');
  } else {
    showToast('Подойди ближе к пациенту', 'warn');
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
    // Покрасить всех детей в красный (mesh — это Group)
    if (p.mesh) {
      p.mesh.traverse(c => {
        if (c.isMesh && c.material) {
          c.material = c.material.clone();
          c.material.color.setHex(0xdc2626);
        }
      });
    }
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
  if (p.marker) game.scene.remove(p.marker);
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
  const model = makeAnimalModel(p.base, p.isAnomaly);

  // === МАРШРУТ: вход → стойка регистрации → кабинет ===
  // 1. Точка появления (вход с юга)
  // 2. Стойка ресепшн (перед стойкой)
  // 3. Свободный кабинет (спавн-поинт)
  const camPos0 = game.camera ? game.camera.position : new THREE.Vector3(0, 0, 0);
  const entrance = new THREE.Vector3(0, 0, 18);
  const reception = new THREE.Vector3(0, 0, -9);
  // Выбор кабинета: ближайший к игроку, но не занятый
  let roomTarget = null;
  if (game.spawnPoints && game.spawnPoints.length > 0) {
    const sorted = game.spawnPoints.slice().sort((a, b) => a.distanceTo(camPos0) - b.distanceTo(camPos0));
    for (const sp of sorted) {
      let occupied = false;
      for (const op of game.patients) {
        if (op.mesh && op.mesh.position.distanceTo(sp) < 2) { occupied = true; break; }
      }
      if (!occupied) { roomTarget = sp; break; }
    }
  }
  // Начальная позиция — у входа
  const rx = entrance.x;
  const rz = entrance.z;
  model.position.set(rx, 0, rz);
  // Пациент смотрит в сторону ресепшн
  {
    const dx = reception.x - rx;
    const dz = reception.z - rz;
    model.rotation.y = Math.atan2(dx, dz);
  }
  model.userData.patient = p;
  game.scene.add(model);

  // Старый код spawn-поинта полностью заменён логикой выше
  const _da_unused = camPos0; // (подавление неиспользуемой переменной)

  // Маркеры-стрелки над пациентами УБРАНЫ: достаточно внешнего вида.
  // Аномалии внешне не отличаются — их видно только на телевизоре с камерами.

  // Маршрут через дверь кабинета: ресепшн → точка перед дверью → место в кабинете
  let doorPoint = null;
  if (roomTarget && game.roomDoors) {
    let bestD = Infinity;
    for (const dp of game.roomDoors) {
      const d = dp.distanceTo(roomTarget);
      if (d < bestD) { bestD = d; doorPoint = dp; }
    }
  }

  // === СТЕЙТ-МАШИНА: вход → ресепшн → дверь кабинета → место ===
  game.patients.push({
    ...p,
    mesh: model,
    marker: null,
    animPhase: Math.random() * 10,
    waypoints: [entrance, reception, doorPoint, roomTarget].filter(Boolean),
    waypointIdx: 0,
    waitTimer: 0,
    state: 'walking'  // 'walking' | 'waiting_at_reception' | 'yielding'
  });
  addLog('info', 'Новый пациент: ' + p.name + ' идёт в регистратуру');
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

  // Компас/направление к ближайшему пациенту
  if (game.camera && game.patients.length > 0) {
    let nearest = null, minDist = Infinity;
    const camPos = game.camera.position;
    game.patients.forEach(p => {
      if (!p.mesh) return;
      const d = p.mesh.position.distanceTo(camPos);
      if (d < minDist) { minDist = d; nearest = p; }
    });
    if (nearest && minDist > 4) {
      // Показываем направление как стрелку на краю экрана
      const dir = new THREE.Vector3().subVectors(nearest.mesh.position, camPos);
      const angle = Math.atan2(dir.x, dir.z) - game.camera.rotation.y;
      // Нормализуем угол к [-PI, PI]
      let a = angle;
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      // Стрелка: поворот и сдвиг к краю экрана
      const edgeOffset = 110;
      const rad = a; // уже поворот
      const x = Math.sin(rad) * edgeOffset;
      const y = -Math.cos(rad) * edgeOffset;
      const color = nearest.isAnomaly ? '#fca5a5' : '#6ee7b7';
      const animClass = Math.sin(Date.now() / 300) > 0 ? 'comp-arrow-a' : 'comp-arrow-b';
      html += '<div id="compass" class="compass" style="left:calc(50% + ' + x + 'px); top:calc(50% + ' + y + 'px); color:' + color + ';">' +
        '<div class="comp-arrow ' + animClass + '" style="transform:rotate(' + (a * 180 / Math.PI) + 'deg);">▼</div>' +
        '<div class="comp-dist">' + minDist.toFixed(1) + 'м</div>' +
        '<div class="comp-label">' + (nearest.isAnomaly ? '⚠ ' : '') + nearest.name + '</div>' +
        '</div>';
    }
  }

  // Toasts will be added dynamically

  // Selected patient — большая карточка в центре нижней части экрана
  if (game.selectedPatient && !game.showShiftIntro) {
    const p = game.selectedPatient;
    const dist = p.mesh && game.camera ? p.mesh.position.distanceTo(game.camera.position).toFixed(1) : '?';
    html += '<div class="patient-card-big" id="patientCard">';
    html += '<div class="pcb-header">';
    html += '<div class="pcb-name">' + p.name + '</div>';
    html += '<div class="pcb-dist" id="pcbDist">' + dist + 'м</div>';
    html += '</div>';
    html += '<div class="pcb-condition">' + p.condition.label + '</div>';
    html += '<div class="pcb-symptom">' + p.condition.symptom + '</div>';
    html += '<div class="pcb-treat">💊 Нужно: <b>' + p.condition.treat + '</b></div>';
    html += '<div class="pcb-buttons">';
    html += '<button class="pcb-btn pcb-treat-btn" id="treatBtn">💊 ЛЕЧИТЬ [F]</button>';
    html += '<button class="pcb-btn pcb-reject" id="rejectBtn">✖ ОТКЛОНИТЬ [R]</button>';
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

  // Подсказки в центре экрана убраны по запросу

  hud.innerHTML = html;

  // Attach button handlers (через event delegation на body, чтобы не терялись)
  // Обработчики уже навешаны глобально в setupInput
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
    '<li>• <b>WASD</b> — движение (W=вперёд, S=назад)</li>' +
    '<li>• <b>Мышь</b> — обзор на 360°</li>' +
    '<li>• <b>Shift</b> — бег</li>' +
    '<li>• Подойдите к пациенту — карточка появится автоматически</li>' +
    '</ul>' +
    '<h3 style="color:var(--accent);font-size:14px;margin-top:14px;">Цель:</h3>' +
    '<p>Пройдите 6 смен. Лечите настоящих пациентов, а подозрительных — отклоняйте.</p>' +
    '<button class="modal-btn" id="beginBtn">Начать смену 1 →</button>' +
    '</div>';
  document.getElementById('root').appendChild(div);
  document.getElementById('beginBtn').onclick = () => {
    Audio.click();
    game.showShiftIntro = false;
    game.modal = null;
    document.getElementById('shiftIntro').remove();
    safeLock();
    spawnPatient();
    renderHud();
  };
}

// ============================================================
// COLLISION — проверка, не врезался ли игрок в стену/мебель
// ============================================================
function collidesWorld(x, z) {
  const r = 0.35; // радиус игрока
  const list = game.colliders || [];
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (x + r > c.x1 && x - r < c.x2 && z + r > c.z1 && z - r < c.z2) return true;
  }
  return false;
}

// Проверка прямой видимости: есть ли на пути от (x1,z1) к (x2,z2) коллайдер
function hasLineOfSight(x1, z1, x2, z2) {
  const list = game.colliders || [];
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (segmentIntersectsRect(x1, z1, x2, z2, c.x1, c.z1, c.x2, c.z2)) return false;
  }
  return true;
}

// Пересекает ли отрезок (x1,z1)-(x2,z2) прямоугольник [rx1,rz1]-[rx2,rz2]
function segmentIntersectsRect(x1, z1, x2, z2, rx1, rz1, rx2, rz2) {
  // Liang-Barsky: параметризуем отрезок P = P1 + t*(P2-P1), t∈[0,1]
  const dx = x2 - x1, dz = z2 - z1;
  let tmin = 0, tmax = 1;
  // Проверяем пересечение с 4 сторонами прямоугольника
  const edges = [
    [-dx, x1 - rx1],   // вход через левую сторону
    [dx, rx2 - x1],    // вход через правую сторону
    [-dz, z1 - rz1],   // вход через нижнюю
    [dz, rz2 - z1]     // вход через верхнюю
  ];
  for (let i = 0; i < 4; i++) {
    const p = edges[i][0], q = edges[i][1];
    if (p === 0) {
      if (q < 0) return false; // параллельно и вне прямоугольника
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > tmax) return false;
        if (t > tmin) tmin = t;
      } else {
        if (t < tmin) return false;
        if (t < tmax) tmax = t;
      }
    }
  }
  // Отрезок пересекает прямоугольник только если tmin <= tmax
  return tmin <= tmax;
}

// ============================================================
// GAME LOOP
// ============================================================
function update() {
  const dt = Math.min(game.clock.getDelta(), 0.1);
  game.animTime += dt;

  // Movement (W=вперёд, S=назад) + коллизии + джойстик. Логика — через playerPos.
  if (game.controls && !game.modal && !game.showShiftIntro) {
    // На сенсорных устройствах pointer lock не активируется — пропускаем проверку
    if (!game.joystick && game.controls && !game.controls.isLocked) return;
    // Клавиатура
    let keyFwd = (game.keys['KeyW'] ? 1 : 0) - (game.keys['KeyS'] ? 1 : 0);
    let keyStr = (game.keys['KeyD'] ? 1 : 0) - (game.keys['KeyA'] ? 1 : 0);
    // Джойстик (если есть и активен)
    if (game.joystick && game.joystick.active) {
      keyFwd += -game.joystick.y; // вверх стика = вперёд
      keyStr += game.joystick.x;  // вправо стика = вправо
    }
    // Ограничиваем
    const forward = Math.max(-1, Math.min(1, keyFwd));
    const strafe = Math.max(-1, Math.min(1, keyStr));
    const speedMult = ((game.keys['ShiftLeft'] || game.keys['ShiftRight']) || (game.runHeld)) ? 1.8 : 1;
    if (forward !== 0 || strafe !== 0) {
      // Направление взгляда по yaw камеры (не зависит от 1-го/3-го лица)
      const yaw = game.camera.rotation.y;
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const offset = new THREE.Vector3()
        .addScaledVector(fwd, forward * game.moveSpeed * speedMult * dt)
        .addScaledVector(right, strafe * game.moveSpeed * speedMult * dt);
      const px = game.playerPos.x;
      const pz = game.playerPos.z;
      // Пробуем по осям отдельно (скольжение вдоль стен)
      const nx = px + offset.x, nz = pz + offset.z;
      if (!collidesWorld(nx, pz)) game.playerPos.x = nx;
      if (!collidesWorld(game.playerPos.x, nz)) game.playerPos.z = nz;
      game.bobTime += dt * (speedMult === 1.8 ? 12 : 8);
      if (Math.random() < 0.04) Audio.footstep();
    }
  }

  // === ОБЗОР от правого стика (ИНВЕРТИРОВАН по вертикали: стик вверх = смотреть вниз) ===
  if (game.lookJoystick && game.camera && (game.lookJoystick.active || game.lookJoystick.x || game.lookJoystick.y)) {
    const sens = 2.2; // рад/сек при полном отклонении
    game.camera.rotation.y -= game.lookJoystick.x * sens * dt;
    game.camera.rotation.x -= game.lookJoystick.y * sens * dt; // стик вверх → взгляд вверх
    game.camera.rotation.x = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, game.camera.rotation.x));
  }

  // === КАМЕРА: 1-е или 3-е лицо (V переключает) ===
  {
    const bobY = Math.sin(game.bobTime) * 0.04;
    if (!game.thirdPerson) {
      // От первого лица: камера = глаза
      game.camera.position.set(game.playerPos.x, game.playerHeight + bobY, game.playerPos.z);
      if (game.catMesh) game.catMesh.visible = false;
    } else {
      // От третьего лица: камера позади и выше, кот-врач виден
      const yaw = game.camera.rotation.y;
      const back = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); // назад по взгляду
      game.camera.position.set(
        game.playerPos.x + back.x * 4.2,
        game.playerHeight + 2.1 + bobY * 0.4,
        game.playerPos.z + back.z * 4.2
      );
      if (game.catMesh) {
        game.catMesh.visible = true;
        game.catMesh.position.set(game.playerPos.x, 0, game.playerPos.z);
        // Кот смотрит туда же, куда камера
        game.catMesh.rotation.y = Math.atan2(-Math.sin(yaw), -Math.cos(yaw));
        // Виляние хвостом
        const tail = game.catMesh.children.find(c => c.geometry && c.geometry.type === 'CapsuleGeometry' && c.position.z < 0 && c.position.y < 1.4);
        if (tail) tail.rotation.z = Math.sin(game.animTime * 4) * 0.3;
      }
    }
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
    // === ДВИЖЕНИЕ ПО МАРШРУТУ (вход → ресепшн → дверь → кабинет) ===
    if (p.waypoints && p.waypointIdx < p.waypoints.length) {
      const target = p.waypoints[p.waypointIdx];
      const pos = p.mesh.position;
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      // Уступание дороги: если игрок слишком близко — стоим и ждём (не проходим сквозь него)
      const pdx = game.playerPos ? game.playerPos.x - pos.x : 0;
      const pdz = game.playerPos ? game.playerPos.z - pos.z : 0;
      const pdist = Math.sqrt(pdx * pdx + pdz * pdz);
      if (pdist < 1.4) {
        // Стоим, поворачиваемся к игроку (уступают дорогу)
        p.mesh.rotation.y = Math.atan2(pdx, pdz);
        p.mesh.position.y = Math.sin(p.animPhase * 2) * 0.05;
      } else if (dist < 0.3) {
        // Пришли на точку
        p.waypointIdx++;
        // Если это ресепшн (точка 1) — ждём 2-3 сек, потом идём в кабинет
        if (p.waypointIdx === 1) {
          p.state = 'waiting_at_reception';
          p.waitTimer = 2 + Math.random() * 1.5;
        } else if (p.waypointIdx >= p.waypoints.length) {
          p.state = 'arrived';
        }
      } else {
        // Идём к точке
        const speed = 1.4; // ед/с
        p.mesh.position.x += (dx / dist) * speed * dt;
        p.mesh.position.z += (dz / dist) * speed * dt;
        // Поворот в сторону движения
        p.mesh.rotation.y = Math.atan2(dx, dz);
        // Покачивание при ходьбе
        p.mesh.position.y = Math.abs(Math.sin(p.animPhase * 6)) * 0.08;
      }
    } else if (p.state === 'waiting_at_reception') {
      // Стоим на ресепшн, ждём
      p.waitTimer -= dt;
      // Смотрим в сторону стойки ресепшн
      const lookTarget = new THREE.Vector3(0, 0, -10);
      const dx = lookTarget.x - p.mesh.position.x;
      const dz = lookTarget.z - p.mesh.position.z;
      p.mesh.rotation.y = Math.atan2(dx, dz);
      if (p.waitTimer <= 0) {
        // Регистрация завершена — идём в кабинет
        p.state = 'walking';
        // waypointIdx уже указывает на кабинет (после ресепшн)
      }
    }
    // Маркер следует за пациентом
    if (p.marker) {
      p.marker.position.x = p.mesh.position.x;
      p.marker.position.z = p.mesh.position.z;
      p.marker.position.y = 0;
      const pulse = 1 + Math.sin(p.animPhase * 3) * 0.15;
      p.marker.children.forEach(c => {
        if (c.geometry && c.geometry.type === 'ConeGeometry') {
          c.scale.set(pulse, pulse, pulse);
        }
        if (c.material && c.material.opacity !== undefined && c.geometry && c.geometry.type === 'RingGeometry') {
          c.material.opacity = 0.4 + Math.sin(p.animPhase * 3) * 0.3;
        }
      });
    }
    // === ПУЛЬСАЦИЯ АУРЫ АНОМАЛИИ ===
    if (p.isAnomaly && p.mesh) {
      p.mesh.children.forEach(c => {
        if (c.userData && c.userData.isAnomalyAura) {
          const s = 1 + Math.sin(p.animPhase * 4) * 0.12;
          c.scale.set(s, s, s);
          if (c.material) {
            c.material.opacity = (c.geometry.parameters.radius > 0.95 ? 0.08 : 0.18) + Math.sin(p.animPhase * 4) * 0.06;
          }
        }
      });
    }
  });

  // === АВТОВЫБОР ближайшего пациента (только при прямой видимости) ===
  if (game.camera && game.playerPos) {
    const camPos = game.playerPos; // логическая позиция игрока (работает и в 3-м лице)
    let nearest = null, minDist = 4.0;
    game.patients.forEach(p => {
      if (!p.mesh) return;
      const d = p.mesh.position.distanceTo(camPos);
      if (d >= minDist) return;
      // Прямая видимость: нет стены между игроком и пациентом
      if (!hasLineOfSight(camPos.x, camPos.z, p.mesh.position.x, p.mesh.position.z)) return;
      minDist = d;
      nearest = p;
    });
    const newSelected = nearest && (!game.selectedPatient || game.selectedPatient.id !== nearest.id);
    if (!nearest && game.selectedPatient) {
      // Снимаем выделение если отошли далеко или стена между ними
      const cur = game.selectedPatient.mesh;
      if (cur) {
        const curDist = cur.position.distanceTo(camPos);
        if (curDist > 5 || !hasLineOfSight(camPos.x, camPos.z, cur.position.x, cur.position.z)) {
          game.selectedPatient = null;
          renderHud();
        }
      } else {
        game.selectedPatient = null;
        renderHud();
      }
    } else if (newSelected) {
      selectPatient(nearest);
      showToast('✓ Выбран: ' + nearest.name + ' (' + minDist.toFixed(1) + 'м)', 'ok');
    }

    // === ЖИВЫЕ МЕТРЫ: дистанция в карточке обновляется каждый кадр ===
    const distEl = document.getElementById('pcbDist');
    if (distEl && game.selectedPatient && game.selectedPatient.mesh) {
      const d = game.selectedPatient.mesh.position.distanceTo(camPos);
      distEl.textContent = d.toFixed(1) + 'м';
    }
  }

  // Auto-spawn
  if (game.controls && game.controls.isLocked && game.patients.length < 2) {
    if (Math.random() < 0.005) spawnPatient();
  }

  // === ДВИЖЕНИЕ NPC (Др. Харлоу) ===
  if (game.npc && game.npc.userData.patrol) {
    const ud = game.npc.userData;
    // Если ждём на точке
    if (ud.waitTime > 0) {
      ud.waitTime -= dt;
    } else {
      const target = ud.patrol[ud.patrolIdx];
      const pos = game.npc.position;
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.2) {
        // Пришли — переключаем на следующую точку
        ud.patrolIdx = (ud.patrolIdx + 1) % ud.patrol.length;
        ud.waitTime = 1.5 + Math.random() * 2; // постоим 1.5-3.5 сек
      } else {
        // Идём к точке
        const moveX = (dx / dist) * ud.speed * dt;
        const moveZ = (dz / dist) * ud.speed * dt;
        game.npc.position.x += moveX;
        game.npc.position.z += moveZ;
        // Поворот в сторону движения
        game.npc.rotation.y = Math.atan2(dx, dz);
        // Лёгкая покачивание при ходьбе (имитация шагов)
        const walkBob = Math.sin(game.animTime * 8) * 0.04;
        game.npc.position.y = walkBob;
      }
    }
  }

  // === АНИМАЦИЯ ДВЕРЕЙ: открываются при подходе игрока, закрываются при отходе ===
  if (game.doors && game.camera) {
    const camPos = game.playerPos || game.camera.position;
    const doorWorldPos = new THREE.Vector3();
    game.doors.forEach(door => {
      door.getWorldPosition(doorWorldPos);
      const d = Math.sqrt((camPos.x - doorWorldPos.x) ** 2 + (camPos.z - doorWorldPos.z) ** 2);
      // Дверь открыта, если игрок близко (< 3.2м) или уже внутри кабинета
      const openAngle = door.userData.openAngle || Math.PI / 2.4;
      const target = d < 3.2 ? openAngle : 0;
      const cur = door.rotation.y;
      const diff = target - cur;
      if (Math.abs(diff) > 0.002) {
        // Плавное открытие/закрытие
        door.rotation.y = cur + Math.sign(diff) * Math.min(Math.abs(diff), dt * 2.2);
        // Звук скрипа (редко, только при движении)
        if (Math.random() < 0.03) Audio.tone(70 + Math.random() * 50, 0.12, 'triangle', 0.04);
      }
    });
  }
}

function animate() {
  requestAnimationFrame(animate);
  update();
  if (game.renderer && game.scene && game.camera) {
    // === РЕНДЕР ТЕЛЕВИЗОРА (камера наблюдения → текстура) ===
    // Каждые 2 кадра для производительности. Аномалии светятся красным ТОЛЬКО на ТВ.
    game.tvFrameCount = (game.tvFrameCount || 0) + 1;
    if (game.tvRT && game.tvCam && game.tvFrameCount % 2 === 0) {
      const auras = game.anomalyAuras || [];
      auras.forEach(a => { a.visible = true; });
      game.renderer.setRenderTarget(game.tvRT);
      game.renderer.render(game.scene, game.tvCam);
      game.renderer.setRenderTarget(null);
      auras.forEach(a => { a.visible = false; });
    }
    game.renderer.render(game.scene, game.camera);
  }
}

// ============================================================
// BOOT
// ============================================================
// Компактный показ ошибок: одна плашка сверху, исчезает сама.
// Никаких больших красных окон на весь экран.
let _errBox = null;
function showRuntimeError(title, detail) {
  console.error('[AH]', title, detail || '');
  if (_errBox) _errBox.remove();
  _errBox = document.createElement('div');
  _errBox.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);' +
    'background:rgba(60,10,10,0.92);color:#fca5a5;padding:8px 14px;border-radius:10px;' +
    'z-index:9999;font-size:12px;max-width:90vw;white-space:pre-wrap;pointer-events:none;';
  _errBox.textContent = title + (detail ? ': ' + detail : '');
  document.body.appendChild(_errBox);
  setTimeout(() => { if (_errBox) { _errBox.remove(); _errBox = null; } }, 10000);
}

window.addEventListener('error', (e) => {
  showRuntimeError('Ошибка', (e.message || 'Script error') + ' @' + (e.filename || '?') + ':' + (e.lineno || '?'));
}, true); // capture — ловит и ошибки в модулях

window.addEventListener('unhandledrejection', (e) => {
  showRuntimeError('Promise', e.reason && e.reason.message || String(e.reason));
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
  showRuntimeError('BOOT FAILED', e.message + '\n' + e.stack);
}
