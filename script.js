const grid = document.getElementById("grid");
const panel = document.getElementById("panel");
const preview = document.getElementById("preview");

const hue = document.getElementById("hue");
const sat = document.getElementById("sat");
const light = document.getElementById("light");

const gallery = document.getElementById("gallery");

const overlay = document.getElementById("overlay");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const filters = document.getElementById("filters");

let currentH=0,currentS=0,currentL=0;
let selectedImage=null;

/* COLOR */
function hslToHex(h,s,l){
s/=100;l/=100;
let c=(1-Math.abs(2*l-1))*s;
let x=c*(1-Math.abs((h/60)%2-1));
let m=l-c/2;
let r=0,g=0,b=0;

if(h<60)[r,g,b]=[c,x,0];
else if(h<120)[r,g,b]=[x,c,0];
else if(h<180)[r,g,b]=[0,c,x];
else if(h<240)[r,g,b]=[0,x,c];
else if(h<300)[r,g,b]=[x,0,c];
else[r,g,b]=[c,0,x];

r=Math.round((r+m)*255).toString(16).padStart(2,"0");
g=Math.round((g+m)*255).toString(16).padStart(2,"0");
b=Math.round((b+m)*255).toString(16).padStart(2,"0");

return `#${r}${g}${b}`;
}

/* GRID */
let colors=[];
for(let h=0;h<360;h+=2){
for(let s=50;s<=100;s+=10){
for(let l=30;l<=70;l+=10){
colors.push(hslToHex(h,s,l));
}}}
colors=[...new Set(colors)];

colors.forEach(c=>{
let div=document.createElement("div");
div.className="color";
div.style.background=c;

div.onclick=()=>{
let hsl=hexToHSL(c);
currentH=hsl.h;
currentS=hsl.s;
currentL=hsl.l;

hue.value=currentH;
sat.value=currentS;
light.value=currentL;

update();
panel.classList.add("active");

loadImages();
};
grid.appendChild(div);
});

/* HEX → HSL */
function hexToHSL(hex){
let r=parseInt(hex.slice(1,3),16)/255;
let g=parseInt(hex.slice(3,5),16)/255;
let b=parseInt(hex.slice(5,7),16)/255;

let max=Math.max(r,g,b),min=Math.min(r,g,b);
let h,s,l=(max+min)/2;

if(max!==min){
let d=max-min;
s=l>0.5?d/(2-max-min):d/(max+min);
switch(max){
case r:h=(g-b)/d%6;break;
case g:h=(b-r)/d+2;break;
case b:h=(r-g)/d+4;break;
}
h=Math.round(h*60);
}
return {h,s:Math.round(s*100),l:Math.round(l*100)};
}

/* UPDATE */
function update(){
preview.style.background=hslToHex(currentH,currentS,currentL);
createFilterCircles();
}

/* SLIDERS */
[hue,sat,light].forEach(sl=>{
sl.oninput=()=>{
currentH=hue.value;
currentS=sat.value;
currentL=light.value;
update();
loadImages();
};
});

/* LOAD 12 IMAGES */
function loadImages(){
gallery.innerHTML="";
for(let i=0;i<12;i++){
let img=document.createElement("img");
img.src=`https://picsum.photos/200?random=${Math.random()}`;
img.onclick=()=>selectedImage=img;
gallery.appendChild(img);
}
}

/* FILTER CIRCLES */
function createFilterCircles(){
filters.innerHTML="";

for(let i=0;i<6;i++){
let circle=document.createElement("div");
circle.className="filterCircle";
circle.style.background=hslToHex(currentH+i*10,currentS,currentL);
circle.onclick=()=>currentH+=i*10;
filters.appendChild(circle);
}

for(let i=0;i<6;i++){
let img=document.createElement("img");
img.className="filterImg";
img.src=`https://picsum.photos/50?random=${Math.random()}`;
img.onclick=()=>selectedImage=img;
filters.appendChild(img);
}
}

/* CAMERA */
document.getElementById("captureMood").onclick=()=>{
overlay.classList.add("active");
navigator.mediaDevices.getUserMedia({video:true})
.then(stream=>video.srcObject=stream);
};

/* LIVE RENDER */
function draw(){
if(video.videoWidth){
let ctx=canvas.getContext("2d");
canvas.width=video.videoWidth;
canvas.height=video.videoHeight;

ctx.drawImage(video,0,0);

if(selectedImage){
let img=new Image();
img.src=selectedImage.src;
ctx.globalAlpha=0.3;
ctx.drawImage(img,0,0,canvas.width,canvas.height);
}

ctx.fillStyle=hslToHex(currentH,currentS,currentL);
ctx.globalAlpha=0.3;
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
