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

/* COLOR NAME */
function getColorName(h){
if(h<30) return "red";
if(h<90) return "yellow";
if(h<150) return "green";
if(h<210) return "blue";
if(h<270) return "purple";
return "pink";
}

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

let keyword=getColorName(currentH)+" aesthetic";

for(let i=0;i<12;i++){
let url=`https://picsum.photos/400?random=${Math.random()}`;

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

/* BACKGROUND IMAGE (FULL) */
if(selectedImage){
let bg=new Image();
bg.src=selectedImage.src;
ctx.globalAlpha=1;
ctx.drawImage(bg,0,0,canvas.width,canvas.height);
}

/* CAMERA ON TOP */
ctx.globalAlpha=0.9;
ctx.drawImage(video,0,0);

/* COLOR FILTER */
ctx.fillStyle=`hsla(${currentH},${currentS}%,50%,${currentV/400})`;
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

/* CLOSE */
document.getElementById("closeCam").onclick=()=>{
overlay.classList.remove("active");
};

document.getElementById("back").onclick=()=>{
panel.classList.remove("active");
};
