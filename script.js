/* ═══════════════════════════════════════════
   Chroma — script.js
   ═══════════════════════════════════════════ */

/* ── DOM refs ─────────────────────────────── */
const grid        = document.getElementById('grid');
const panel       = document.getElementById('panel');
const preview     = document.getElementById('preview');
const colorLabel  = document.getElementById('color-label');

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

const captureBtn  = document.getElementById('captureBtn');
const downloadBtn = document.getElementById('download');
const toast       = document.getElementById('toast');

/* ── State ────────────────────────────────── */
let currentH = 200, currentS = 70, currentV = 50;
let selectedImage = null;
let capturedDataURL = null;
let isCaptured = false;
let isTimerRunning = false;

let segmentation = null;
let mpCamera     = null;

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg, duration = 2200) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/* ══════════════════════════════════════════
   COLOUR HELPERS
══════════════════════════════════════════ */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)]
    .map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

function hueLabel(h) {
  const names = [
    [15,  'Red'], [45, 'Orange'], [65, 'Yellow'],
    [150, 'Green'], [195, 'Cyan'], [255, 'Blue'],
    [285, 'Indigo'], [345, 'Purple'], [360, 'Red']
  ];
  for (const [max, name] of names) if (h <= max) return name;
  return 'Red';
}

/* ══════════════════════════════════════════
   BUILD GRID
══════════════════════════════════════════ */
(function buildGrid() {
  const COLS = 35;
  const CELLS = COLS * Math.ceil(window.innerHeight / (window.innerWidth / COLS));
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < CELLS; i++) {
    const h = Math.random() * 360;
    const s = 35 + Math.random() * 65;
    const l = 25 + Math.random() * 50;

    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.style.background = `hsl(${h},${s}%,${l}%)`;

    cell.addEventListener('click', () => {
      currentH = h;
      currentS = s;
      currentV = 50;

      hueSlider.value = h;
      satSlider.value = s;
      vibSlider.value = 50;

      syncSliderDisplay();
      updatePreview();
      loadGalleryImages();
      panel.classList.add('active');
    });

    fragment.appendChild(cell);
  }
  grid.appendChild(fragment);
})();

/* ══════════════════════════════════════════
   PREVIEW + SLIDER VALUES
══════════════════════════════════════════ */
function updatePreview() {
  preview.style.background = `hsl(${currentH},${currentS}%,50%)`;
  const hex = hslToHex(currentH, currentS, 50);
  colorLabel.textContent = `${hueLabel(currentH)}  ${hex.toUpperCase()}`;
  colorLabel.style.color = '#888';

  // tint the range track to match current hue
  hueSlider.style.background =
    `linear-gradient(to right, hsl(0,80%,50%), hsl(60,80%,50%), hsl(120,80%,50%), hsl(180,80%,50%), hsl(240,80%,50%), hsl(300,80%,50%), hsl(360,80%,50%))`;
  satSlider.style.background =
    `linear-gradient(to right, hsl(${currentH},0%,50%), hsl(${currentH},100%,50%))`;
  vibSlider.style.background =
    `linear-gradient(to right, #eee, hsl(${currentH},${currentS}%,50%))`;
}

function syncSliderDisplay() {
  hueVal.textContent = Math.round(currentH) + '°';
  satVal.textContent = Math.round(currentS) + '%';
  vibVal.textContent = Math.round(currentV) + '%';
}

/* ── Slider events ─────────────────────── */
[hueSlider, satSlider, vibSlider].forEach(sl => {
  sl.addEventListener('input', () => {
    currentH = parseFloat(hueSlider.value);
    currentS = parseFloat(satSlider.value);
    currentV = parseFloat(vibSlider.value);
    syncSliderDisplay();
    updatePreview();
    // Debounce gallery reload
    clearTimeout(sl._t);
    sl._t = setTimeout(loadGalleryImages, 600);
  });
});

