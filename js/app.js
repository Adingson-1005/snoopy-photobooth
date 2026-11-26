// ===== SCREEN NAVIGATION =====
const screens = document.querySelectorAll('.screen');

function showScreen(id) {
  screens.forEach(s => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}

document.getElementById('startBtn')
  .addEventListener('click', () => showScreen('editor'));

// ===== ICON SHAPES (used by landing floaters AND the canvas) =====
const PATH_D = {
  heart: 'M12 21s-7.5-4.6-9.6-9.1C.8 8.4 2.7 5 6 5c2 0 3.4 1.1 4.2 2.4h3.6C14.6 6.1 16 5 18 5c3.3 0 5.2 3.4 3.6 6.9C19.5 16.4 12 21 12 21z',
  star: 'M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z',
  sparkle: 'M12 1l2.2 8.8L23 12l-8.8 2.2L12 23l-2.2-8.8L1 12l8.8-2.2z'
};
const svgIcon = d => `<svg viewBox="0 0 24 24" width="24" height="24"><path d="${d}"/></svg>`;

// ===== LANDING FLOATERS =====
const floaterKeys = ['heart', 'star', 'sparkle'];
const floaterColors = ['#f8a5c2', '#ffd966', '#9fd6f0', '#e85d75'];
const floatersEl = document.getElementById('floaters');

for (let i = 0; i < 18; i++) {
  const el = document.createElement('span');
  el.className = 'floater';
  el.innerHTML = svgIcon(PATH_D[floaterKeys[i % floaterKeys.length]]);
  el.style.left = Math.random() * 100 + '%';
  el.style.width = 16 + Math.random() * 18 + 'px';
  el.style.fill = floaterColors[i % floaterColors.length];
  el.style.animationDuration = 8 + Math.random() * 10 + 's';
  el.style.animationDelay = -Math.random() * 15 + 's';
  floatersEl.appendChild(el);
}

// ===== CONFIG (edit these anytime) =====
const CONFIG = {
  recipientName: '',                  // e.g. 'Maria'
  woodstock: [],                      // numbers of your Woodstock images, e.g. [5, 9]
  snoopy: [1, 2, 3, 4, 6, 7, 8, 10]   // numbers of your Snoopy images
};

// ===== THEMES =====
const THEMES = {
  pink: {
    pattern: 'gingham',
    text: '#e85d75',
    accent: '#e85d75',
    frame: '#ffffff',
    deco: ['#e85d75', '#f8a5c2', '#ffd966', '#9fd6f0'],
    bgs: [
      { name: 'Pastel pink', color: '#f8c8dc' },
      { name: 'Soft rose', color: '#ffdbe8' },
      { name: 'Baby blue', color: '#bfe3f5' },
      { name: 'Butter yellow', color: '#fff1a8' }
    ]
  },
  vintage: {
    pattern: 'paper',
    text: '#7a4e2d',
    accent: '#b5533c',
    frame: '#fffaf0',
    deco: ['#b5533c', '#d9a441', '#6f8f72', '#7aa5b8'],
    bgs: [
      { name: 'Cream', color: '#fff3d6' },
      { name: 'Parchment', color: '#f0e0bd' },
      { name: 'Sage', color: '#dfe8d5' },
      { name: 'Dusty blue', color: '#cfe0e8' }
    ]
  }
};

// ===== SETTINGS (what the user customizes) =====
const defaultSettings = () => ({
  theme: 'pink',
  name: CONFIG.recipientName,
  message: 'Wishing you the happiest day!',
  date: 'My Special Day',
  bgIndex: 0,
  stickers: { snoopy: true, woodstock: true, hearts: true, stars: true, flowers: true, sparkles: true }
});
let settings = defaultSettings();

// ===== PHOTO STATE =====
const MAX_SIDE = 1600;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const photos = [null, null, null, null];   // each: canvas holding resized photo
let activeSlot = null;

// Per-photo adjustments (crop position, zoom, rotation, filters)
const FILTER_OK = 'filter' in CanvasRenderingContext2D.prototype;
const defaultAdjust = () => ({ zoom: 1, panX: 0, panY: 0, rot: 0, brightness: 100, contrast: 100, saturation: 100 });
const adjusts = photos.map(defaultAdjust);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const slotsEl = document.getElementById('slots');
const fileInput = document.getElementById('fileInput');
const errorEl = document.getElementById('uploadError');
const generateBtn = document.getElementById('generateBtn');

const SVG = {
  upload: '<svg viewBox="0 0 24 24" width="32" height="32"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
  swap: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  crop: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/></svg>'
};

// ===== IMAGE LOADING (fixes EXIF rotation + shrinks big photos) =====
async function fileToCanvas(file) {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG, or WEBP image.');
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('That file could not be opened as an image.');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return c;
}

// ===== UPLOAD SLOTS UI =====
function renderSlots() {
  slotsEl.innerHTML = '';
  photos.forEach((canvas, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot' + (canvas ? ' filled' : '');
    slot.tabIndex = 0;
    slot.setAttribute('role', 'button');
    slot.setAttribute('aria-label', canvas ? `Replace photo ${i + 1}` : `Add photo ${i + 1}`);

    const num = `<span class="num">${i + 1}</span>`;
    if (canvas) {
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/jpeg', 0.7);
      img.alt = `Photo ${i + 1}`;
      slot.append(img);
      slot.insertAdjacentHTML('beforeend', num + `
        <div class="slot-actions">
          <button class="icon-btn" data-act="edit" aria-label="Crop and adjust">${SVG.crop}</button>
          <button class="icon-btn" data-act="replace" aria-label="Replace">${SVG.swap}</button>
          <button class="icon-btn" data-act="remove" aria-label="Remove">${SVG.trash}</button>
        </div>`);
    } else {
      slot.insertAdjacentHTML('beforeend', num + SVG.upload + '<span>Add photo</span>');
    }

    slot.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'remove') { photos[i] = null; adjusts[i] = defaultAdjust(); update(); return; }
      if (act === 'edit') { openCropper(i); return; }
      activeSlot = i;
      fileInput.click();
    });
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); slot.click(); }
    });
    slotsEl.append(slot);
  });
}

