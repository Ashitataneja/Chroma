const grid = document.getElementById("grid");
const panel = document.getElementById("panel");
const preview = document.getElementById("preview");

const hue = document.getElementById("hue");
const sat = document.getElementById("sat");
const light = document.getElementById("light");

const camHue = document.getElementById("camHue");

const gallery = document.getElementById("gallery");

const overlay = document.getElementById("overlay");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const filters = document.getElementById("filters");

let currentH=0,currentS=0,currentL=0;
let selectedImage=null;

/* BETTER COLOR GENERATION */
let colors=[];
for(let h=0;h<360;h+=5){
  for(let s=40;s<=100;s+=20){
    for(let l=25;l<=75;l+=25){
      colors.push(`hsl(${h},${s}%,${l}%)`);
    }
  }
}
colors=[...new Set(colors)];

colors.forEach(c=>{
  let div=document.createElement("div");
  div.className="color";
  div.style.background=c;

  div.onclick=()=>{
    currentH=parseInt(c.match(/\d+/)[0]);
    hue.value=currentH;
    camHue.value=currentH;

    update();
    panel.classList.add("active");
    loadImages();
  };

  grid.appendChild(div);
});

/* UPDATE */
function update(){
  preview.style.background=`hsl(${currentH},${currentS}%,${currentL}%)`;
}

/* SLIDERS */
[hue].forEach(sl=>{
  sl.oninput=()=>{
    currentH=sl.value;
    camHue.value=currentH;
    update();
    loadImages();
  };
});

camHue.oninput=()=>{
  currentH=camHue.value;
};

/* IMAGES BASED ON COLOR */
function loadImages(){
  gallery.innerHTML="";
  for(let i=0;i<12;i++){
    let img=document.createElement("img");
    img.src=`https://source.unsplash.com/200x200/?color&sig=${currentH+i}`;
    img.onclick=()=>selectedImage=img;
    gallery.appendChild(img);
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

/* DRAW LOOP */
function draw(){
  if(video.videoWidth){
    let ctx=canvas.getContext("2d");
    canvas.width=video.videoWidth;
    canvas.height=video.videoHeight;

    ctx.drawImage(video,0,0);

    if(selectedImage){
      let img=new Image();
      img.src=selectedImage.src;
      ctx.globalAlpha=0.2; // subtle background
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
