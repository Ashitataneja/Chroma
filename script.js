const grid = document.getElementById("grid");
const panel = document.getElementById("panel");
const preview = document.getElementById("preview");

const hue = document.getElementById("hue");
const sat = document.getElementById("sat");
const light = document.getElementById("light");

const gallery = document.getElementById("gallery");
const camGallery = document.getElementById("camGallery");

const overlay = document.getElementById("overlay");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const camHue = document.getElementById("camHue");

let currentH=200,currentS=70,currentL=50;
let selectedImage=null;

/* COLOR GRID (FIXED VARIETY) */
for(let h=0;h<360;h+=4){
  for(let s=40;s<=100;s+=30){
    for(let l=30;l<=70;l+=20){
      let color=`hsl(${h},${s}%,${l}%)`;

      let div=document.createElement("div");
      div.className="color";
      div.style.background=color;

      div.onclick=()=>{
        currentH=h;
        currentS=s;
        currentL=l;

        hue.value=h;
        camHue.value=h;

        update();
        panel.classList.add("active");

        loadImages();
      };

      grid.appendChild(div);
    }
  }
}

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

/* LOAD IMAGES (FIXED SOURCE) */
function loadImages(){
  gallery.innerHTML="";
  camGallery.innerHTML="";

  for(let i=0;i<12;i++){
    let imgUrl=`https://picsum.photos/200/200?random=${currentH+i}`;

    let img=document.createElement("img");
    img.src=imgUrl;
    img.onclick=()=>selectedImage=img;

    gallery.appendChild(img);

    let camImg=document.createElement("img");
    camImg.src=imgUrl;
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

/* DRAW LOOP */
function draw(){
  if(video.videoWidth){
    let ctx=canvas.getContext("2d");
    canvas.width=video.videoWidth;
    canvas.height=video.videoHeight;

    ctx.drawImage(video,0,0);

    /* BACKGROUND IMAGE */
    if(selectedImage){
      let img=new Image();
      img.src=selectedImage.src;
      ctx.globalAlpha=0.25;
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
    }

    /* COLOR FILTER */
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

/* CLOSE */
document.getElementById("closeCam").onclick=()=>{
  overlay.classList.remove("active");
};