// =====================================================================
//  STRIP RENDERER (used for the live preview and for the final PNG)
// =====================================================================
const W = 900, H = 2400;
const L = { photoX: 90, photoW: 720, photoH: 450, photoY: 270, gap: 30 };
const PACIFICO = "'Pacifico', cursive";
const FREDOKA = "'Fredoka', sans-serif";

// Corner character positions. group = key in CONFIG.
const CHAR_SLOTS = [
  { group: 'snoopy',    n: 0, x: 40,  y: 50,   size: 150, rot: -0.08 },
  { group: 'woodstock', n: 0, x: 710, y: 50,   size: 150, rot: 0.08 },
  { group: 'woodstock', n: 1, x: 40,  y: 2190, size: 170, rot: 0.06 },
  { group: 'snoopy',    n: 1, x: 690, y: 2190, size: 170, rot: -0.06 }
];

// Character image cache
const imgCache = {};
function loadChar(n) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);   // missing file = just skip it
    img.src = `assets/characters/snoopy${n}.png`;
  });
}
async function preloadChars() {
  const nums = [...CONFIG.snoopy.slice(0, 2), ...CONFIG.woodstock.slice(0, 2)];
  await Promise.all(nums.map(async n => { imgCache[n] = await loadChar(n); }));
}

// Helpers
const Path = {
  heart: new Path2D(PATH_D.heart),
  star: new Path2D(PATH_D.star),
  sparkle: new Path2D(PATH_D.sparkle)
};

