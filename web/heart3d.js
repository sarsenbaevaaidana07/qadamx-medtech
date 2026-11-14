/* QadamX 3D heart: a beating particle heart rendered with Canvas 2D (no libraries).
 * Usage: <canvas data-heart="hero|mini"></canvas>; drag to rotate. Respects prefers-reduced-motion.
 * Performance: particles are grouped into depth buckets and each bucket is filled with one path,
 * so a frame costs ~20 fill calls instead of thousands; capped at 30 fps; fewer particles on phones;
 * stops when off-screen or the tab is hidden. */
'use strict';
(function(root){
 if(typeof document==='undefined'||!document.querySelectorAll)return;
 const mm=q=>!!root.matchMedia?.(q).matches;
 const reduce=mm('(prefers-reduced-motion: reduce)');
 const weak=mm('(pointer: coarse)')||(root.innerWidth||1200)<760||(navigator.hardwareConcurrency||8)<=4;
 const BUCKETS=10,FRAME_MS=33;
 function makePoints(n,ring){
  const N=n+ring,X=new Float32Array(N),Y=new Float32Array(N),Z=new Float32Array(N),R=new Float32Array(N),RING=new Uint8Array(N);
  for(let i=0;i<n;i++){
   const t=Math.random()*Math.PI*2,shell=Math.random()<.55,r=shell?1:Math.cbrt(Math.random()),s=Math.random();
   const x=16*Math.sin(t)**3,y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
   const depth=Math.sqrt(Math.max(0,1-r*r*.92))*9*(Math.random()*2-1)*(shell?.45:1);
   X[i]=x*r/17;Y[i]=-y*r/17+.12;Z[i]=(depth+(shell?(Math.random()*2-1)*1.2:0))/17;R[i]=s;
  }
  // Orbit ring: reads as 3D and echoes an ECG monitor sweep.
  for(let j=0;j<ring;j++){const i=n+j,a=j/ring*Math.PI*2;X[i]=Math.cos(a)*1.3;Y[i]=.05+Math.sin(a*6)*.02;Z[i]=Math.sin(a)*1.3;RING[i]=1;}
  return {N,X,Y,Z,R,RING};
 }
 // Lub-dub at 72 bpm: two Gaussian pulses per 0.833 s period.
 function beat(ms){const p=(ms%833)/833,g=(c,w)=>Math.exp(-(((p-c)/w)**2));return g(.08,.045)+.6*g(.28,.05);}
 function palette(light){
  const far=[21,99,224],near=[34,211,238],heart=[],ring=[];
  for(let b=0;b<BUCKETS;b++){const d=b/(BUCKETS-1),a=.25+.7*d;
   heart.push(light?`rgba(${far.map((v,j)=>Math.round(v+(near[j]-v)*d)).join(',')},${a.toFixed(2)})`:`rgba(255,255,255,${a.toFixed(2)})`);
   ring.push(`rgba(96,165,250,${(.18+.5*d).toFixed(2)})`);}
  return {heart,ring};
 }
 function mount(canvas){
  if(canvas.__heart)return;canvas.__heart=true;
  const mini=canvas.dataset.heart==='mini',ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
  const P=makePoints(mini?(weak?380:650):(weak?1100:2000),mini?90:(weak?120:200));
  const PX=new Float32Array(P.N),PY=new Float32Array(P.N),PR=new Float32Array(P.N),PB=new Uint8Array(P.N);
  const colors=palette(!mini&&!canvas.closest('.role-hero'));
  let base=0,rotY=0,rotX=-.15,vel=mini?.004:.0035,drag=null,w=0,h=0,dpr=1,visible=true,raf=0,lastDraw=-1e9;
  function size(){const r=canvas.getBoundingClientRect();dpr=Math.min(weak?1.5:2,root.devicePixelRatio||1);w=Math.max(1,r.width);h=Math.max(1,r.height);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  size();if(root.ResizeObserver)new ResizeObserver(()=>{size();draw(performance.now());}).observe(canvas);
  const dot=mini?1.1:1.35,useRect=weak;
  function draw(ms){
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   const pulse=1+(reduce?0:.075*beat(ms)),scale=Math.min(w,h)*(mini?.36:.34),cx=w/2,cy=h/2;
   const cY=Math.cos(rotY),sY=Math.sin(rotY),cX=Math.cos(rotX),sX=Math.sin(rotX);
   const {N,X,Y,Z,R,RING}=P;
   for(let i=0;i<N;i++){const k=RING[i]?1:pulse,x=X[i]*k,y=Y[i]*k,z=Z[i]*k;
    const x1=x*cY+z*sY,z1=-x*sY+z*cY,y1=y*cX-z1*sX,z2=y*sX+z1*cX,f=3.2/(3.2+z2);
    PX[i]=cx+x1*scale*f;PY[i]=cy+y1*scale*f;PR[i]=(RING[i]?1:dot+R[i]*.6)*f;
    const d=(1.6-z2)/3.2;PB[i]=d<=0?0:d>=1?BUCKETS-1:Math.floor(d*(BUCKETS-1)+.5);}
   // Far buckets first; one path and one fill per bucket and kind.
   for(let b=0;b<BUCKETS;b++)for(let kind=1;kind>=0;kind--){
    ctx.beginPath();let any=false;
    for(let i=0;i<N;i++){if(PB[i]!==b||RING[i]!==kind)continue;any=true;const r=PR[i];
     if(useRect)ctx.rect(PX[i]-r,PY[i]-r,r*2,r*2);else{ctx.moveTo(PX[i]+r,PY[i]);ctx.arc(PX[i],PY[i],r,0,6.2832);}}
    if(any){ctx.fillStyle=kind?colors.ring[b]:colors.heart[b];ctx.fill();}}
  }
  function loop(ms){if(!canvas.isConnected){cancelAnimationFrame(raf);return;}raf=requestAnimationFrame(loop);
   if(!visible||document.hidden||ms-lastDraw<FRAME_MS)return;lastDraw=ms;
   // Gentle sway (±40°) keeps the heart silhouette readable; dragging adds an offset.
   if(!drag)rotY=base+Math.sin(ms*vel*.25)*.7;draw(ms);}
  if(root.IntersectionObserver)new IntersectionObserver(e=>{visible=e[0].isIntersecting}).observe(canvas);
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,ry:rotY,rx:rotX};canvas.setPointerCapture?.(e.pointerId);canvas.classList.add('grabbing');});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;rotY=drag.ry+(e.clientX-drag.x)*.01;rotX=Math.max(-1,Math.min(1,drag.rx+(e.clientY-drag.y)*.006));if(reduce)draw(0);});
  const end=()=>{if(drag)base=rotY-Math.sin(performance.now()*vel*.25)*.7;drag=null;canvas.classList.remove('grabbing');};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const d=e.key==='ArrowLeft'?-.2:.2;rotY+=d;base+=d;if(reduce)draw(0);e.preventDefault();}});
  draw(0);if(!reduce)raf=requestAnimationFrame(loop);
 }
 function mountAll(){document.querySelectorAll('canvas[data-heart]').forEach(mount);}
 root.QHeart3D={mount,mountAll};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountAll);else mountAll();
 // Workspace re-renders its markup; mount hearts that appear after each render.
 if(typeof root.render==='function'){const prev=root.render;root.render=function(){prev.apply(this,arguments);mountAll();};render=root.render;}
})(typeof window!=='undefined'?window:globalThis);
