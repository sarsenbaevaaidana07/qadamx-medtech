/* QadamX 3D heart: a beating particle heart rendered with Canvas 2D (no libraries).
 * Usage: <canvas data-heart="hero|mini"></canvas>; drag to rotate. Respects prefers-reduced-motion. */
'use strict';
(function(root){
 if(typeof document==='undefined'||!document.querySelectorAll)return;
 const reduce=!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const near=[34,211,238],far=[21,99,224],mid=[96,165,250];
 function makePoints(n){
  const pts=[];
  for(let i=0;i<n;i++){
   const t=Math.random()*Math.PI*2,shell=Math.random()<.55,r=shell?1:Math.cbrt(Math.random());
   const x=16*Math.sin(t)**3,y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
   const depth=Math.sqrt(Math.max(0,1-r*r*.92))*9*(Math.random()*2-1)*(shell?.45:1);
   pts.push({x:x*r/17,y:-y*r/17+.12,z:(depth+(shell?(Math.random()*2-1)*1.2:0))/17,s:Math.random()});
  }
  // Orbit ring: reads as 3D and echoes an ECG monitor sweep.
  for(let i=0;i<220;i++){const a=i/220*Math.PI*2;pts.push({x:Math.cos(a)*1.3,y:.05+Math.sin(a*6)*.02,z:Math.sin(a)*1.3,s:2});}
  return pts;
 }
 // Lub-dub at 72 bpm: two Gaussian pulses per 0.833 s period.
 function beat(ms){const p=(ms%833)/833,g=(c,w)=>Math.exp(-(((p-c)/w)**2));return g(.08,.045)+.6*g(.28,.05);}
 function mount(canvas){
  if(canvas.__heart)return;canvas.__heart=true;
  const mini=canvas.dataset.heart==='mini',ctx=canvas.getContext('2d');if(!ctx)return;
  const pts=makePoints(mini?900:2600);let base=0,rotY=0,rotX=-.15,vel=mini?.004:.0035,drag=null,w=0,h=0,dpr=1,visible=true,raf=0;
  function size(){const r=canvas.getBoundingClientRect();dpr=Math.min(2,root.devicePixelRatio||1);w=Math.max(1,r.width);h=Math.max(1,r.height);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  size();if(root.ResizeObserver)new ResizeObserver(()=>{size();if(reduce)draw(0);}).observe(canvas);
  const light=!mini&&!canvas.closest('.role-hero');
  function draw(ms){
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   const pulse=1+(reduce?0:.075*beat(ms)),scale=Math.min(w,h)*(mini?.36:.34),cx=w/2,cy=h/2;
   const cy1=Math.cos(rotY),sy1=Math.sin(rotY),cx1=Math.cos(rotX),sx1=Math.sin(rotX);
   const out=new Array(pts.length);
   for(let i=0;i<pts.length;i++){const p=pts[i],k=p.s===2?1:pulse;let x=p.x*k,y=p.y*k,z=p.z*k;
    const x1=x*cy1+z*sy1,z1=-x*sy1+z*cy1,y1=y*cx1-z1*sx1,z2=y*sx1+z1*cx1,f=3.2/(3.2+z2);
    out[i]={x:cx+x1*scale*f,y:cy+y1*scale*f,z:z2,f,ring:p.s===2,s:p.s};}
   out.sort((a,b)=>b.z-a.z);
   for(const p of out){const d=Math.min(1,Math.max(0,(1.6-p.z)/3.2)),c=p.ring?mid:far.map((v,j)=>Math.round(v+(near[j]-v)*d));
    const a=p.ring?(.18+.5*d):(.25+.7*d);ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${light?a:Math.min(1,a+.15)})`;
    if(!light&&!p.ring)ctx.fillStyle=`rgba(255,255,255,${.25+.7*d})`;
    const r=(p.ring?1:(mini?1.1:1.35)+p.s*.6)*p.f;ctx.beginPath();ctx.arc(p.x,p.y,r,0,6.2832);ctx.fill();}
  }
  function loop(ms){if(!canvas.isConnected){cancelAnimationFrame(raf);return;}if(visible&&!document.hidden){// Gentle sway (±40°) keeps the heart silhouette readable; dragging adds an offset.
if(!drag)rotY=base+Math.sin(ms*vel*.25)*.7;draw(ms);}raf=requestAnimationFrame(loop);}
  if(root.IntersectionObserver)new IntersectionObserver(e=>{visible=e[0].isIntersecting}).observe(canvas);
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,ry:rotY,rx:rotX};canvas.setPointerCapture?.(e.pointerId);canvas.classList.add('grabbing');});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;rotY=drag.ry+(e.clientX-drag.x)*.01;rotX=Math.max(-1,Math.min(1,drag.rx+(e.clientY-drag.y)*.006));if(reduce)draw(0);});
  const end=()=>{if(drag)base=rotY-Math.sin(performance.now()*vel*.25)*.7;drag=null;canvas.classList.remove('grabbing');};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){{const d=e.key==='ArrowLeft'?-.2:.2;rotY+=d;base+=d;}if(reduce)draw(0);e.preventDefault();}});
  if(reduce)draw(0);else raf=requestAnimationFrame(loop);
 }
 function mountAll(){document.querySelectorAll('canvas[data-heart]').forEach(mount);}
 root.QHeart3D={mount,mountAll};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountAll);else mountAll();
 // Workspace re-renders its markup; mount hearts that appear after each render.
 if(typeof root.render==='function'){const base=root.render;root.render=function(){base.apply(this,arguments);mountAll();};render=root.render;}
})(typeof window!=='undefined'?window:globalThis);