function rng(seed) {                       // seeded random so the texture never flickers
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawText(ctx, text, x, y, maxW, start, min, family, weight, color) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > min && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

// Where the photo sits inside a frame, given zoom/rotation/pan
function adjustGeometry(src, w, h, adj) {
  const turned = adj.rot % 2 === 1;
  const sw = turned ? src.height : src.width;
  const sh = turned ? src.width : src.height;
  const s = Math.max(w / sw, h / sh) * adj.zoom;
  return {
    s,
    slackX: Math.max(0, (sw * s - w) / 2),
    slackY: Math.max(0, (sh * s - h) / 2)
  };
}

// Draws one photo into a frame, cropped and adjusted (no stretching)
function drawAdjusted(ctx, src, x, y, w, h, adj) {
  const { s, slackX, slackY } = adjustGeometry(src, w, h, adj);
  const ox = clamp(adj.panX, -1, 1) * slackX;
  const oy = clamp(adj.panY, -1, 1) * slackY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (FILTER_OK && (adj.brightness !== 100 || adj.contrast !== 100 || adj.saturation !== 100)) {
    ctx.filter = `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%)`;
  }
  ctx.translate(x + w / 2 + ox, y + h / 2 + oy);
  ctx.rotate(adj.rot * Math.PI / 2);
  ctx.scale(s, s);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  ctx.restore();
}

function drawShape(ctx, kind, x, y, size, color, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  if (kind === 'flower') {
    for (let k = 0; k < 5; k++) {
      const a = (k * 2 * Math.PI) / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * size * 0.26, Math.sin(a) * size * 0.26, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd966';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.scale(size / 24, size / 24);
    ctx.translate(-12, -12);
    ctx.fill(Path[kind]);
  }
  ctx.restore();
}

// Layers
function drawBackground(ctx, theme, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);

  if (theme.pattern === 'gingham') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 30, H);
    for (let y = 0; y < H; y += 60) ctx.fillRect(0, y, W, 30);
  } else {
    const r = rng(7);
    ctx.fillStyle = 'rgba(120,80,40,0.07)';
    for (let i = 0; i < 1500; i++) ctx.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.7);
    g.addColorStop(0, 'rgba(120,80,40,0)');
    g.addColorStop(1, 'rgba(120,80,40,0.14)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // dashed scrapbook border
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 12]);
  roundRectPath(ctx, 16, 16, W - 32, H - 32, 28);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawMarginDecor(ctx, s, theme) {
  const map = { hearts: 'heart', stars: 'star', flowers: 'flower', sparkles: 'sparkle' };
  const kinds = Object.keys(map).filter(k => s.stickers[k]).map(k => map[k]);
  if (!kinds.length) return;
  for (let i = 0; i < 16; i++) {
    const row = i >> 1, side = i & 1;
    const x = side ? 845 : 55;
    const y = 330 + row * 240 + (side ? 120 : 0);
    const rot = (((i * 37) % 30) - 15) * Math.PI / 180;
    drawShape(ctx, kinds[i % kinds.length], x, y, 34 + (i % 3) * 4, theme.deco[i % theme.deco.length], rot);
  }
}

function drawHeader(ctx, s, theme) {
  const name = s.name.trim();
  const title = 'Happy Birthday' + (name ? ', ' + name : '') + '!';
  drawText(ctx, title, W / 2, 115, 500, 76, 30, PACIFICO, '400', theme.text);
  const msg = s.message.trim();
  if (msg) drawText(ctx, msg, W / 2, 195, 500, 36, 20, FREDOKA, '600', theme.text);
}

function drawPhotos(ctx, theme, list, adjustList) {
  for (let i = 0; i < 4; i++) {
    const x = L.photoX, y = L.photoY + i * (L.photoH + L.gap);

    // frame with soft shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = theme.frame;
    roundRectPath(ctx, x, y, L.photoW, L.photoH, 26);
    ctx.fill();
    ctx.restore();

    // photo (or placeholder)
    ctx.save();
    roundRectPath(ctx, x + 10, y + 10, L.photoW - 20, L.photoH - 20, 18);
    ctx.clip();
    if (list[i]) {
      drawAdjusted(ctx, list[i], x + 10, y + 10, L.photoW - 20, L.photoH - 20, adjustList[i]);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(x, y, L.photoW, L.photoH);
      ctx.globalAlpha = 0.5;
      drawText(ctx, String(i + 1), x + L.photoW / 2, y + L.photoH / 2, 200, 110, 110, PACIFICO, '400', theme.accent);
    }
    ctx.restore();
  }
}

