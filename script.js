const grid = document.getElementById("grid");
const panel = document.getElementById("panel");

const preview = document.getElementById("preview");
const hexText = document.getElementById("hex");
const hslText = document.getElementById("hsl");

const hueSlider = document.getElementById("hue");
const satSlider = document.getElementById("sat");
const lightSlider = document.getElementById("light");

const description = document.getElementById("description");
const keywordsList = document.getElementById("keywords");
const gallery = document.getElementById("gallery");

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("capture");
const downloadLink = document.getElementById("download");

document.getElementById("closePanel").addEventListener("click", () => {
  panel.classList.remove("active");
});

let currentH = 0, currentS = 0, currentL = 0;

// HSL → HEX
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r=0,g=0,b=0;

  if (h<60) [r,g,b]=[c,x,0];
  else if (h<120) [r,g,b]=[x,c,0];
  else if (h<180) [r,g,b]=[0,c,x];
  else if (h<240) [r,g,b]=[0,x,c];
  else if (h<300) [r,g,b]=[x,0,c];
  else [r,g,b]=[c,0,x];

  r=Math.round((r+m)*255).toString(16).padStart(2,"0");
  g=Math.round((g+m)*255).toString(16).padStart(2,"0");
  b=Math.round((b+m)*255).toString(16).padStart(2,"0");

  return `#${r}${g}${b}`;
}

// HEX → HSL
function hexToHSL(hex) {
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
    h=Math.round(h*60); if(h<0)h+=360;
  }

  return {h,s:Math.round(s*100),l:Math.round(l*100)};
}

// Generate colors
let colors=[];
for(let h=0;h<360;h+=2){
  for(let s=50;s<=100;s+=10){
    for(let l=30;l<=70;l+=10){
      colors.push(hslToHex(h,s,l));
    }
  }
}
colors=[...new Set(colors)];
colors.sort(()=>Math.random()-0.5);

// Render grid
function renderColors(){
  colors.forEach(color=>{
    const div=document.createElement("div");
    div.className="color";
    div.style.background=color;

    div.addEventListener("click",()=>{
      let hsl=hexToHSL(color);

      currentH=hsl.h;
      currentS=hsl.s;
      currentL=hsl.l;

      hueSlider.value=currentH;
      satSlider.value=currentS;
      lightSlider.value=currentL;

      updateColor();
      panel.classList.add("active");

      generateMood();
    });

    grid.appendChild(div);
  });
}

// Update UI
function updateColor(){
  const hex=hslToHex(currentH,currentS,currentL);
  preview.style.background=hex;
  hexText.textContent="HEX: "+hex;
  hslText.textContent=`HSL: ${currentH}, ${currentS}%, ${currentL}%`;
}

// Mood
function generateMood(){
  let mood;

  if(currentS<30){
    mood={desc:"Minimal and calm.",words:["minimal","soft","neutral","clean","quiet"]};
  } else if(currentL>70){
    mood={desc:"Light and uplifting.",words:["light","fresh","airy","open","soft"]};
  } else if(currentL<30){
    mood={desc:"Dark and intense.",words:["dark","deep","bold","dramatic","strong"]};
  } else {
    mood={desc:"Vibrant and energetic.",words:["vibrant","bold","playful","lively","dynamic"]};
  }

  description.textContent=mood.desc;
  keywordsList.innerHTML="";
  mood.words.forEach(w=>{
    let li=document.createElement("li");
    li.textContent=w;
    keywordsList.appendChild(li);
  });

  loadImages();
}

// Images
function loadImages(){
  gallery.innerHTML="";
  for(let i=0;i<6;i++){
    let img=document.createElement("img");
    img.src=`https://source.unsplash.com/200x200/?aesthetic,color&sig=${Math.random()}`;
    gallery.appendChild(img);
  }
}

// Sliders
hueSlider.addEventListener("input",()=>{currentH=hueSlider.value;updateColor();});
satSlider.addEventListener("input",()=>{currentS=satSlider.value;updateColor();});
lightSlider.addEventListener("input",()=>{currentL=lightSlider.value;updateColor();});

// SAFE CAMERA (FIXED)
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(() => {
      console.log("Camera permission denied");
    });
}

// Capture
captureBtn.addEventListener("click",()=>{
  if(!video.videoWidth) return;

  const ctx=canvas.getContext("2d");
  canvas.width=video.videoWidth;
  canvas.height=video.videoHeight;

  ctx.drawImage(video,0,0);

  ctx.fillStyle=hslToHex(currentH,currentS,currentL);
  ctx.globalAlpha=0.3;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.globalAlpha=1;

  downloadLink.href=canvas.toDataURL();
});

// Init
renderColors();
