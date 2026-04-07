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
const downloadBtn = document.getElementById("downloadBtn");

let currentH = 200, currentS = 70, currentV = 50;
let selectedImage = null;
let lastCaptured = null;

/* ---------------- COLOR KEYWORDS ---------------- */
function getColorKeyword(h) {
  if (h < 30) return "red aesthetic minimal";
  if (h < 60) return "orange aesthetic warm";
  if (h < 90) return "yellow aesthetic soft";
  if (h < 150) return "green nature aesthetic";
  if (h < 210) return "blue aesthetic calm";
  if (h < 270) return "purple aesthetic dreamy";
  if (h < 330) return "pink aesthetic soft";
  return "red aesthetic bold";
}

/* ---------------- GRID ---------------- */
for (let i = 0; i < 600; i++) {
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

/* ---------------- FIXED IMAGE LOADING ---------------- */
function loadImages() {
  gallery.innerHTML = "";
  camGallery.innerHTML = "";

  let keyword = getColorKeyword(currentH);

  for (let i = 0; i < 12; i++) {
    let url = `https://images.unsplash.com/photo-1600000000000?auto=format&fit=crop&w=400&q=80&sig=${Math.random()}`;

    let img = document.createElement("img");
    img.src = url;
    img.onclick = () => (selectedImage = img);

    gallery.appendChild(img);

    let camImg = document.createElement("img");
    camImg.src = url;
    camImg.onclick = () => (selectedImage = camImg);

    camGallery.appendChild(camImg);
  }
}

/* ---------------- CAMERA + AI ---------------- */
let segmentation;
let camera;

document.getElementById("captureMood").onclick = () => {
  overlay.classList.add("active");

  segmentation = new SelfieSegmentation({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
  });

  segmentation.setOptions({ modelSelection: 1 });
  segmentation.onResults(onResults);

  camera = new Camera(video, {
    onFrame: async () => {
      await segmentation.send({ image: video });
    },
    width: 640,
    height: 480
  });

  camera.start();
};

/* ---------------- RENDER ---------------- */
function onResults(results) {
  const ctx = canvas.getContext("2d");

  canvas.width = results.image.width;
  canvas.height = results.image.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (selectedImage) {
    ctx.drawImage(selectedImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.save();
  ctx.drawImage(results.image, 0, 0);

  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(results.segmentationMask, 0, 0);
  ctx.restore();

  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = `hsla(${currentH}, ${currentS}%, 50%, ${currentV / 400})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/* ---------------- TIMER CAPTURE ---------------- */
captureBtn.onclick = () => {
  let count = 5;
  const ctx = canvas.getContext("2d");

  const interval = setInterval(() => {
    ctx.font = "60px sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText(count, canvas.width / 2 - 20, canvas.height / 2);

    count--;

    if (count < 0) {
      clearInterval(interval);
      lastCaptured = canvas.toDataURL("image/png");
    }
  }, 1000);
};

/* ---------------- DOWNLOAD ---------------- */
downloadBtn.onclick = () => {
  if (!lastCaptured) {
    alert("Capture first!");
    return;
  }

  const link = document.createElement("a");
  link.download = "chroma.png";
  link.href = lastCaptured;
  link.click();
};

/* CLOSE */
document.getElementById("closeCam").onclick = () => {
  overlay.classList.remove("active");
};

document.getElementById("back").onclick = () => {
  panel.classList.remove("active");
};