function drawFooter(ctx, s, theme) {
  const date = s.date.trim();
  if (date) drawText(ctx, date, W / 2, 2275, 440, 44, 22, FREDOKA, '600', theme.text);
  drawText(ctx, "Snoopy's Photo Booth", W / 2, 2335, 440, 34, 20, PACIFICO, '400', theme.accent);
}

function drawCharacters(ctx, s) {
  CHAR_SLOTS.forEach(slot => {
    if (!s.stickers[slot.group]) return;
    const num = CONFIG[slot.group][slot.n];
    const img = num !== undefined ? imgCache[num] : null;
    if (!img) return;
    const k = Math.min(slot.size / img.width, slot.size / img.height);
    const w = img.width * k, h = img.height * k;
    ctx.save();
    ctx.translate(slot.x + slot.size / 2, slot.y + slot.size / 2);
    ctx.rotate(slot.rot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  });
}

// Main: draws the whole strip. scale < 1 is used for the small preview.
function renderStrip(ctx, s, photoList, scale = 1, adjustList = adjusts) {
  const theme = THEMES[s.theme];
  const bg = theme.bgs[s.bgIndex] || theme.bgs[0];
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, theme, bg.color);
  drawMarginDecor(ctx, s, theme);
  drawHeader(ctx, s, theme);
  drawPhotos(ctx, theme, photoList, adjustList);
  drawFooter(ctx, s, theme);
  drawCharacters(ctx, s);
  ctx.restore();
}

// ===== LIVE PREVIEW =====
const PREVIEW_SCALE = 0.6;
const previewCanvas = document.getElementById('previewCanvas');
previewCanvas.width = W * PREVIEW_SCALE;
previewCanvas.height = H * PREVIEW_SCALE;
const pctx = previewCanvas.getContext('2d');

let raf = 0;
function scheduleRender() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => renderStrip(pctx, settings, photos, PREVIEW_SCALE));
}

// ===== CUSTOMIZE CONTROLS =====
const nameInput = document.getElementById('nameInput');
const msgInput = document.getElementById('msgInput');
const dateInput = document.getElementById('dateInput');
const swatchesEl = document.getElementById('swatches');

function renderSwatches() {
  swatchesEl.innerHTML = '';
  THEMES[settings.theme].bgs.forEach((bg, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (i === settings.bgIndex ? ' selected' : '');
    b.style.background = bg.color;
    b.setAttribute('aria-label', bg.name);
    b.setAttribute('aria-pressed', String(i === settings.bgIndex));
    b.addEventListener('click', () => {
      settings.bgIndex = i;
      renderSwatches();
      scheduleRender();
    });
    swatchesEl.append(b);
  });
}

// Push current settings into the form fields (also used by Reset)
function syncControls() {
  nameInput.value = settings.name;
  msgInput.value = settings.message;
  dateInput.value = settings.date;
  document.querySelectorAll('input[name="theme"]').forEach(r => { r.checked = r.value === settings.theme; });
  document.querySelectorAll('[data-sticker]').forEach(cb => { cb.checked = settings.stickers[cb.dataset.sticker]; });
  renderSwatches();
}

document.querySelectorAll('input[name="theme"]').forEach(r => {
  r.addEventListener('change', () => {
    settings.theme = r.value;
    settings.bgIndex = 0;
    renderSwatches();
    scheduleRender();
  });
});
nameInput.addEventListener('input', () => { settings.name = nameInput.value; scheduleRender(); });
msgInput.addEventListener('input', () => { settings.message = msgInput.value; scheduleRender(); });
dateInput.addEventListener('input', () => { settings.date = dateInput.value; scheduleRender(); });
document.querySelectorAll('[data-sticker]').forEach(cb => {
  cb.addEventListener('change', () => {
    settings.stickers[cb.dataset.sticker] = cb.checked;
    scheduleRender();
  });
});

