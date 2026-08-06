const DaedalusExporter=(()=>{
const FONT_FILES=[
  {family:"Raleway",weight:400,url:"./assets/fonts/Raleway-Regular.otf"},
  {family:"Raleway",weight:800,url:"./assets/fonts/Raleway-ExtraBold.otf"},
  {family:"Raleway",weight:900,url:"./assets/fonts/Raleway-Black.otf"},
  {family:"Montserrat",weight:400,url:"./assets/fonts/Montserrat-Regular.otf"},
  {family:"Montserrat",weight:700,url:"./assets/fonts/Montserrat-Bold.otf"},
  {family:"Montserrat",weight:800,url:"./assets/fonts/Montserrat-ExtraBold.otf"}
];
let embeddedFontCssPromise=null;

function setStatus(text,isError=false){
  const el=document.getElementById("startupStatus");
  if(!el)return;
  el.textContent=text;
  el.classList.toggle("error",isError);
  if(!isError)el.classList.add("ready");
}
function isMobile(){
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent||"") ||
    (Number(navigator.maxTouchPoints||0)>1 && window.innerWidth<=1100);
}
function blobToDataURL(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=reject;
    reader.readAsDataURL(blob);
  });
}
async function getEmbeddedFontCss(){
  if(embeddedFontCssPromise)return embeddedFontCssPromise;
  embeddedFontCssPromise=(async()=>{
    const rules=[];
    for(const font of FONT_FILES){
      const response=await fetch(font.url);
      if(!response.ok)throw new Error(`No se pudo cargar la fuente ${font.url}`);
      const dataUrl=await blobToDataURL(await response.blob());
      rules.push(`@font-face{font-family:'${font.family}';src:url('${dataUrl}') format('opentype');font-style:normal;font-weight:${font.weight};}`);
    }
    return rules.join("\n");
  })();
  return embeddedFontCssPromise;
}
function copyComputedStyles(source,target){
  if(source.nodeType!==Node.ELEMENT_NODE || target.nodeType!==Node.ELEMENT_NODE)return;
  const computed=getComputedStyle(source);
  let cssText="";
  for(const property of computed){
    cssText+=`${property}:${computed.getPropertyValue(property)};`;
  }
  target.setAttribute("style",cssText);
  const sourceChildren=[...source.children];
  const targetChildren=[...target.children];
  for(let i=0;i<sourceChildren.length;i++){
    if(targetChildren[i])copyComputedStyles(sourceChildren[i],targetChildren[i]);
  }
}
async function inlineImageSources(root){
  const images=[...root.querySelectorAll("img")];
  await Promise.all(images.map(async img=>{
    const src=img.getAttribute("src");
    if(!src || src.startsWith("data:"))return;
    const response=await fetch(src);
    if(!response.ok)throw new Error(`No se pudo cargar una imagen: ${src}`);
    img.setAttribute("src",await blobToDataURL(await response.blob()));
  }));
}
async function renderPNGBlob(template){
  await document.fonts.ready;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

  const original=document.getElementById("artboard");
  const width=template.width;
  const height=Math.ceil(parseFloat(getComputedStyle(original).height));
  const clone=original.cloneNode(true);

  copyComputedStyles(original,clone);
  clone.setAttribute("xmlns","http://www.w3.org/1999/xhtml");
  clone.style.width=`${width}px`;
  clone.style.height=`${height}px`;
  clone.style.minHeight=`${height}px`;
  clone.style.transform="none";
  clone.style.transformOrigin="top left";
  clone.style.position="relative";
  clone.style.overflow="hidden";
  clone.style.background="#ffffff";

  await inlineImageSources(clone);
  const fontCss=await getEmbeddedFontCss();
  const serialized=new XMLSerializer().serializeToString(clone);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject x="0" y="0" width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml">
        <style>${fontCss}*{box-sizing:border-box}</style>
        ${serialized}
      </div>
    </foreignObject>
  </svg>`;

  const svgUrl=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
  try{
    const image=await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error("El navegador no pudo convertir la composición en imagen."));
      img.src=svgUrl;
    });
    const canvas=document.createElement("canvas");
    canvas.width=width;
    canvas.height=height;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#ffffff";
    ctx.fillRect(0,0,width,height);
    ctx.drawImage(image,0,0,width,height);
    return await new Promise((resolve,reject)=>{
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("No se pudo crear el archivo PNG.")),"image/png");
    });
  }finally{
    URL.revokeObjectURL(svgUrl);
  }
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
  if(button){button.disabled=true;button.textContent="Generando…";}
  setStatus("Generando imagen…");
  try{
    const blob=await renderPNGBlob(template);
    const message=await shareOrDownload(blob,`comunicado_${new Date().toISOString().slice(0,10)}.png`);
    setStatus(message);
  }catch(error){
    console.error("Error al exportar comunicado:",error);
    setStatus(`No se pudo generar la imagen: ${error.message||error}`,true);
    alert(`No se pudo generar la imagen.\n${error.message||error}`);
  }finally{
    if(button){button.disabled=false;button.textContent=oldText;}
  }
}
return{exportPNG};
})();