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

/* ─── State ─────────────────────────────── */
let H = 200, S = 70, V = 50;
let selectedBgImage = null;   // HTMLImageElement chosen as background
let capturedDataURL = null;
let isCaptured      = false;
let isCountingDown  = false;

let segmentation  = null;
let mpCamera      = null;
let countdownId   = null;

/* Secondary off-screen canvas — created once, reused every frame.
   This is key: OffscreenCanvas can silently fail on re-init in some
   browsers. A regular <canvas> not in the DOM is perfectly reliable. */
const offCanvas = document.createElement('canvas');
const offCtx    = offCanvas.getContext('2d');

/* ─── Toast ─────────────────────────────── */
let toastTimer = null;
function showToast(msg, ms = 2400) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
}

/* ─── Colour helpers ─────────────────────── */
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
  const COLS  = 35;
  const rows  = Math.ceil(window.innerHeight / (window.innerWidth / COLS));
  const frag  = document.createDocumentFragment();

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
   PANEL — preview + sliders
═══════════════════════════════════════════ */
function syncUI() {
  const hex = hslToHex(H, S, 50);
  swatch.style.background = `hsl(${H},${S}%,50%)`;
  colorName.textContent = colorLabel(H);
  colorHex.textContent  = hex.toUpperCase();

  hueVal.textContent = Math.round(H) + '°';
  satVal.textContent = Math.round(S) + '%';
  vibVal.textContent = Math.round(V) + '%';

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
let loadToken = 0;

function loadGallery() {
  const token = ++loadToken;
  gallery.innerHTML    = '';
  camGallery.innerHTML = '';
  selectedBgImage      = null;

  // Re-add the "None" chip
  camGallery.appendChild(noBgBtn);
  noBgBtn.classList.add('selected');

  const COUNT = 12;
  const seeds = Array.from({ length: COUNT }, () =>
    Math.floor(Math.random() * 9000) + 1000);

  // Skeletons
  for (let i = 0; i < COUNT; i++) {
    const sk  = skeletonEl(); gallery.appendChild(sk);
    const sk2 = skeletonEl(); camGallery.appendChild(sk2);
  }

  seeds.forEach((seed, i) => {
    const url = `https://picsum.photos/seed/${seed}/400/300`;

    loadImg(url, img => {
      if (token !== loadToken) return; // stale load
      replaceChild(gallery,    i,     makeThumb(img, 'main'));
      replaceChild(camGallery, i + 1, makeThumb(img, 'cam'));
    });
  });
}

function skeletonEl() {
  const d = document.createElement('div');
  d.className = 'img-skel';
  return d;
}

function loadImg(url, cb) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload  = () => cb(img);
  img.onerror = () => {};
  img.src = url;
}

function replaceChild(parent, idx, newEl) {
  const child = parent.children[idx];
  if (child) child.replaceWith(newEl);
}

function makeThumb(img, type) {
  const el = document.createElement('img');
  el.src = img.src;
  el.crossOrigin = 'anonymous';

  el.addEventListener('click', () => {
    // Deselect all
    document.querySelectorAll('#gallery img.selected, #camGallery img.selected')
      .forEach(x => x.classList.remove('selected'));
    noBgBtn.classList.remove('selected');
    el.classList.add('selected');
    selectedBgImage = el;
  });

  return el;
}

/* ═══════════════════════════════════════════
   OPEN CAMERA
═══════════════════════════════════════════ */
document.getElementById('captureMood').addEventListener('click', openCamera);

function openCamera() {
  // Show loading FIRST so the user sees the spinner, not a black flash
  overlay.classList.add('active');
  camLoading.classList.remove('hide');
  resetCamState();
  setTimeout(startCamera, 80);
}

function resetCamState() {
  // Kill any running stream first
  stopCamera();
  clearCountdown();
  isCaptured      = false;
  isCountingDown  = false;
  capturedDataURL = null;

  captureBtn.disabled    = false;
  captureBtn.textContent = 'Capture';
  retakeBtn.classList.remove('show');
  downloadBtn.classList.remove('show');
  timerDisp.classList.remove('show');

  // Clear canvas to transparent (loading screen covers it anyway)
  const ctx = canvas.getContext('2d');
  canvas.width  = 640;
  canvas.height = 480;
  ctx.clearRect(0, 0, 640, 480);
}

