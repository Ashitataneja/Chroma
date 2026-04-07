const grid = document.getElementById("grid");
const panel = document.getElementById("panel");
const preview = document.getElementById("preview");

const hueSlider = document.getElementById("hue");
const camHue = document.getElementById("camHue");

const gallery = document.getElementById("gallery");
const camGallery = document.getElementById("camGallery");

const overlay = document.getElementById("overlay");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

let currentH = 200;
let selectedImage = null;

/* BETTER COLOR GRID */
for (let h = 0; h < 360; h += 2) {
  for (let l = 30; l <= 70; l += 20) {
    let color = `hsl(${h}, 70%, ${l}%)`;

    let div = document.createElement("div");
    div.className = "color";
    div.style.background = color;

    div.onclick = () => {
      currentH = h;
      hueSlider.value = h;
      camHue.value = h;

      update();
      loadImages();
      panel.classList.add("active");
    };

    grid.appendChild(div);
  }
}

/* COLOR UPDATE */
function update() {
  preview.style.background = `hsl(${currentH},70%,50%)`;
}

/* COLOR → KEYWORD */
function getColorKeyword(h) {
  if (h < 30) return "red";
  if (h < 60) return "orange";
  if (h < 90) return "yellow";
  if (h < 150) return "green";
  if (h < 210) return "blue";
  if (h < 270) return "purple";
  return "pink";
}

/* LOAD IMAGES BASED ON COLOR */
function loadImages() {
  gallery.innerHTML = "";
  camGallery.innerHTML = "";

  let keyword = getColorKeyword(currentH);

  for (let i = 0; i < 12; i++) {
    let url = `https://source.unsplash.com/200x200/?${keyword},aesthetic&sig=${i + currentH}`;

    let img = document.createElement("img");
    img.src = url;
    img.onclick = () => selectedImage = img;

    gallery.appendChild(img);

    let camImg = document.createElement("img");
    camImg.src = url;
    camImg.onclick = () => selectedImage = camImg;

    camGallery.appendChild(camImg);
  }
}

/* SLIDERS */
hueSlider.oninput = () => {
  currentH = hueSlider.value;
  camHue.value = currentH;
  update();
  loadImages();
};

camHue.oninput = () => {
  currentH = camHue.value;
};

/* CAMERA */
document.getElementById("captureMood").onclick = () => {
  overlay.classList.add("active");

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => video.srcObject = stream);
};

/* DRAW LOOP */
function draw() {
  if (video.videoWidth) {
    let ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    if (selectedImage) {
      let img = new Image();
      img.src = selectedImage.src;
      ctx.globalAlpha = 0.2;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = `hsla(${currentH},70%,50%,0.2)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  requestAnimationFrame(draw);
}
draw();

/* DOWNLOAD */
document.getElementById("download").onclick = () => {
  let link = document.createElement("a");
  link.download = "chroma.png";
  link.href = canvas.toDataURL();
  link.click();
};