/* ── Back button ───────────────────────── */
document.getElementById('back').addEventListener('click', () => {
  panel.classList.remove('active');
});

/* ══════════════════════════════════════════
   GALLERY IMAGES (Picsum + color filter)
══════════════════════════════════════════ */
let galleryAbort = null;

function loadGalleryImages() {
  // Cancel any pending previous load
  if (galleryAbort) galleryAbort = true;
  const thisLoad = {};
  galleryAbort = thisLoad;

  gallery.innerHTML = '';
  camGallery.innerHTML = '';
  selectedImage = null;

  const COUNT = 12;
  const seeds = Array.from({ length: COUNT }, () => Math.floor(Math.random() * 1000));

  for (let i = 0; i < COUNT; i++) {
    // skeleton placeholders
    const sk  = document.createElement('div');
    sk.className = 'img-skeleton';
    sk.style.animationDelay = i * 0.05 + 's';
    gallery.appendChild(sk);

    const sk2 = document.createElement('div');
    sk2.className = 'img-skeleton';
    camGallery.appendChild(sk2);
  }

  let loaded = 0;

  seeds.forEach((seed, i) => {
    const url = `https://picsum.photos/seed/${seed}/400/300`;

    /* ── main gallery ── */
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (thisLoad !== galleryAbort && galleryAbort !== true) {
        // another load started — skip
      }
      const sk = gallery.children[i];
      if (sk && sk.classList.contains('img-skeleton')) {
        sk.replaceWith(createGalleryImg(img, url, 'main', i));
      }
      loaded++;
    };

    img.onerror = () => {
      const sk = gallery.children[i];
      if (sk) sk.remove();
    };

    img.src = url;

    /* ── cam gallery strip ── */
    const img2 = new Image();
    img2.crossOrigin = 'anonymous';

    img2.onload = () => {
      const sk = camGallery.children[i];
      if (sk && sk.classList.contains('img-skeleton')) {
        sk.replaceWith(createGalleryImg(img2, url, 'cam', i));
      }
    };

    img2.onerror = () => {
      const sk = camGallery.children[i];
      if (sk) sk.remove();
    };

    img2.src = url;
  });
}

function createGalleryImg(imgEl, url, type, idx) {
  const el = document.createElement('img');
  el.src = url;
  el.crossOrigin = 'anonymous';
  el.style.animationDelay = idx * 0.04 + 's';

  el.addEventListener('click', () => {
    // deselect previous
    document.querySelectorAll('#gallery img.selected, #camGallery img.selected')
      .forEach(x => x.classList.remove('selected'));
    el.classList.add('selected');
    selectedImage = el;
  });

  return el;
}

/* ══════════════════════════════════════════
   CAMERA / MEDIAPIPE
══════════════════════════════════════════ */
document.getElementById('captureMood').addEventListener('click', openCamera);

function openCamera() {
  // Reset state FIRST before anything starts
  isCaptured = false;
  capturedDataURL = null;
  isTimerRunning = false;
  captureBtn.disabled = false;
  captureBtn.textContent = 'Capture';
  downloadBtn.classList.remove('visible');
  timerDisp.classList.remove('visible');

  // Clear the canvas so old frozen frame doesn't show through
  const ctx = canvas.getContext('2d');
  canvas.width = 640;
  canvas.height = 480;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  overlay.classList.add('active');

  // Small delay so overlay is visible before camera permission prompt
  setTimeout(initSegmentation, 80);
}

function initSegmentation() {
  if (segmentation) {
    segmentation.reset();
    segmentation = null;
  }
  if (mpCamera) {
    mpCamera.stop();
    mpCamera = null;
  }

  segmentation = new SelfieSegmentation({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
  });

  segmentation.setOptions({ modelSelection: 1 });
  segmentation.onResults(onSegmentationResults);

  mpCamera = new Camera(video, {
    onFrame: async () => {
      if (!isCaptured && segmentation) {
        try {
          await segmentation.send({ image: video });
        } catch (e) {
          // stream may have ended
        }
      }
    },
    width: 640,
    height: 480,
  });

  mpCamera.start().catch(err => {
    showToast('Camera access denied.');
    overlay.classList.remove('active');
    console.error('Camera error:', err);
  });
}