/* ═══════════════════════════════════════════
   START CAMERA + MEDIAPIPE
═══════════════════════════════════════════ */
function startCamera() {
  // Fully tear down any previous session
  stopCamera();

  segmentation = new SelfieSegmentation({
    locateFile: f =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`
  });
  segmentation.setOptions({ modelSelection: 1 });
  segmentation.onResults(onFrame);

  mpCamera = new Camera(video, {
    onFrame: async () => {
      if (isCaptured || !segmentation) return;
      try { await segmentation.send({ image: video }); }
      catch (_) {}
    },
    width: 640,
    height: 480,
  });

  mpCamera.start()
    .catch(err => {
      showToast('Camera access denied.');
      overlay.classList.remove('active');
      console.error(err);
    });
}

function stopCamera() {
  if (mpCamera)    { mpCamera.stop();       mpCamera    = null; }
  if (segmentation){ segmentation.reset();  segmentation = null; }
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
}

/* ═══════════════════════════════════════════
   PER-FRAME RENDER
   The correct compositing order:
     1. Draw selected background image (stretched to canvas)
     2. Isolate the person from the camera using the segmentation mask
        — do this on offCanvas so we can composite cleanly
     3. Composite person (mirrored) on top of background
     4. Apply colour tint overlay at low opacity
═══════════════════════════════════════════ */
function onFrame(results) {
  if (isCaptured) return;

  // Hide loading screen the moment the first real frame arrives
  if (!camLoading.classList.contains('hide')) {
    camLoading.classList.add('hide');
  }

  const W = results.image.width;
  const H_px = results.image.height;

  // Resize both canvases once if needed
  if (canvas.width !== W || canvas.height !== H_px) {
    canvas.width  = W;
    canvas.height = H_px;
  }
  if (offCanvas.width !== W || offCanvas.height !== H_px) {
    offCanvas.width  = W;
    offCanvas.height = H_px;
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H_px);

  /* ── Step 1: Background ── */
  if (selectedBgImage &&
      selectedBgImage.complete &&
      selectedBgImage.naturalWidth > 0) {
    ctx.drawImage(selectedBgImage, 0, 0, W, H_px);
  } else {
    // Solid colour fallback based on current mood hue
    ctx.fillStyle = `hsl(${H}, ${Math.min(S, 60)}%, 12%)`;
    ctx.fillRect(0, 0, W, H_px);
  }

  /* ── Step 2: Isolate person on offCanvas ── */
  offCtx.clearRect(0, 0, W, H_px);
  // Draw raw camera frame
  offCtx.drawImage(results.image, 0, 0, W, H_px);
  // Multiply alpha by mask — keeps only where mask is white (person)
  offCtx.globalCompositeOperation = 'destination-in';
  offCtx.drawImage(results.segmentationMask, 0, 0, W, H_px);
  offCtx.globalCompositeOperation = 'source-over'; // reset

  /* ── Step 3: Composite person mirrored onto main canvas ── */
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1); // horizontal mirror
  ctx.drawImage(offCanvas, 0, 0, W, H_px);
  ctx.restore();

  /* ── Step 4: Colour tint ── */
  const tintAlpha = (V / 100) * 0.3; // max 30%
  ctx.fillStyle = `hsla(${H}, ${S}%, 55%, ${tintAlpha})`;
  ctx.fillRect(0, 0, W, H_px);
}

/* ═══════════════════════════════════════════
   COUNTDOWN + CAPTURE
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
  if (countdownId) {
    clearInterval(countdownId);
    countdownId = null;
  }
  isCountingDown = false;
  timerDisp.classList.remove('show');
}

function freeze() {
  isCaptured = true;

  // Stop camera BEFORE taking the screenshot so segmentation
  // can't overwrite the canvas after toDataURL is called.
  stopCamera();

  capturedDataURL = canvas.toDataURL('image/png');

  // Redraw the frozen frame cleanly
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    // Show post-capture controls
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
  // Show loading immediately — before canvas is cleared — so user never sees black
  camLoading.classList.remove('hide');
  resetCamState();
  setTimeout(startCamera, 80);
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
   CLOSE CAMERA
═══════════════════════════════════════════ */
document.getElementById('closeCam').addEventListener('click', closeCamera);

function closeCamera() {
  clearCountdown();
  stopCamera();
  overlay.classList.remove('active');
  // Full reset so next open is clean
  isCaptured      = false;
  isCountingDown  = false;
  capturedDataURL = null;
  captureBtn.disabled = false;
  captureBtn.textContent = 'Capture';
  retakeBtn.classList.remove('show');
  downloadBtn.classList.remove('show');
  timerDisp.classList.remove('show');
}

/* ─── Background "None" chip ─────────────── */
noBgBtn.addEventListener('click', () => {
  document.querySelectorAll('#gallery img.selected, #camGallery img.selected')
    .forEach(x => x.classList.remove('selected'));
  noBgBtn.classList.add('selected');
  selectedBgImage = null;
});

/* ─── Escape key ─────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (overlay.classList.contains('active')) closeCamera();
  else panel.classList.remove('active');
});

/* ─── Init ───────────────────────────────── */
syncUI();
loadGallery();