// ===== UPDATE + EVENTS =====
function update() {
  renderSlots();
  generateBtn.disabled = photos.some(p => !p);
  scheduleRender();
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';              // allows choosing the same file again
  if (!file || activeSlot === null) return;
  errorEl.textContent = '';
  try {
    photos[activeSlot] = await fileToCanvas(file);
    adjusts[activeSlot] = defaultAdjust();
    update();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('backBtn').addEventListener('click', () => showScreen('landing'));

// ===== GENERATE + RESULT =====
const resultImg = document.getElementById('resultImg');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const FILENAME = 'snoopy-birthday-photostrip.png';
let resultBlob = null;
let resultUrl = null;

async function generateStrip() {
  if (photos.some(p => !p)) {
    errorEl.textContent = 'Please add all 4 photos first.';
    return;
  }
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';
  try {
    await Promise.all([
      document.fonts.load("76px 'Pacifico'"),
      document.fonts.load("400 40px 'Fredoka'"),
      document.fonts.load("600 40px 'Fredoka'")
    ]);
    await preloadChars();

    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    renderStrip(c.getContext('2d'), settings, photos, 1);

    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    if (!blob) throw new Error('Could not create the image. Please try again.');

    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultBlob = blob;
    resultUrl = URL.createObjectURL(blob);
    resultImg.src = resultUrl;
    errorEl.textContent = '';
    showScreen('result');
  } catch (err) {
    errorEl.textContent = err.message || 'Something went wrong. Please try again.';
  } finally {
    generateBtn.textContent = 'Generate Photostrip';
    generateBtn.disabled = photos.some(p => !p);
  }
}

async function downloadStrip() {
  if (!resultBlob) return;
  const file = new File([resultBlob], FILENAME, { type: 'image/png' });

  // Phones: native Share sheet (has "Save Image")
  if (isTouch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Snoopy's Photo Booth" });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;   // user closed the sheet
    }
  }

  // Desktop / fallback: normal download
  const a = document.createElement('a');
  a.href = resultUrl;
  a.download = FILENAME;
  document.body.append(a);
  a.click();
  a.remove();
}

function resetAll() {
  photos.fill(null);
  adjusts.forEach((_, i) => { adjusts[i] = defaultAdjust(); });
  settings = defaultSettings();
  errorEl.textContent = '';
  syncControls();
  update();
}

generateBtn.addEventListener('click', generateStrip);
downloadBtn.addEventListener('click', downloadStrip);
document.getElementById('editBtn').addEventListener('click', () => showScreen('editor'));

resetBtn.addEventListener('click', () => {
  if (confirm('Clear your photos and start over?')) resetAll();
});

document.getElementById('anotherBtn').addEventListener('click', () => {
  if (!confirm('Start a new photostrip? Your current one will be cleared. Download it first if you want to keep it.')) return;
  resetAll();
  showScreen('editor');
});

// ===== CROP / ADJUST EDITOR =====
const cropModal = document.getElementById('cropModal');
const cropCanvas = document.getElementById('cropCanvas');
const cctx = cropCanvas.getContext('2d');
const FW = L.photoW - 20, FH = L.photoH - 20;      // real frame size (700 x 430)
cropCanvas.width = FW;
cropCanvas.height = FH;

const zoomRange = document.getElementById('zoomRange');
const brightRange = document.getElementById('brightRange');
const contrastRange = document.getElementById('contrastRange');
const satRange = document.getElementById('satRange');

let cropIndex = null;
let draft = null;

function drawCropper() {
  cctx.fillStyle = '#ddd';
  cctx.fillRect(0, 0, FW, FH);
  drawAdjusted(cctx, photos[cropIndex], 0, 0, FW, FH, draft);

  // rule-of-thirds guide (editor only, never exported)
  cctx.strokeStyle = 'rgba(255,255,255,0.7)';
  cctx.lineWidth = 2;
  cctx.beginPath();
  for (let k = 1; k < 3; k++) {
    cctx.moveTo(FW * k / 3, 0); cctx.lineTo(FW * k / 3, FH);
    cctx.moveTo(0, FH * k / 3); cctx.lineTo(FW, FH * k / 3);
  }
  cctx.stroke();
}

function syncCropControls() {
  zoomRange.value = Math.round(draft.zoom * 100);
  brightRange.value = draft.brightness;
  contrastRange.value = draft.contrast;
  satRange.value = draft.saturation;
}

function openCropper(i) {
  cropIndex = i;
  draft = { ...adjusts[i] };
  document.getElementById('filterControls').hidden = !FILTER_OK;
  syncCropControls();
  cropModal.hidden = false;
  document.body.style.overflow = 'hidden';
  drawCropper();
  document.getElementById('cropApply').focus();
}

function closeCropper() {
  cropModal.hidden = true;
  document.body.style.overflow = '';
  cropIndex = null;
  draft = null;
}

// Sliders
[
  [zoomRange, v => { draft.zoom = v / 100; }],
  [brightRange, v => { draft.brightness = v; }],
  [contrastRange, v => { draft.contrast = v; }],
  [satRange, v => { draft.saturation = v; }]
].forEach(([el, apply]) => {
  el.addEventListener('input', () => { apply(+el.value); drawCropper(); });
});

// Rotate
document.getElementById('rotLeft').addEventListener('click', () => {
  draft.rot = (draft.rot + 3) % 4; draft.panX = 0; draft.panY = 0; drawCropper();
});
document.getElementById('rotRight').addEventListener('click', () => {
  draft.rot = (draft.rot + 1) % 4; draft.panX = 0; draft.panY = 0; drawCropper();
});

// Drag to reposition (mouse + touch)
let drag = null;
cropCanvas.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, y: e.clientY, panX: draft.panX, panY: draft.panY };
  cropCanvas.setPointerCapture(e.pointerId);
  cropCanvas.classList.add('dragging');
});
cropCanvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const k = FW / cropCanvas.getBoundingClientRect().width;   // screen px -> canvas px
  const { slackX, slackY } = adjustGeometry(photos[cropIndex], FW, FH, draft);
  const dx = (e.clientX - drag.x) * k;
  const dy = (e.clientY - drag.y) * k;
  draft.panX = slackX ? clamp(drag.panX + dx / slackX, -1, 1) : 0;
  draft.panY = slackY ? clamp(drag.panY + dy / slackY, -1, 1) : 0;
  drawCropper();
});
['pointerup', 'pointercancel'].forEach(ev => {
  cropCanvas.addEventListener(ev, () => { drag = null; cropCanvas.classList.remove('dragging'); });
});

// Mouse wheel zoom (desktop)
cropCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  draft.zoom = clamp(draft.zoom - e.deltaY / 1000, 1, 3);
  syncCropControls();
  drawCropper();
}, { passive: false });

// Buttons
document.getElementById('cropReset').addEventListener('click', () => {
  draft = defaultAdjust(); syncCropControls(); drawCropper();
});
document.getElementById('cropCancel').addEventListener('click', closeCropper);
document.getElementById('cropApply').addEventListener('click', () => {
  adjusts[cropIndex] = { ...draft };
  closeCropper();
  update();
});
cropModal.addEventListener('click', e => { if (e.target === cropModal) closeCropper(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !cropModal.hidden) closeCropper(); });

// ===== INIT =====
async function init() {
  syncControls();
  update();                                   // draw immediately
  await Promise.all([                         // wait for fonts so the canvas uses them
    document.fonts.load("76px 'Pacifico'"),
    document.fonts.load("400 40px 'Fredoka'"),
    document.fonts.load("600 40px 'Fredoka'")
  ]);
  await preloadChars();
  scheduleRender();                           // redraw with fonts + characters
}
init();