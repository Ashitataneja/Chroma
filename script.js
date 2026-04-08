/* ═══════════════════════════════════════════
   Chroma  ·  script.js
   ═══════════════════════════════════════════ */

/* ─── DOM ───────────────────────────────── */
const grid        = document.getElementById('grid');
const panel       = document.getElementById('panel');
const swatch      = document.getElementById('swatch');
const colorName   = document.getElementById('color-name');
const colorHex    = document.getElementById('color-hex');

const hueSlider   = document.getElementById('hue');
const satSlider   = document.getElementById('sat');
const vibSlider   = document.getElementById('vib');
const hueVal      = document.getElementById('hueVal');
const satVal      = document.getElementById('satVal');
const vibVal      = document.getElementById('vibVal');

const gallery     = document.getElementById('gallery');
const camGallery  = document.getElementById('camGallery');

const overlay     = document.getElementById('overlay');
const video       = document.getElementById('video');
const canvas      = document.getElementById('canvas');
const timerDisp   = document.getElementById('timer-display');
const camLoading  = document.getElementById('cam-loading');

const captureBtn  = document.getElementById('captureBtn');
const retakeBtn   = document.getElementById('retakeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const noBgBtn     = document.getElementById('noBgBtn');
const toast       = document.getElementById('toast');

/* ─── Colour state ──────────────────────── */
let H = 200, S = 70, V = 50;

/* ─── Gallery state ─────────────────────── */
let selectedBgImage = null;
let loadToken = 0;

/* ─── Capture state ─────────────────────── */
let capturedDataURL = null;
let isCaptured      = false;
let isCountingDown  = false;
let countdownId     = null;

/* ─── Off-screen canvas (created once, reused every frame) ─ */
const offCanvas = document.createElement('canvas');
const offCtx    = offCanvas.getContext('2d');

/* ─── MediaPipe — created ONCE, never destroyed ─────────────
   Calling segmentation.reset() corrupts the internal WASM state
   so the instance can never send frames again. We keep one
   instance alive for the whole page lifetime and only
   stop/restart the camera stream between sessions.             */
let segmentation = null;
let mpCamera     = null;
let camReady     = false; // true after first frame arrives

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, ms = 2400) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
}

/* ═══════════════════════════════════════════
   COLOUR HELPERS
═══════════════════════════════════════════ */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)]
    .map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

function colorLabel(h) {
  if (h <  15) return 'Red';
  if (h <  45) return 'Orange';
  if (h <  65) return 'Yellow';
  if (h < 150) return 'Green';
  if (h < 195) return 'Cyan';
  if (h < 255) return 'Blue';
  if (h < 285) return 'Indigo';
  if (h < 345) return 'Violet';
  return 'Red';
}

/* ═══════════════════════════════════════════
   GRID
═══════════════════════════════════════════ */
(function buildGrid() {
  const COLS = 35;
  const rows = Math.ceil(window.innerHeight / (window.innerWidth / COLS));
  const frag = document.createDocumentFragment();

  for (let i = 0; i < COLS * rows; i++) {
    const h = Math.random() * 360;
    const s = 35 + Math.random() * 65;
    const l = 25 + Math.random() * 50;

    const el = document.createElement('div');
    el.className = 'cell';
    el.style.background = `hsl(${h},${s}%,${l}%)`;

    el.addEventListener('click', () => {
      H = h; S = s; V = 50;
      hueSlider.value = h;
      satSlider.value = s;
      vibSlider.value = 50;
      syncUI();
      loadGallery();
      panel.classList.add('active');
    });

    frag.appendChild(el);
  }
  grid.appendChild(frag);
})();

/* ═══════════════════════════════════════════
   PANEL UI
═══════════════════════════════════════════ */
function syncUI() {
  const hex = hslToHex(H, S, 50);
  swatch.style.background = `hsl(${H},${S}%,50%)`;
  colorName.textContent   = colorLabel(H);
  colorHex.textContent    = hex.toUpperCase();
  hueVal.textContent      = Math.round(H) + '°';
  satVal.textContent      = Math.round(S) + '%';
  vibVal.textContent      = Math.round(V) + '%';

  hueSlider.style.background =
    'linear-gradient(to right,hsl(0,80%,50%),hsl(60,80%,50%),hsl(120,80%,50%),hsl(180,80%,50%),hsl(240,80%,50%),hsl(300,80%,50%),hsl(360,80%,50%))';
  satSlider.style.background =
    `linear-gradient(to right,hsl(${H},0%,50%),hsl(${H},100%,50%))`;
  vibSlider.style.background =
    `linear-gradient(to right,#e8e8e8,hsl(${H},${S}%,50%))`;
}

