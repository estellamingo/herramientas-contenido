const DaedalusExporter=(()=>{
function setStatus(text,isError=false){
  const el=document.getElementById("startupStatus");
  if(!el)return;
  el.textContent=text;
  el.classList.toggle("error",isError);
  el.classList.toggle("ready",!isError);
}

function isMobile(){
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent||"") ||
    (Number(navigator.maxTouchPoints||0)>1 && window.innerWidth<=1100);
}

function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}

function canvasToBlob(canvas){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(
      blob=>blob?resolve(blob):reject(new Error("No se pudo crear el archivo PNG.")),
      "image/png"
    );
  });
}

async function svgElementToImage(svgElement){
  const clone=svgElement.cloneNode(true);
  clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink");
  const source=new XMLSerializer().serializeToString(clone);
  const blob=new Blob([source],{type:"image/svg+xml;charset=utf-8"});
  const url=URL.createObjectURL(blob);

  try{
    return await new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error("No se pudo rasterizar la plantilla SVG."));
      image.src=url;
    });
  }finally{
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
}

function cssNumber(value,fallback=0){
  const parsed=parseFloat(value);
  return Number.isFinite(parsed)?parsed:fallback;
}

function drawBackgroundLayers(ctx,artboard,width,height){
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,width,height);

  const extension=document.getElementById("extensionLayer");
  if(extension){
    const style=getComputedStyle(extension);
    const top=cssNumber(style.top);
    const h=cssNumber(style.height);
    if(h>0){
      ctx.fillStyle=style.backgroundColor||"#ffffff";
      ctx.fillRect(0,top,width,h);
    }
  }

  const bar=document.getElementById("barExtension");
  if(bar && getComputedStyle(bar).display!=="none"){
    const style=getComputedStyle(bar);
    const x=cssNumber(style.left);
    const y=cssNumber(style.top);
    const w=cssNumber(style.width);
    const h=cssNumber(style.height);
    const radius=cssNumber(style.borderRadius);

    const gradient=ctx.createLinearGradient(0,y,0,y+h);
    gradient.addColorStop(0,"#0a0045");
    gradient.addColorStop(.45,"#5a80ff");
    gradient.addColorStop(1,"#8fd1e7");

    ctx.fillStyle=gradient;
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(x,y,w,h,radius);
    else ctx.rect(x,y,w,h);
    ctx.fill();
  }
}

function textNodes(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      return node.nodeValue && node.nodeValue.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  return nodes;
}

function wordRanges(node){
  const text=node.nodeValue||"";
  const regex=/\S+/g;
  const ranges=[];
  let match;
  while((match=regex.exec(text))){
    const range=document.createRange();
    range.setStart(node,match.index);
    range.setEnd(node,match.index+match[0].length);
    ranges.push({range,text:match[0]});
  }
  return ranges;
}

function drawDomText(ctx,artboard){
  const artRect=artboard.getBoundingClientRect();
  const layer=document.getElementById("textLayer");
  if(!layer)return;

  ctx.save();
  ctx.textBaseline="alphabetic";

  for(const node of textNodes(layer)){
    const parent=node.parentElement;
    if(!parent)continue;
    const style=getComputedStyle(parent);
    if(style.display==="none" || style.visibility==="hidden" || parseFloat(style.opacity)===0)continue;

    const fontSize=cssNumber(style.fontSize,16);
    const lineHeight=cssNumber(style.lineHeight,fontSize*1.2);
    const family=style.fontFamily||"Arial";
    const weight=style.fontWeight||"400";
    const fontStyle=style.fontStyle||"normal";
    ctx.font=`${fontStyle} ${weight} ${fontSize}px ${family}`;
    ctx.fillStyle=style.color||"#222";
    ctx.globalAlpha=cssNumber(style.opacity,1);

    for(const item of wordRanges(node)){
      const rects=[...item.range.getClientRects()];
      for(const rect of rects){
        if(rect.width<=0 || rect.height<=0)continue;
        const x=rect.left-artRect.left;
        const top=rect.top-artRect.top;
        const baseline=top+(lineHeight-fontSize)/2+fontSize*.82;
        ctx.fillText(item.text,x,baseline);
      }
    }
  }

  ctx.restore();
}

async function renderPNGBlob(template){
  await document.fonts.ready;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

  const artboard=document.getElementById("artboard");
  const templateSvg=document.querySelector("#templateLayer svg");
  if(!artboard || !templateSvg)throw new Error("No se encontró la composición del comunicado.");

  const width=Math.round(template.width||1080);
  const height=Math.ceil(cssNumber(getComputedStyle(artboard).height,artboard.scrollHeight));

  const canvas=document.createElement("canvas");
  canvas.width=width;
  canvas.height=height;
  const ctx=canvas.getContext("2d");

  drawBackgroundLayers(ctx,artboard,width,height);

  const templateImage=await svgElementToImage(templateSvg);
  const svgHeight=cssNumber(templateSvg.getAttribute("height"),templateSvg.viewBox?.baseVal?.height||357.52);
  ctx.drawImage(templateImage,0,0,width,svgHeight);

  // Volver a cubrir la extensión blanca y dibujar la barra dinámica.
  drawBackgroundLayers(ctx,artboard,width,height);

  // Redibujar la plantilla encima, solo en su área original.
  ctx.drawImage(templateImage,0,0,width,svgHeight);

  // El texto se dibuja directamente en canvas. No usa foreignObject,
  // por lo que el canvas permanece exportable.
  drawDomText(ctx,artboard);

  return await canvasToBlob(canvas);
}

async function shareOrDownload(blob,filename){
  const file=new File([blob],filename,{type:"image/png"});
  const canShare=isMobile() &&
    typeof navigator.share==="function" &&
    typeof navigator.canShare==="function" &&
    navigator.canShare({files:[file]});

  if(canShare){
    await navigator.share({files:[file],title:"Comunicado"});
    return "Imagen lista para guardar o compartir.";
  }

  downloadBlob(blob,filename);
  return "Imagen descargada correctamente.";
}

async function exportPNG(template,button){
  const oldText=button?.textContent||"Exportar PNG";
  if(button){
    button.disabled=true;
    button.textContent="Generando…";
  }
  setStatus("Generando imagen…");

  try{
    const blob=await renderPNGBlob(template);
    const message=await shareOrDownload(
      blob,
      `comunicado_${new Date().toISOString().slice(0,10)}.png`
    );
    setStatus(message);
  }catch(error){
    console.error("Error al exportar comunicado:",error);
    setStatus(`No se pudo generar la imagen: ${error.message||error}`,true);
    alert(`No se pudo generar la imagen.\n${error.message||error}`);
  }finally{
    if(button){
      button.disabled=false;
      button.textContent=oldText;
    }
  }
}

return{exportPNG};
})();