const grid = document.getElementById("grid");
const panel = document.getElementById("panel");
const preview = document.getElementById("preview");

const hue = document.getElementById("hue");
const camHue = document.getElementById("camHue");

const gallery = document.getElementById("gallery");
const camGallery = document.getElementById("camGallery");

const overlay = document.getElementById("overlay");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

let currentH = 200;
let selectedImage = null;

/* COLOR NAME MAPPING */
function getColorName(h){
  if(h<30) return "red aesthetic";
  if(h<90) return "yellow aesthetic";
  if(h<150) return "green aesthetic";
  if(h<210) return "blue aesthetic";
  if(h<270) return "purple aesthetic";
  return "pink aesthetic";
}

/* GRID */
for(let i=0;i<400;i++){
  let h = Math.random()*360;

  let div = document.createElement("div");
  div.className="color";
  div.style.background=`hsl(${h},70%,50%)`;

  div.onclick=()=>{
    currentH=h;
    hue.value=h;
    camHue.value=h;

    update();
    loadImages();

    panel.classList.add("active");
  };

  grid.appendChild(div);
}

/* UPDATE */
function update(){
  preview.style.background=`hsl(${currentH},70%,50%)`;
}

/* SLIDER */
hue.oninput=()=>{
  currentH=hue.value;
  camHue.value=currentH;
  update();
  loadImages();
};

camHue.oninput=()=>{
  currentH=camHue.value;
};

/* LOAD COLOR-BASED IMAGES */
function loadImages(){
  gallery.innerHTML="";
  camGallery.innerHTML="";

  let keyword = getColorName(currentH);

  for(let i=0;i<12;i++){
    let url=`https://source.unsplash.com/300x300/?${keyword}&sig=${Math.random()}`;

    let img=document.createElement("img");
    img.src=url;
    img.onclick=()=>selectedImage=img;

    gallery.appendChild(img);

    let camImg=document.createElement("img");
    camImg.src=url;
    camImg.onclick=()=>selectedImage=camImg;

    camGallery.appendChild(camImg);
  }
}

/* BACK */
document.getElementById("back").onclick=()=>{
  panel.classList.remove("active");
};

/* CAMERA */
document.getElementById("captureMood").onclick=()=>{
  overlay.classList.add("active");

  navigator.mediaDevices.getUserMedia({video:true})
  .then(stream=>video.srcObject=stream);
};

/* DRAW */
function draw(){
  if(video.videoWidth){
    let ctx=canvas.getContext("2d");

    canvas.width=video.videoWidth;
    canvas.height=video.videoHeight;

    ctx.drawImage(video,0,0);

    if(selectedImage){
      let img=new Image();
      img.src=selectedImage.src;

      ctx.globalAlpha=0.2;
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
    }

    ctx.fillStyle=`hsla(${currentH},80%,50%,0.25)`;
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  requestAnimationFrame(draw);
}
draw();

/* DOWNLOAD */
document.getElementById("download").onclick=()=>{
  let link=document.createElement("a");
  link.download="chroma.png";
  link.href=canvas.toDataURL();
  link.click();
};

document.getElementById("closeCam").onclick=()=>{
  overlay.classList.remove("active");
};