[hueSlider, satSlider, vibSlider].forEach(sl => {
  sl.addEventListener('input', () => {
    H = +hueSlider.value;
    S = +satSlider.value;
    V = +vibSlider.value;
    syncUI();
    clearTimeout(sl._t);
    sl._t = setTimeout(loadGallery, 700);
  });
});

document.getElementById('back').addEventListener('click', () =>
  panel.classList.remove('active'));

/* ═══════════════════════════════════════════
   GALLERY
═══════════════════════════════════════════ */
function loadGallery() {
  const token = ++loadToken;
  gallery.innerHTML    = '';
  camGallery.innerHTML = '';
  selectedBgImage      = null;

  camGallery.appendChild(noBgBtn);
  noBgBtn.classList.add('selected');

  const COUNT = 12;
  const seeds = Array.from({ length: COUNT }, () =>
    Math.floor(Math.random() * 9000) + 1000);

  for (let i = 0; i < COUNT; i++) {
    gallery.appendChild(skelEl());
    camGallery.appendChild(skelEl());
  }

  seeds.forEach((seed, i) => {
    const url = `https://picsum.photos/seed/${seed}/400/300`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (token !== loadToken) return;
      swap(gallery,    i,     thumb(img));
      swap(camGallery, i + 1, thumb(img));
    };
    img.src = url;
  });
}

function skelEl() {
  const d = document.createElement('div');
  d.className = 'img-skel';
  return d;
}

function swap(parent, idx, el) {
  const child = parent.children[idx];
  if (child) child.replaceWith(el);
}

function thumb(img) {
  const el = document.createElement('img');
  el.src = img.src;
  el.crossOrigin = 'anonymous';
  el.addEventListener('click', () => {
    document.querySelectorAll('#gallery img.selected, #camGallery img.selected')
      .forEach(x => x.classList.remove('selected'));
    noBgBtn.classList.remove('selected');
    el.classList.add('selected');
    selectedBgImage = el;
  });
  return el;
}

noBgBtn.addEventListener('click', () => {
  document.querySelectorAll('#gallery img.selected, #camGallery img.selected')
    .forEach(x => x.classList.remove('selected'));
  noBgBtn.classList.add('selected');
  selectedBgImage = null;
});

