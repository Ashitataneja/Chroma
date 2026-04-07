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

let currentH=200,currentS=70,currentV=50;
let selectedImage=null;

/* GRID */
for(let i=0;i<400;i++){
  let h=Math.random()*360;

  let div=document.createElement("div");
  div.className="color";
  div.style.background=`hsl(${h},70%,50%)`;

  div.onclick=()=>{
    currentH=h;
    hue.value=h;

    update();
    loadImages();

    panel.classList.add("active");
  };

  grid.appendChild(div);
}

/* UPDATE */
function update(){
  preview.style.background=`hsl(${currentH},${currentS}%,50%)`;
}

/* SLIDERS */
[hue,sat,vib].forEach(sl=>{
  sl.oninput=()=>{
    currentH=hue.value;
    currentS=sat.value;
    currentV=vib.value;

    update();
    loadImages();
  };
});

/* IMAGES */
function loadImages(){
  gallery.innerHTML="";
  camGallery.innerHTML="";

  for(let i=0;i<12;i++){
    let url=`https://picsum.photos/400?random=${Math.random()}`;

    let img=document.createElement("img");
    img.crossOrigin="anonymous";
    img.src=url;
    img.onclick=()=>selectedImage=img;

    gallery.appendChild(img);

    let camImg=document.createElement("img");
    camImg.crossOrigin="anonymous";
    camImg.src=url;
    camImg.onclick=()=>selectedImage=camImg;

    camGallery.appendChild(camImg);
  }
}

/* CAMERA + AI */
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

/* RENDER */
function onResults(results) {
  const ctx = canvas.getContext("2d");

  canvas.width = results.image.width;
  canvas.height = results.image.height;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  // BACKGROUND
  if(selectedImage){
    ctx.drawImage(selectedImage,0,0,canvas.width,canvas.height);
  }

  // PERSON MASK
  ctx.save();
  ctx.globalCompositeOperation="destination-over";
  ctx.drawImage(results.image,0,0);
  ctx.restore();

  ctx.globalCompositeOperation="destination-atop";
  ctx.drawImage(results.segmentationMask,0,0);

  ctx.globalCompositeOperation="source-over";

  // COLOR FILTER
  ctx.fillStyle=`hsla(${currentH},${currentS}%,50%,${currentV/400})`;
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

/* DOWNLOAD */
document.getElementById("download").onclick = () => {
  const link=document.createElement("a");
  link.download="chroma.png";
  link.href=canvas.toDataURL("image/png");
  link.click();
};

/* CLOSE */
document.getElementById("closeCam").onclick=()=>{
  overlay.classList.remove("active");
};

document.getElementById("back").onclick=()=>{
  panel.classList.remove("active");
};
