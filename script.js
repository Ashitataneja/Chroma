const grid = document.getElementById("grid");
const panel = document.getElementById("panel");
const preview = document.getElementById("preview");

const hue = document.getElementById("hue");
const sat = document.getElementById("sat");
const vib = document.getElementById("vib");

const gallery = document.getElementById("gallery");
const camGallery = document.getElementById("camGallery");

const overlay = document.getElementById("overlay");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const captureBtn = document.getElementById("captureBtn");
const downloadBtn = document.getElementById("download");

let currentH = 200, currentS = 70, currentV = 50;
let selectedImage = null;
let capturedFrame = null;
let isCaptured = false;

/* ---------------- GRID ---------------- */
for (let i = 0; i < 700; i++) {
  let h = Math.random() * 360;
  let s = 40 + Math.random() * 60;
  let l = 30 + Math.random() * 40;

  let div = document.createElement("div");
  div.className = "color";
  div.style.background = `hsl(${h},${s}%,${l}%)`;

  div.onclick = () => {
    currentH = h;
    currentS = s;

    hue.value = h;
    sat.value = s;

    update();
    loadImages();
    panel.classList.add("active");
  };

  grid.appendChild(div);
}

/* ---------------- UPDATE ---------------- */
function update() {
  preview.style.background = `hsl(${currentH},${currentS}%,50%)`;
}

/* ---------------- SLIDERS ---------------- */
[hue, sat, vib].forEach(sl => {
  sl.oninput = () => {
    currentH = hue.value;
    currentS = sat.value;
    currentV = vib.value;

    update();
    loadImages();
  };
});

/* ---------------- LOAD IMAGES (FIXED) ---------------- */
function loadImages() {
  gallery.innerHTML = "";
  camGallery.innerHTML = "";

  for (let i = 0; i < 12; i++) {
    let url = `https://picsum.photos/400?random=${Math.random()}`;

    let img = document.createElement("img");
    img.src = url;
    img.crossOrigin = "anonymous";
    img.onclick = () => (selectedImage = img);

    gallery.appendChild(img);

    let camImg = document.createElement("img");
    camImg.src = url;
    camImg.crossOrigin = "anonymous";
    camImg.onclick = () => (selectedImage = camImg);

    camGallery.appendChild(camImg);
  }
}

/* ---------------- CAMERA ---------------- */
let segmentation;
let camera;

document.getElementById("captureMood").onclick = () => {
  overlay.classList.add("active");

  isCaptured = false;
  downloadBtn.style.opacity = "0.5";

  segmentation = new SelfieSegmentation({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
  });

  segmentation.setOptions({ modelSelection: 1 });
  segmentation.onResults(onResults);

  camera = new Camera(video, {
    onFrame: async () => {
      if (!isCaptured) {
        await segmentation.send({ image: video });
      }
    }
  });

  camera.start();
};

/* ---------------- RENDER ---------------- */
function onResults(results) {
  if (isCaptured) return;

  const ctx = canvas.getContext("2d");

  canvas.width = results.image.width;
  canvas.height = results.image.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // BACKGROUND
  if (selectedImage) {
    ctx.drawImage(selectedImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // PERSON CUTOUT
  ctx.save();
  ctx.drawImage(results.image, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(results.segmentationMask, 0, 0);
  ctx.restore();

  // COLOR TINT (helps match image to color)
  ctx.fillStyle = `hsla(${currentH}, ${currentS}%, 50%, ${currentV / 400})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/* ---------------- TIMER ---------------- */
function startTimer() {
  let count = 5;
  const ctx = canvas.getContext("2d");

  let interval = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = "100px sans-serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(count, canvas.width / 2, canvas.height / 2);

    count--;

    if (count < 0) {
      clearInterval(interval);
      captureFrame();
    }
  }, 1000);
}

/* ---------------- CAPTURE ---------------- */
function captureFrame() {
  isCaptured = true;

  capturedFrame = canvas.toDataURL("image/png");

  const ctx = canvas.getContext("2d");
  const img = new Image();

  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };

  img.src = capturedFrame;

  downloadBtn.style.opacity = "1";
}

/* ---------------- BUTTONS ---------------- */
captureBtn.onclick = () => {
  startTimer();
};

downloadBtn.onclick = () => {
  if (!capturedFrame) return;

  const link = document.createElement("a");
  link.download = "chroma.png";
  link.href = capturedFrame;
  link.click();
};

/* ---------------- CLOSE ---------------- */
document.getElementById("closeCam").onclick = () => {
  overlay.classList.remove("active");
};

document.getElementById("back").onclick = () => {
  panel.classList.remove("active");
};