/* ═══════════════════════════════════════════
   MEDIAPIPE — init ONCE on page load
   We never call segmentation.reset() or
   re-create the instance. Only the camera
   stream is stopped and restarted.
═══════════════════════════════════════════ */
function initSegmentation() {
  segmentation = new SelfieSegmentation({
    locateFile: f =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`
  });
  segmentation.setOptions({ modelSelection: 1 });
  segmentation.onResults(onFrame);
}

/* ─── Start only the camera stream ─────── */
function startStream() {
  // Stop any existing stream first (does NOT touch segmentation)
  stopStream();

  isCaptured     = false;
  isCountingDown = false;
  camReady       = false;

  mpCamera = new Camera(video, {
    onFrame: async () => {
      if (isCaptured || !segmentation) return;
      try {
        await segmentation.send({ image: video });
      } catch (_) {}
    },
    width: 640,
    height: 480,
  });

  mpCamera.start().catch(err => {
    showToast('Camera access denied.');
    overlay.classList.remove('active');
    console.error(err);
  });
}

/* ─── Stop only the camera stream ──────── */
function stopStream() {
  if (mpCamera) {
    mpCamera.stop();
    mpCamera = null;
  }
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
}

/* ═══════════════════════════════════════════
   PER-FRAME RENDER
═══════════════════════════════════════════ */
function onFrame(results) {
  // If captured, do nothing — canvas holds the frozen photo
  if (isCaptured) return;

  // Hide loading spinner on very first rendered frame
  if (!camReady) {
    camReady = true;
    camLoading.classList.add('hide');
  }

  const W  = results.image.width;
  const Hh = results.image.height;

  if (canvas.width  !== W)  canvas.width  = W;
  if (canvas.height !== Hh) canvas.height = Hh;
  if (offCanvas.width  !== W)  offCanvas.width  = W;
  if (offCanvas.height !== Hh) offCanvas.height = Hh;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, Hh);

  /* 1 — Background */
  if (selectedBgImage?.complete && selectedBgImage.naturalWidth > 0) {
    ctx.drawImage(selectedBgImage, 0, 0, W, Hh);
  } else {
    ctx.fillStyle = `hsl(${H},${Math.min(S, 55)}%,11%)`;
    ctx.fillRect(0, 0, W, Hh);
  }

  /* 2 — Isolate person on offCanvas */
  offCtx.clearRect(0, 0, W, Hh);
  offCtx.drawImage(results.image, 0, 0, W, Hh);
  offCtx.globalCompositeOperation = 'destination-in';
  offCtx.drawImage(results.segmentationMask, 0, 0, W, Hh);
  offCtx.globalCompositeOperation = 'source-over';

  /* 3 — Composite person (mirrored) onto main canvas */
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(offCanvas, 0, 0, W, Hh);
  ctx.restore();

  /* 4 — Mood colour tint */
  ctx.fillStyle = `hsla(${H},${S}%,55%,${(V / 100) * 0.28})`;
  ctx.fillRect(0, 0, W, Hh);
}

/* ═══════════════════════════════════════════
   OPEN / CLOSE CAMERA
═══════════════════════════════════════════ */
document.getElementById('captureMood').addEventListener('click', openCamera);

function openCamera() {
  overlay.classList.add('active');
  showLoadingAndStart();
}

function showLoadingAndStart() {
  // Reset UI state
  isCaptured     = false;
  isCountingDown = false;
  capturedDataURL = null;
  captureBtn.disabled    = false;
  captureBtn.textContent = 'Capture';
  retakeBtn.classList.remove('show');
  downloadBtn.classList.remove('show');
  clearCountdown();

  // Clear canvas, show spinner
  const ctx = canvas.getContext('2d');
  canvas.width = 640; canvas.height = 480;
  ctx.clearRect(0, 0, 640, 480);
  camLoading.classList.remove('hide');

  // Start stream (segmentation instance stays alive)
  startStream();
}

document.getElementById('closeCam').addEventListener('click', closeCamera);

function closeCamera() {
  clearCountdown();
  stopStream();
  overlay.classList.remove('active');
  isCaptured      = false;
  isCountingDown  = false;
  capturedDataURL = null;
  captureBtn.disabled    = false;
  captureBtn.textContent = 'Capture';
  retakeBtn.classList.remove('show');
  downloadBtn.classList.remove('show');
  timerDisp.classList.remove('show');
}

/* ═══════════════════════════════════════════
   COUNTDOWN + FREEZE
═══════════════════════════════════════════ */
captureBtn.addEventListener('click', () => {
  if (isCountingDown || isCaptured) return;
  startCountdown();
});

function startCountdown() {
  isCountingDown = true;
  captureBtn.disabled = true;
  let count = 5;
  timerDisp.textContent = count;
  timerDisp.classList.add('show');

  countdownId = setInterval(() => {
    count--;
    if (count > 0) {
      timerDisp.textContent = count;
    } else {
      clearCountdown();
      freeze();
    }
  }, 1000);
}

function clearCountdown() {
  if (countdownId) { clearInterval(countdownId); countdownId = null; }
  isCountingDown = false;
  timerDisp.classList.remove('show');
}

function freeze() {
  isCaptured = true;

  // Stop the stream so no more frames overwrite the canvas
  stopStream();

  capturedDataURL = canvas.toDataURL('image/png');

  // Redraw frozen frame cleanly
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    retakeBtn.classList.add('show');
    downloadBtn.classList.add('show');
    showToast('Captured — save or retake');
  };
  img.src = capturedDataURL;
}

/* ═══════════════════════════════════════════
   RETAKE
═══════════════════════════════════════════ */
retakeBtn.addEventListener('click', () => {
  showLoadingAndStart();
});

/* ═══════════════════════════════════════════
   DOWNLOAD
═══════════════════════════════════════════ */
downloadBtn.addEventListener('click', () => {
  if (!capturedDataURL) return;
  const a = document.createElement('a');
  a.download = `chroma-${Date.now()}.png`;
  a.href = capturedDataURL;
  a.click();
});

/* ═══════════════════════════════════════════
   ESCAPE KEY
═══════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (overlay.classList.contains('active')) closeCamera();
  else panel.classList.remove('active');
});

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
syncUI();
loadGallery();
initSegmentation(); // create the one instance, keep it forever
