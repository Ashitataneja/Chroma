const grid = document.getElementById("grid");
const panel = document.getElementById("panel");
const preview = document.getElementById("preview");

const hue = document.getElementById("hue");
const sat = document.getElementById("sat");
const light = document.getElementById("light");

const cameraView = document.getElementById("cameraView");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const gallery = document.getElementById("gallery");

let selectedImage = null;
let currentH = 0, currentS = 0, currentL = 0;

/* COLOR SYSTEM */
function hslToHex(h, s, l) {
  s/=100; l/=100;
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
    }
  }
}
colors=[...new Set(colors)];

colors.forEach(c=>{
  let div=document.createElement("div");
  div.className="color";
  div.style.background=c;

  div.onclick=()=>{
    let hsl = hexToHSL(c);
    currentH=hsl.h;
    currentS=hsl.s;
    currentL=hsl.l;

    hue.value=currentH;
    sat.value=currentS;
    light.value=currentL;

    update();
    panel.classList.add("active");
  };

  grid.appendChild(div);
});

/* HEX → HSL */
function hexToHSL(hex){
  let r=parseInt(hex.slice(1,3),16)/255;
  let g=parseInt(hex.slice(3,5),16)/255;
  let b=parseInt(hex.slice(5,7),16)/255;

  let max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;

  if(max===min){h=s=0;}
  else{
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
  let hex = hslToHex(currentH,currentS,currentL);
  preview.style.background=hex;
}

/* SLIDERS */
[hue,sat,light].forEach(sl=>{
  sl.oninput=()=>{
    currentH=hue.value;
    currentS=sat.value;
    currentL=light.value;
    update();
  };
});

/* CLOSE PANEL */
document.getElementById("close").onclick=()=>{
  panel.classList.remove("active");
};

/* CAPTURE MOOD */
document.getElementById("captureMood").onclick=()=>{
  cameraView.classList.add("active");
  loadImages();
  startCamera();
};

/* CAMERA */
function startCamera(){
  navigator.mediaDevices.getUserMedia({video:true})
  .then(stream=>video.srcObject=stream)
  .catch(()=>alert("Allow camera"));
}

/* LOAD IMAGES (FIXED SOURCE) */
function loadImages(){
  gallery.innerHTML="";
  const keywords=["aesthetic","minimal","fashion","nature","design"];

  keywords.forEach((k,i)=>{
    let img=document.createElement("img");
    img.src=`https://picsum.photos/seed/${k+i}/200`;
    img.onclick=()=>{
      document.querySelectorAll("#gallery img").forEach(i=>i.classList.remove("active"));
      img.classList.add("active");
      selectedImage=img;
    };
    gallery.appendChild(img);
  });
}

/* CAPTURE */
document.getElementById("capture").onclick=()=>{
  const ctx=canvas.getContext("2d");

  canvas.width=video.videoWidth;
  canvas.height=video.videoHeight;

  ctx.drawImage(video,0,0);

  if(selectedImage){
    let img=new Image();
    img.src=selectedImage.src;
    img.onload=()=>{
      ctx.globalAlpha=0.4;
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      applyColor(ctx);
    };
  } else {
    applyColor(ctx);
  }
};

function applyColor(ctx){
  ctx.fillStyle=hslToHex(currentH,currentS,currentL);
  ctx.globalAlpha=0.3;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.globalAlpha=1;
}

/* DOWNLOAD */
document.getElementById("download").onclick=()=>{
  const link=document.createElement("a");
  link.download="chroma.png";
  link.href=canvas.toDataURL();
  link.click();
};

/* CLOSE CAMERA */
document.getElementById("closeCam").onclick=()=>{
  cameraView.classList.remove("active");
};
