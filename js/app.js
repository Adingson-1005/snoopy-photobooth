// ===== SCREEN NAVIGATION =====
const screens = document.querySelectorAll('.screen');

function showScreen(id) {
  screens.forEach(s => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}

document.getElementById('startBtn')
  .addEventListener('click', () => showScreen('editor'));

// ===== FLOATING HEARTS & STARS (SVG icons) =====
const ICONS = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.1C.8 8.4 2.7 5 6 5c2 0 3.4 1.1 4.2 2.4h3.6C14.6 6.1 16 5 18 5c3.3 0 5.2 3.4 3.6 6.9C19.5 16.4 12 21 12 21z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 1l2.2 8.8L23 12l-8.8 2.2L12 23l-2.2-8.8L1 12l8.8-2.2z"/></svg>'
};
const floaterKeys = ['heart', 'star', 'sparkle'];
const floaterColors = ['#f8a5c2', '#ffd966', '#9fd6f0', '#e85d75'];
const floatersEl = document.getElementById('floaters');

for (let i = 0; i < 18; i++) {
  const el = document.createElement('span');
  el.className = 'floater';
  el.innerHTML = ICONS[floaterKeys[i % floaterKeys.length]];
  el.style.left = Math.random() * 100 + '%';
  el.style.width = 16 + Math.random() * 18 + 'px';
  el.style.fill = floaterColors[i % floaterColors.length];
  el.style.animationDuration = 8 + Math.random() * 10 + 's';
  el.style.animationDelay = -Math.random() * 15 + 's';
  floatersEl.appendChild(el);
}

// ===== CONFIG (edit these anytime) =====
const CONFIG = {
  recipientName: '',          // e.g. 'Maria'
  woodstock: [],              // numbers of your Woodstock images, e.g. [5, 9]
  snoopy: [1,2,3,4,6,7,8,10]  // numbers of your Snoopy images
};

// ===== STATE =====
const MAX_SIDE = 1600;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const photos = [null, null, null, null];   // each: canvas holding resized photo
let activeSlot = null;

const slotsEl = document.getElementById('slots');
const fileInput = document.getElementById('fileInput');
const errorEl = document.getElementById('uploadError');
const generateBtn = document.getElementById('generateBtn');
const previewEl = document.getElementById('previewStrip');

const SVG = {
  upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>'
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

// ===== RENDER =====
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
          <button class="icon-btn" data-act="replace" aria-label="Replace">${SVG.swap}</button>
          <button class="icon-btn" data-act="remove" aria-label="Remove">${SVG.trash}</button>
        </div>`);
    } else {
      slot.insertAdjacentHTML('beforeend', num + SVG.upload + '<span>Add photo</span>');
    }

    slot.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'remove') { photos[i] = null; update(); return; }
      activeSlot = i;
      fileInput.click();
    });
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); slot.click(); }
    });
    slotsEl.append(slot);
  });
}

function renderPreview() {
  previewEl.innerHTML = '';
  photos.forEach(canvas => {
    const frame = document.createElement('div');
    frame.className = 'pframe';
    if (canvas) {
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/jpeg', 0.6);
      frame.append(img);
    }
    previewEl.append(frame);
  });
}

function update() {
  renderSlots();
  renderPreview();
  generateBtn.disabled = photos.some(p => !p);
}

// ===== EVENTS =====
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';              // allows choosing the same file again
  if (!file || activeSlot === null) return;
  errorEl.textContent = '';
  try {
    photos[activeSlot] = await fileToCanvas(file);
    update();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('backBtn').addEventListener('click', () => showScreen('landing'));
update();