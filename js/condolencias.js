(()=>{
const editor=document.getElementById("editor");
const dateInput=document.getElementById("dateInput");
const dateRender=document.getElementById("dateRender");
const contentRender=document.getElementById("contentRender");
const artboard=document.getElementById("artboard");
const footer=document.getElementById("footer");
const previewShell=document.getElementById("previewShell");
const previewViewport=document.getElementById("previewViewport");
const status=document.getElementById("status");
const exportBtn=document.getElementById("exportBtn");

const HEADER_BOTTOM=210;
const CONTENT_TOP=230;
const FOOTER_SOURCE_Y=600;
const FOOTER_HEIGHT=160;
const FOOTER_GAP=38;
const MIN_FOOTER_TOP=390; // evita que el pie suba demasiado en textos mínimos
const MIN_HEIGHT=MIN_FOOTER_TOP+FOOTER_HEIGHT;

const EXAMPLE=`Ante el fallecimiento de nuestro compañero

Xavier Paolo Ochoa Cárdenas

agente fiscal de Chimborazo, la Fiscalía General del Estado –a través de su máxima autoridad, Dr. Leonardo Alarcón– expresa sus más sinceras condolencias y sentimientos de pesar a sus familiares, amigos y allegados.

Que la fuerza y la resignación acompañen a quienes compartieron con él sus 17 años de trayectoria laboral en la Institución, ante esta irreparable pérdida.

Lamentamos profundamente su partida.`;

function escapeHtml(str){
  return str.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function seedEditor(){
  const parts=EXAMPLE.split("\n\n");
  editor.innerHTML=parts.map((p,i)=>
    `<div data-block="1"><span class="${i===1?'black':'regular'}">${escapeHtml(p)}</span></div>`
  ).join("");
}

function normalizeEditor(){
  const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
  const textNodes=[];
  while(walker.nextNode())textNodes.push(walker.currentNode);
  for(const node of textNodes){
    if(!node.parentElement.closest("[data-block]") && node.nodeValue.trim()){
      const block=document.createElement("div");
      block.dataset.block="1";
      const span=document.createElement("span");
      span.className="regular";
      node.parentNode.insertBefore(block,node);
      block.appendChild(span);
      span.appendChild(node);
    }
  }
}

function applyStyle(style){
  const sel=window.getSelection();
  if(!sel || !sel.rangeCount || sel.isCollapsed)return;
  const range=sel.getRangeAt(0);
  if(!editor.contains(range.commonAncestorContainer))return;

  const span=document.createElement("span");
  span.className=style;
  try{
    range.surroundContents(span);
  }catch{
    const frag=range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
  sel.removeAllRanges();
  const newRange=document.createRange();
  newRange.selectNodeContents(span);
  sel.addRange(newRange);
  render();
}

function blocksFromEditor(){
  const temp=document.createElement("div");
  temp.innerHTML=editor.innerHTML;

  // Convert browser-created div/p/br structure into logical paragraphs.
  const raw=[];
  let current=[];
  const flush=()=>{
    if(current.length){
      raw.push(current);
      current=[];
    }
  };

  function walk(node){
    if(node.nodeType===Node.TEXT_NODE){
      if(node.nodeValue)current.push({text:node.nodeValue,style:nearestStyle(node.parentElement)});
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    const tag=node.tagName;
    if(tag==="BR"){flush();return;}
    const isBlock=["DIV","P"].includes(tag);
    if(isBlock && current.length)flush();
    for(const child of node.childNodes)walk(child);
    if(isBlock)flush();
  }

  function nearestStyle(el){
    while(el && el!==temp){
      if(el.classList?.contains("black"))return "black";
      if(el.classList?.contains("bold"))return "bold";
      if(el.classList?.contains("regular"))return "regular";
      el=el.parentElement;
    }
    return "regular";
  }

  for(const child of temp.childNodes)walk(child);
  flush();

  return raw
    .map(parts=>parts.filter(p=>p.text))
    .filter(parts=>parts.some(p=>p.text.trim()));
}

function render(){
  dateRender.textContent=dateInput.value.trim();

  const blocks=blocksFromEditor();
  contentRender.innerHTML="";
  for(const parts of blocks){
    const p=document.createElement("p");
    for(const part of parts){
      const span=document.createElement("span");
      span.className=part.style;
      span.textContent=part.text;
      p.appendChild(span);
    }
    contentRender.appendChild(p);
  }

  requestAnimationFrame(layout);
}

function layout(){
  // IMPORTANTE: medir en coordenadas lógicas del documento, no en píxeles
  // visuales del preview. getBoundingClientRect() incluye el transform:scale()
  // aplicado en móvil y hacía que el pie subiera sobre el texto.
  const contentHeight=Math.ceil(contentRender.scrollHeight);
  const contentBottom=CONTENT_TOP+contentHeight;

  // El pie acompaña al contenido en ambos sentidos:
  // sube cuando el texto es corto y baja cuando el texto crece.
  const footerTop=Math.max(MIN_FOOTER_TOP,contentBottom+FOOTER_GAP);
  const totalHeight=Math.max(MIN_HEIGHT,footerTop+FOOTER_HEIGHT);

  footer.style.top=`${footerTop}px`;
  artboard.style.height=`${totalHeight}px`;
  artboard.dataset.height=String(totalHeight);
  fitPreview();
}

function fitPreview(){
  const stage=document.querySelector(".stage");
  if(!stage || !previewShell || !previewViewport)return;

  const horizontalPadding=window.innerWidth<=900 ? 20 : 56;
  const available=Math.max(240,stage.clientWidth-horizontalPadding);
  const scale=Math.min(1,available/1080);
  const naturalHeight=Number(artboard.dataset.height||MIN_HEIGHT);

  // El shell conserva siempre el tamaño real 1080 px.
  // Solo se escala visualmente; el viewport ocupa exactamente el tamaño visible.
  previewShell.style.width="1080px";
  previewShell.style.height=`${naturalHeight}px`;
  previewShell.style.transform=`scale(${scale})`;

  previewViewport.style.width=`${Math.round(1080*scale)}px`;
  previewViewport.style.height=`${Math.round(naturalHeight*scale)}px`;
}

function canvasTextStyle(style){
  if(style==="black")return {font:"900 40px 'Montserrat Condolencias Black', Montserrat, Arial",size:40,line:48};
  if(style==="bold")return {font:"700 24px Montserrat, Arial",size:24,line:34};
  return {font:"400 24px Montserrat, Arial",size:24,line:34};
}

function wrapStyledBlock(ctx,parts,maxWidth){
  const tokens=[];
  for(const part of parts){
    const words=part.text.split(/(\s+)/);
    for(const word of words)tokens.push({text:word,style:part.style});
  }

  const lines=[];
  let line=[];
  let width=0;
  let lineHeight=34;

  for(const token of tokens){
    const st=canvasTextStyle(token.style);
    ctx.font=st.font;
    const w=ctx.measureText(token.text).width;
    if(line.length && width+w>maxWidth && token.text.trim()){
      lines.push({tokens:line,width,lineHeight});
      line=[];width=0;lineHeight=34;
    }
    line.push(token);
    width+=w;
    lineHeight=Math.max(lineHeight,st.line);
  }
  if(line.length)lines.push({tokens:line,width,lineHeight});
  return lines;
}

function drawCenteredLine(ctx,line,y,centerX){
  let x=centerX-line.width/2;
  for(const token of line.tokens){
    const st=canvasTextStyle(token.style);
    ctx.font=st.font;
    ctx.fillStyle="#111";
    ctx.textBaseline="alphabetic";
    const baseline=y+(line.lineHeight-st.size)/2+st.size*.82;
    ctx.fillText(token.text,x,baseline);
    x+=ctx.measureText(token.text).width;
  }
}

async function loadImage(src){
  return await new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error(`No se pudo cargar ${src}`));
    img.src=src;
  });
}

async function exportPNG(){
  exportBtn.disabled=true;
  exportBtn.textContent="Generando…";
  status.textContent="Generando imagen…";

  try{
    await document.fonts.ready;
    render();
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

    const height=Number(artboard.dataset.height||MIN_HEIGHT);
    const canvas=document.createElement("canvas");
    canvas.width=1080;
    canvas.height=height;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#fff";
    ctx.fillRect(0,0,1080,height);

    const base=await loadImage("assets/templates/condolencias-base.svg?v=1400");

    // Header crop.
    ctx.drawImage(base,0,0,1080,210,0,0,1080,210);

    // Date.
    ctx.fillStyle="#111";
    ctx.font="400 17.68px Raleway, Montserrat, Arial";
    ctx.textBaseline="alphabetic";
    ctx.fillText(dateInput.value.trim(),50,54);

    // Content.
    const blocks=blocksFromEditor();
    let y=CONTENT_TOP;
    const maxWidth=980;
    for(let i=0;i<blocks.length;i++){
      const lines=wrapStyledBlock(ctx,blocks[i],maxWidth);
      for(const line of lines){
        drawCenteredLine(ctx,line,y,540);
        y+=line.lineHeight;
      }
      if(i<blocks.length-1)y+=24;
    }

    // Footer crop, positioned dynamically.
    const footerTop=parseFloat(footer.style.top)||600;
    ctx.drawImage(base,0,FOOTER_SOURCE_Y,1080,FOOTER_HEIGHT,0,footerTop,1080,FOOTER_HEIGHT);

    const blob=await new Promise((resolve,reject)=>
      canvas.toBlob(b=>b?resolve(b):reject(new Error("No se pudo crear el PNG.")),"image/png")
    );

    const filename=`condolencias_${new Date().toISOString().slice(0,10)}.png`;
    const file=new File([blob],filename,{type:"image/png"});
    const mobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent||"");

    if(mobile && navigator.share && navigator.canShare?.({files:[file]})){
      await navigator.share({files:[file],title:"Condolencias"});
      status.textContent="Imagen lista para guardar o compartir.";
    }else{
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download=filename;
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      status.textContent="PNG descargado correctamente.";
    }
  }catch(err){
    console.error(err);
    status.textContent=`Error: ${err.message||err}`;
    alert(`No se pudo exportar.\n${err.message||err}`);
  }finally{
    exportBtn.disabled=false;
    exportBtn.textContent="Exportar PNG";
  }
}

document.querySelectorAll("[data-style]").forEach(btn=>
  btn.addEventListener("click",()=>applyStyle(btn.dataset.style))
);
document.getElementById("undoBtn").addEventListener("click",()=>document.execCommand("undo"));
editor.addEventListener("input",()=>{normalizeEditor();render();});
dateInput.addEventListener("input",render);
exportBtn.addEventListener("click",exportPNG);
window.addEventListener("resize",fitPreview);

seedEditor();
render();
})();