/* ══════════════════════════════════════════
   SEGMENTATION RENDER LOOP
══════════════════════════════════════════ */
function onSegmentationResults(results) {
  if (isCaptured) return;

  const ctx = canvas.getContext('2d');
  canvas.width  = results.image.width;
  canvas.height = results.image.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw background image (or solid fill)
  if (selectedImage && selectedImage.complete && selectedImage.naturalWidth) {
    ctx.save();
    ctx.drawImage(selectedImage, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    ctx.fillStyle = `hsl(${currentH}, ${currentS}%, 15%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. Draw person using segmentation mask
  //    We need to: draw person pixels only where mask is white
  const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
  const offCtx = offscreen.getContext('2d');

  // Draw the camera frame
  offCtx.drawImage(results.image, 0, 0);
  // Use mask to cut out background (keep only person)
  offCtx.globalCompositeOperation = 'destination-in';
  offCtx.drawImage(results.segmentationMask, 0, 0);

  // Flip the person horizontally (mirror) before compositing
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(offscreen, 0, 0);
  ctx.restore();

  // 3. Colour/mood tint overlay
  const alpha = (currentV / 100) * 0.35; // max 35% opacity
  ctx.fillStyle = `hsla(${currentH}, ${currentS}%, 50%, ${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/* ══════════════════════════════════════════
   CAPTURE BUTTON
══════════════════════════════════════════ */
captureBtn.addEventListener('click', () => {
  if (isTimerRunning || isCaptured) return;
  startCountdown();
});

function startCountdown() {
  isTimerRunning = true;
  captureBtn.disabled = true;

  let count = 5;
  timerDisp.textContent = count;
  timerDisp.classList.add('visible');

  const tick = setInterval(() => {
    count--;
    if (count > 0) {
      timerDisp.textContent = count;
    } else {
      clearInterval(tick);
      timerDisp.classList.remove('visible');
      freezeCapture();
    }
  }, 1000);
}

function freezeCapture() {
  isCaptured = true;
  isTimerRunning = false;

  // Stop camera IMMEDIATELY so onSegmentationResults can't overwrite the canvas
  stopCamera();

  // Grab whatever is currently on the canvas
  capturedDataURL = canvas.toDataURL('image/png');

  // Redraw cleanly
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    downloadBtn.classList.add('visible');
    showToast('Photo captured! ↓ Download');
  };
  img.src = capturedDataURL;
}

function stopCamera() {
  if (mpCamera) { mpCamera.stop(); mpCamera = null; }
  if (segmentation) { segmentation.reset(); segmentation = null; }
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
}

/* ══════════════════════════════════════════
   DOWNLOAD
══════════════════════════════════════════ */
downloadBtn.addEventListener('click', () => {
  if (!capturedDataURL) return;
  const link = document.createElement('a');
  link.download = `chroma-${Date.now()}.png`;
  link.href = capturedDataURL;
  link.click();
});

/* ══════════════════════════════════════════
   CLOSE CAMERA
══════════════════════════════════════════ */
document.getElementById('closeCam').addEventListener('click', () => {
  stopCamera();
  overlay.classList.remove('active');
  isCaptured = false;
  isTimerRunning = false;
  timerDisp.classList.remove('visible');
  downloadBtn.classList.remove('visible');
  captureBtn.disabled = false;
  captureBtn.textContent = 'Capture';
});

/* ══════════════════════════════════════════
   ESCAPE KEY to close panel / overlay
══════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (overlay.classList.contains('active')) {
      document.getElementById('closeCam').click();
    } else if (panel.classList.contains('active')) {
      panel.classList.remove('active');
    }
  }
});

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
updatePreview();
syncSliderDisplay();
