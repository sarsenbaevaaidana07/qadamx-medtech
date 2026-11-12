/* Illustrated portrait avatars generated from a login. Used until a person uploads a photo. */
'use strict';
(function(root){
 const skins=['#f2d3b5','#e8bf98','#d9a77c','#c68b62','#f5dcc4','#a87451'];
 const hairs=['#2b1d16','#4a2f22','#6b4430','#1c1c22','#8a5a3b','#3a2a20','#b9b2a8'];
 const coats=['#1563e0','#0ea5b7','#2f7dd1','#5b6bd6','#0e8f86','#3b82c4'];
 const bgs=['#e8f0fe','#e1f6f8','#eef2f7','#eaf4ff','#e6f7f4','#f0f4fa'];
 function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
 function svg(seed,{female}={}){
  const h=hash(seed),pick=(a,n)=>a[(h>>>n)%a.length];
  const skin=pick(skins,1),hair=pick(hairs,5),coat=pick(coats,9),bg=pick(bgs,13);const f=female??((h>>>17)%2===0);const glasses=(h>>>19)%4===0;
  const hairBack=f?`<path d="M30 52c-2-26 14-38 34-38s36 12 34 38c4 22 2 40-6 50H36c-8-10-10-28-6-50z" fill="${hair}"/>`:'';
  const hairTop=f?`<path d="M36 50c2-18 14-26 28-26s26 8 28 26c-10-8-22-12-30-20-6 10-16 16-26 20z" fill="${hair}"/>`:`<path d="M38 52c-2-20 10-30 26-30s28 10 26 30c-4-8-10-12-14-14-8 4-26 6-38 14z" fill="${hair}"/>`;
  const specs=glasses?`<g fill="none" stroke="#2d3748" stroke-width="2"><circle cx="55" cy="60" r="7"/><circle cx="73" cy="60" r="7"/><path d="M62 60h4"/></g>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="${bg}"/>${hairBack}<path d="M22 128c2-24 18-36 42-36s40 12 42 36z" fill="#fff"/><path d="M22 128c2-24 18-36 42-36l-10 36z M106 128c-2-24-18-36-42-36l10 36z" fill="${coat}"/><path d="M56 88h16v12c-4 4-12 4-16 0z" fill="${skin}"/><ellipse cx="64" cy="60" rx="24" ry="27" fill="${skin}"/>${hairTop}<circle cx="55" cy="61" r="2.4" fill="#2d2522"/><circle cx="73" cy="61" r="2.4" fill="#2d2522"/><path d="M57 74q7 5 14 0" stroke="#9a5b4a" stroke-width="2.2" fill="none" stroke-linecap="round"/>${specs}<path d="M60 108l4 6 4-6" stroke="#cbd5e1" stroke-width="2" fill="none"/></svg>`;
 }
 function url(seed,opts){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(seed,opts));}
 const api={svg,url};root.QAvatars=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
