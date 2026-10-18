import { rectify, enhance } from './scan-core.js';
const $ = id => document.getElementById(id);
const original = $('original'), result = $('result'), ctx = original.getContext('2d');
let source, points = [], dragging = -1, filename = 'document', busy = false;
const status = text => { $('status').textContent = text; };
function invalidate() { $('download').disabled = true; }
function draw() {
  if (!source) return;
  ctx.putImageData(source, 0, 0);
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
  ctx.strokeStyle = '#16c994'; ctx.lineWidth = Math.max(3, original.width/300); ctx.stroke();
  points.forEach((p, i) => {
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(12, original.width/65), 0, Math.PI*2); ctx.fillStyle='#176d53'; ctx.fill();
    ctx.fillStyle='white'; ctx.font=`bold ${Math.max(14, original.width/85)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(i+1),p.x,p.y);
  });
}
function controls() {
  $('corners').replaceChildren();
  points.forEach((p, i) => {
    const row = document.createElement('div'); row.style.marginTop='8px'; row.append(`Góc ${i+1}: `);
    ['x','y'].forEach(axis => {
      const label = document.createElement('label'); label.textContent=axis.toUpperCase();
      const input = document.createElement('input'); input.type='number'; input.min='0'; input.max=String((axis==='x'?source.width:source.height)-1); input.value=String(Math.round(p[axis])); input.style.width='85px'; input.setAttribute('aria-label',`Góc ${i+1} ${axis}`);
      input.onchange=()=>{ const value=Number(input.value); if (!Number.isFinite(value)) return; p[axis]=Math.max(0,Math.min(Number(input.max),value)); input.value=String(p[axis]); invalidate(); draw(); };
      label.append(input); row.append(label);
    }); $('corners').append(row);
  });
}
function reset() {
  points=[{x:0,y:0},{x:source.width-1,y:0},{x:source.width-1,y:source.height-1},{x:0,y:source.height-1}];
  invalidate(); draw(); controls();
}
$('file').onchange = async () => {
  const file=$('file').files[0]; if(!file || busy) return;
  busy=true; $('process').disabled=true; $('reset').disabled=true; invalidate(); status('Đang đọc ảnh…');
  let bitmap;
  try {
    bitmap=await createImageBitmap(file);
    const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
    original.width=Math.max(2,Math.round(bitmap.width*scale)); original.height=Math.max(2,Math.round(bitmap.height*scale));
    ctx.fillStyle='white'; ctx.fillRect(0,0,original.width,original.height); ctx.drawImage(bitmap,0,0,original.width,original.height);
    source=ctx.getImageData(0,0,original.width,original.height); filename=file.name.replace(/\.[^.]+$/, ''); reset();
    result.getContext('2d').clearRect(0,0,result.width,result.height);
    status('Kéo bốn góc vào mép giấy rồi bấm “Tạo bản scan”.');
  } catch { status('Không đọc được ảnh. Hãy thử JPG, PNG hoặc WebP; ảnh HEIC cần chuyển định dạng trước.'); }
  finally { bitmap?.close(); busy=false; $('process').disabled=!source; $('reset').disabled=!source; }
};
function position(event) {
  const rect=original.getBoundingClientRect();
  return {x:Math.max(0,Math.min(original.width-1,(event.clientX-rect.left)*original.width/rect.width)),y:Math.max(0,Math.min(original.height-1,(event.clientY-rect.top)*original.height/rect.height))};
}
original.onpointerdown = event => {
  if (!source || busy) return;
  const p=position(event), radius=35*original.width/original.getBoundingClientRect().width;
  let best=radius; dragging=-1;
  points.forEach((corner,i)=>{const d=Math.hypot(p.x-corner.x,p.y-corner.y); if(d<best){best=d;dragging=i;}});
  if(dragging>=0) original.setPointerCapture(event.pointerId);
};
original.onpointermove = event => { if(dragging<0) return; Object.assign(points[dragging],position(event)); invalidate(); draw(); };
const finish = () => { if(dragging>=0){dragging=-1; controls();} };
original.onpointerup=finish; original.onpointercancel=finish;
$('reset').onclick=reset;
$('mode').onchange=()=>{invalidate(); $('strength').disabled=$('mode').value!=='bw';};
$('strength').oninput=invalidate;
$('process').onclick=async()=>{
  if(!source || busy) return;
  busy=true; $('process').disabled=true; invalidate(); status('Đang chỉnh phối cảnh và làm rõ giấy…');
  await new Promise(resolve=>setTimeout(resolve,30));
  try {
    const scan=enhance(rectify(source,points),$('mode').value,Number($('strength').value));
    result.width=scan.width; result.height=scan.height; result.getContext('2d').putImageData(new ImageData(scan.data,scan.width,scan.height),0,0);
    $('download').disabled=false; status(`Bản scan ${scan.width} × ${scan.height} px đã sẵn sàng.`);
  } catch(error) { status(error.message); }
  finally {busy=false; $('process').disabled=false;}
};
$('download').onclick=()=>result.toBlob(blob=>{
  if(!blob){status('Không xuất được ảnh. Hãy tạo lại bản scan.');return;}
  const url=URL.createObjectURL(blob), link=document.createElement('a'); link.href=url; link.download=`${filename}-scan.png`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
},'image/png');
