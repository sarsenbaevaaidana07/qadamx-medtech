// Passwords and session keys live only in runtime secrets, never in the bundle.
const encoder=new TextEncoder();
const COOKIE='__Host-qadamx_session';
const TTL=8*60*60;
const safeHeaders={
  'Cache-Control':'no-store, private',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'same-origin',
  'X-Frame-Options':'DENY',
  'Permissions-Policy':'camera=(), microphone=(self), geolocation=()',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...safeHeaders,'Content-Type':'application/json;charset=utf-8',...extra}});
const redirect=(to)=>new Response(null,{status:303,headers:{...safeHeaders,Location:to}});
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unb64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
function equal(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
async function accounts(env){const a=JSON.parse(env.QADAMX_ACCOUNTS||'[]');if(!Array.isArray(a)||!a.length||!env.QADAMX_SESSION_SECRET)throw new Error('Authentication not configured');return dataAccounts(env,env.DB);}
async function hmacKey(env){return crypto.subtle.importKey('raw',encoder.encode(env.QADAMX_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function tokenFor(user,env){const p=b64(encoder.encode(JSON.stringify({sub:user.login,ver:user.version,exp:Math.floor(Date.now()/1000)+TTL,nonce:crypto.randomUUID()})));return p+'.'+b64(await crypto.subtle.sign('HMAC',await hmacKey(env),encoder.encode(p)));}
async function identity(req,env){
  try{const value=(req.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!value||value.length>2048)return null;
    const [payload,sig,extra]=value.split('.');if(extra||!payload||!sig)return null;
    if(!await crypto.subtle.verify('HMAC',await hmacKey(env),unb64(sig),encoder.encode(payload)))return null;
    const p=JSON.parse(new TextDecoder().decode(unb64(payload)));if(!Number.isFinite(p.exp)||p.exp<=Date.now()/1000)return null;
    const user=(await accounts(env)).find(u=>u.login===p.sub&&u.version===p.ver);return user?{login:user.login,role:user.role,name:user.name}:null;
  }catch{return null;}
}
function originAllowed(req){const origin=req.headers.get('Origin');return origin===new URL(req.url).origin;}
async function login(req,env){
 if(!originAllowed(req))return json({error:'Недопустимый источник запроса.'},403);
 if(await dataRateLimited(req,env,'login',15,1000))return json({error:'Слишком много попыток. Повторите через 15 минут.'},429,{'Retry-After':'900'});
 let body;try{body=await dataBody(req,2048)}catch(error){return json({error:error.message||'Неверный формат.'},error.status||400);}
 if(typeof body.login!=='string'||typeof body.password!=='string'||body.password.length>128)return json({error:'Неверный логин или пароль.'},401);
 const list=await accounts(env),user=list.find(u=>u.login===body.login.trim().toLowerCase());
 const candidate=user||list[0];
 const key=await crypto.subtle.importKey('raw',encoder.encode(body.password),'PBKDF2',false,['deriveBits']);
 const hash=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unb64(candidate.salt),iterations:100000,hash:'SHA-256'},key,256));
 if(!user||!equal(hash,candidate.hash))return json({error:'Неверный логин или пароль.'},401);
 const token=await tokenFor(user,env);
 try{if(env.DB?.prepare)await dataAudit(env.DB,user.login,user.role,'login','','').run();}catch{}
 return json({ok:true},200,{'Set-Cookie':`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`});
}
function asset(name){const content=ASSETS[name];if(content===undefined)return new Response('Not found',{status:404,headers:safeHeaders});const ext=name.split('.').at(-1);const mime={html:'text/html',js:'text/javascript',css:'text/css',svg:'image/svg+xml',txt:'text/plain'}[ext]||'text/plain';return new Response(content,{headers:{...safeHeaders,'Content-Type':mime+';charset=utf-8'}});}
export default {async fetch(req,env){
 try{
 const url=new URL(req.url),p=url.pathname;
 if(p==='/api/login'&&req.method==='POST')return await login(req,env);
 if(p==='/api/logout'&&req.method==='POST'){if(!originAllowed(req))return json({error:'Недопустимый источник запроса.'},403);return json({ok:true},200,{'Set-Cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`});}
 if(p.startsWith('/api/')){const platformResponse=await handlePlatform(req,env,p==='/api/pilot'||p==='/api/public/team'?null:await identity(req,env),url);if(platformResponse)return platformResponse;const dataResponse=await handleData(req,env,await identity(req,env),url);if(dataResponse)return dataResponse;}
 if(!['GET','HEAD'].includes(req.method))return json({error:'Метод недоступен.'},405);
 if(p==='/api/session'){const user=await identity(req,env);return user?json(user):json({error:'Требуется вход.'},401);}
 if(p==='/')return asset('/welcome.html');
 if(p==='/patient'||p==='/patient/')return asset('/patient.html');
 if(p==='/login'||p==='/login/')return await identity(req,env)?redirect('/workspace/'):asset('/login.html');
 if(['/auth.css','/auth-ui.js','/guest-api.js','/i18n.js','/icon.svg','/project-brief.txt','/landing.js','/landing.css','/theme.css','/fonts.css','/qrcode.js','/avatars.js'].includes(p)||p.startsWith('/attribution/'))return asset(p);
 if(p==='/robots.txt')return new Response('User-agent: *\nDisallow: /\n',{headers:{...safeHeaders,'Content-Type':'text/plain'}});
 if(p==='/workspace')return redirect('/workspace/');
 if(p.startsWith('/workspace/')){
   const user=await identity(req,env);
   if(!user)return p==='/workspace/'?redirect('/login'):json({error:'Требуется вход.'},401);
   const name=p.slice('/workspace'.length);
   if(name==='/session.js')return new Response('window.QADAM_SESSION='+JSON.stringify(user).replaceAll('<','\\u003c')+';', {headers:{...safeHeaders,'Content-Type':'text/javascript;charset=utf-8'}});
   return asset(name==='/'?'/index.html':name);
 }
 return new Response('Страница не найдена',{status:404,headers:safeHeaders});
 }catch{return json({error:'Сервис входа временно недоступен. Обратитесь к владельцу проекта.'},503);}
}};
