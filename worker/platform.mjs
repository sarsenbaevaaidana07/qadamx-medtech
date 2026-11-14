import {dataAccounts,dataAudit,dataBody,dataError,dataReply,dataRows,dataFirst,dataStatement,dataNow,dataId,dataRateLimited,dataNotification,dataJson} from './data.mjs';
// Profiles, administration, audit log, pilot requests, metrics and the AI draft
// adapter. The API key for AI stays a server secret (ANTHROPIC_API_KEY).
const PLATFORM_ROUTE=/^\/api\/(profiles|profile|admin|pilot|metrics|ai|public)(\/|$)/;
const platformLogin=v=>typeof v==='string'&&/^[a-z][a-z0-9_.-]{2,31}$/.test(v);
const platformText=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const platformPhoto=v=>typeof v==='string'&&(v===''||(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)&&v.length<=180000));
async function platformHashPassword(password,saltBytes=crypto.getRandomValues(new Uint8Array(16))){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:saltBytes,iterations:100000,hash:'SHA-256'},key,256);
 const salt=btoa(String.fromCharCode(...saltBytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
 return {salt,hash:Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('')};
}
const platformPassword=v=>typeof v==='string'&&v.length>=10&&v.length<=128&&/[A-Za-zА-Яа-я]/.test(v)&&/\d/.test(v);
async function platformProfiles(db,env){
 const accounts=await dataAccounts(env,db),rows=await dataRows(db,'SELECT * FROM profiles');const byLogin=Object.fromEntries(rows.map(r=>[r.login,r]));
 const assignments=await dataRows(db,'SELECT mentor,count(*) AS n FROM assignments GROUP BY mentor');const load=Object.fromEntries(assignments.map(a=>[a.mentor,a.n]));
 return accounts.map(a=>{const p=byLogin[a.login]||{};return {login:a.login,role:a.role,name:p.name||a.name||a.login,title:p.title||'',specialty:p.specialty||'',bio:p.bio||'',photo:p.photo||'',students:load[a.login]||0};});
}
async function platformMetrics(db,user){
 let rows;
 if(user.role==='admin')rows=await dataRows(db,`SELECT d.id,d.owner,d.kind,d.source_id,d.status,d.revision,d.created_at,d.updated_at,m.template,m.active_ms,m.opened_at,m.approved_at,m.scores FROM documents d LEFT JOIN document_meta m ON m.document_id=d.id ORDER BY d.updated_at DESC LIMIT 2000`);
 else if(user.role==='mentor')rows=await dataRows(db,`SELECT d.id,d.owner,d.kind,d.source_id,d.status,d.revision,d.created_at,d.updated_at,m.template,m.active_ms,m.opened_at,m.approved_at,m.scores FROM documents d LEFT JOIN document_meta m ON m.document_id=d.id WHERE d.kind='study' AND d.owner IN (SELECT student FROM assignments WHERE mentor=?) ORDER BY d.updated_at DESC`,user.login);
 else rows=await dataRows(db,`SELECT d.id,d.owner,d.kind,d.source_id,d.status,d.revision,d.created_at,d.updated_at,m.template,m.active_ms,m.opened_at,m.approved_at,m.scores FROM documents d LEFT JOIN document_meta m ON m.document_id=d.id WHERE d.owner=? ORDER BY d.updated_at DESC`,user.login);
 const ids=JSON.stringify(rows.map(r=>r.id));
 const history=rows.length?await dataRows(db,`SELECT v.document_id,v.revision,v.status,v.created_at,vm.scores,vm.active_ms FROM document_versions v LEFT JOIN version_meta vm ON vm.document_id=v.document_id AND vm.revision=v.revision WHERE v.document_id IN (SELECT value FROM json_each(?)) ORDER BY v.created_at`,ids):[];
 const byDoc={};for(const h of history)(byDoc[h.document_id]??=[]).push({revision:h.revision,status:h.status,at:h.created_at,scores:dataJson(h.scores,{}),activeMs:h.active_ms||0});
 return rows.map(r=>({id:r.id,owner:r.owner,kind:r.kind,sourceId:r.source_id,status:r.status,revision:r.revision,createdAt:r.created_at,updatedAt:r.updated_at,template:r.template||'',activeMs:r.active_ms||0,openedAt:r.opened_at,approvedAt:r.approved_at,scores:dataJson(r.scores,{}),history:byDoc[r.id]||[]}));
}
async function platformAi(env,user,body,db,req){
 if(!['doctor','student'].includes(user.role))return dataError('AI-черновик доступен врачу и студенту.',403,'role');
 if(!env.ANTHROPIC_API_KEY||typeof QadamAI==='undefined')return dataError('AI ещё не подключён: владелец сайта должен добавить серверный ключ ANTHROPIC_API_KEY.',503,'ai_unavailable');
 if(await dataRateLimited(req,env,'ai:'+user.login,30,600))return dataError('Слишком много AI-запросов. Повторите через 15 минут.',429,'rate_limit');
 const lines=Array.isArray(body.lines)?body.lines.filter(l=>typeof l==='string').slice(0,400).map(l=>l.slice(0,2000)):[];
 const fields=Array.isArray(body.fields)?body.fields.filter(f=>f&&/^[a-zA-Z0-9_]{1,40}$/.test(f.key)&&typeof f.label==='string').slice(0,40).map(f=>({key:f.key,label:f.label.slice(0,120),hint:typeof f.hint==='string'?f.hint.slice(0,300):''})):[];
 if(!lines.length||!fields.length||JSON.stringify(lines).length>120000)return dataError('Нет диалога или полей шаблона.',400,'ai_input');
 const language=body.language??'ru';
 if(!['ru','kk','en'].includes(language))return dataError('Неподдерживаемый язык AI. Выберите русский, казахский или английский.',400,'ai_language');
 try{
  const result=await QadamAI.draft({apiKey:env.ANTHROPIC_API_KEY,lines,fields,language});
  await dataAudit(db,user.login,user.role,'ai_draft',typeof body.sourceId==='string'?body.sourceId.slice(0,80):'',result.model).run();
  return dataReply(result);
 }catch(error){return dataError(error?.publicMessage||'AI-сервис не ответил. Повторите позже.',502,error?.code||'ai_failed');}
}
export async function handlePlatform(req,env,user,url=new URL(req.url)){
 const p=url.pathname;if(!PLATFORM_ROUTE.test(p))return null;
 try{
  if(!env.DB?.prepare)return dataError('Серверная база временно недоступна.',503,'database_unavailable');
  const db=env.DB;
  if(p==='/api/pilot'){
   if(req.method!=='POST')return dataError('Метод недоступен.',405,'method');
   if(req.headers.get('Origin')!==url.origin)return dataError('Недопустимый источник запроса.',403,'origin');
   if(await dataRateLimited(req,env,'pilot',5,200))return dataError('Слишком много заявок. Повторите позже.',429,'rate_limit');
   const body=await dataBody(req,8000);
   const lead={name:platformText(body.name,120),organization:platformText(body.organization,160),role:platformText(body.role,80),contact:platformText(body.contact,160),city:platformText(body.city,80),message:platformText(body.message,1500)};
   if(body.consent!==true||!lead.name||!lead.organization||!lead.role||!lead.contact)return dataError('Заполните имя, организацию, роль и контакт и подтвердите согласие.',400,'pilot');
   const id=dataId(),now=dataNow();const admins=(await dataAccounts(env,db)).filter(a=>a.role==='admin');
   await db.batch([dataStatement(db,'INSERT INTO pilot_leads(id,name,organization,role,contact,city,message,status,created_at) VALUES(?,?,?,?,?,?,?,\'new\',?)',id,lead.name,lead.organization,lead.role,lead.contact,lead.city,lead.message,now),dataAudit(db,'guest','public','pilot_request',id,lead.organization,now),...admins.map(a=>dataNotification(db,a.login,'pilot_request','Новая заявка на пилот',null,null,now))]);
   return dataReply({ok:true,id},201);
  }
  if(p==='/api/public/team'&&req.method==='GET'){
   // Public, intentionally limited: staff who teach or consult, with what they chose to show.
   const team=(await platformProfiles(db,env)).filter(x=>['mentor','doctor'].includes(x.role)).map(({name,role,title,specialty,bio,photo,login})=>({name,role,title,specialty,bio:bio.slice(0,300),photo,seed:login.length+':'+name}));
   return new Response(JSON.stringify({team}),{headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
  }
  if(!user)return dataError('Требуется вход.',401,'unauthorized');
  if(!(await dataAccounts(env,db)).some(a=>a.login===user.login&&a.role===user.role))return dataError('Недопустимая учётная запись.',403,'account');
  if(!['GET','POST'].includes(req.method))return dataError('Метод недоступен.',405,'method');
  const body=req.method==='POST'?await dataBody(req,p==='/api/profile'?220000:200000):null;
  if(p==='/api/profiles'&&req.method==='GET')return dataReply({profiles:await platformProfiles(db,env)});
  if(p==='/api/profile'&&req.method==='POST'){
   const profile={name:platformText(body.name,120),title:platformText(body.title,120),specialty:platformText(body.specialty,120),bio:platformText(body.bio,1200),photo:typeof body.photo==='string'?body.photo:''};
   if(!platformPhoto(profile.photo))return dataError('Фото: JPEG, PNG или WebP до 130 КБ.',400,'photo');
   const now=dataNow();
   await db.batch([dataStatement(db,'INSERT INTO profiles(login,name,title,specialty,bio,photo,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(login) DO UPDATE SET name=excluded.name,title=excluded.title,specialty=excluded.specialty,bio=excluded.bio,photo=excluded.photo,updated_at=excluded.updated_at',user.login,profile.name,profile.title,profile.specialty,profile.bio,profile.photo,now),dataAudit(db,user.login,user.role,'profile_updated',user.login,'',now)]);
   return dataReply({profiles:await platformProfiles(db,env)});
  }
  if(p==='/api/metrics'&&req.method==='GET')return dataReply({documents:await platformMetrics(db,user)});
  if(p==='/api/ai/status'&&req.method==='GET')return dataReply({available:!!env.ANTHROPIC_API_KEY&&typeof QadamAI!=='undefined',model:typeof QadamAI!=='undefined'?QadamAI.model:null});
  if(p==='/api/ai/draft'&&req.method==='POST')return await platformAi(env,user,body,db,req);
  if(p.startsWith('/api/admin')){
   if(user.role!=='admin')return dataError('Раздел доступен администратору.',403,'role');
   if(p==='/api/admin/accounts'&&req.method==='GET'){
    const all=await dataAccounts(env,db),stored=await dataRows(db,'SELECT login,role,name,active,created_by,created_at,updated_at FROM user_accounts ORDER BY created_at DESC');
    return dataReply({accounts:[...all.filter(a=>a.source==='config').map(a=>({login:a.login,role:a.role,name:a.name||a.login,source:'config',active:true})),...stored.map(a=>({login:a.login,role:a.role,name:a.name,source:'database',active:!!a.active,createdBy:a.created_by,createdAt:a.created_at,updatedAt:a.updated_at}))]});
   }
   if(p==='/api/admin/accounts'&&req.method==='POST'){
    const login=typeof body.login==='string'?body.login.trim().toLowerCase():'',name=platformText(body.name,120);
    if(!platformLogin(login)||!['doctor','student','mentor','admin'].includes(body.role)||!name)return dataError('Логин: 3–32 латинских символа; выберите роль и укажите имя.',400,'account');
    if(!platformPassword(body.password))return dataError('Пароль: от 10 символов, буквы и цифры.',400,'password');
    if((await dataAccounts(env,db)).some(a=>a.login===login)||await dataFirst(db,'SELECT login FROM user_accounts WHERE login=?',login))return dataError('Такой логин уже существует.',409,'duplicate');
    const {salt,hash}=await platformHashPassword(body.password),now=dataNow();
    await db.batch([dataStatement(db,'INSERT INTO user_accounts(login,role,name,salt,hash,version,active,created_by,created_at,updated_at) VALUES(?,?,?,?,?,1,1,?,?,?)',login,body.role,name,salt,hash,user.login,now,now),dataAudit(db,user.login,user.role,'account_created',login,body.role,now)]);
    return dataReply({ok:true},201);
   }
   const accountRoute=p.match(/^\/api\/admin\/accounts\/([a-z0-9_.-]{3,32})\/(password|active)$/);
   if(accountRoute&&req.method==='POST'){
    const [,login,action]=accountRoute,row=await dataFirst(db,'SELECT * FROM user_accounts WHERE login=?',login);
    if(!row)return dataError('Учётная запись из конфигурации сервера меняется только через секрет QADAMX_ACCOUNTS.',404,'not_found');
    if(login===user.login&&action==='active')return dataError('Нельзя отключить собственную учётную запись.',409,'self');
    const now=dataNow();
    if(action==='password'){if(!platformPassword(body.password))return dataError('Пароль: от 10 символов, буквы и цифры.',400,'password');const {salt,hash}=await platformHashPassword(body.password);await db.batch([dataStatement(db,'UPDATE user_accounts SET salt=?,hash=?,version=version+1,updated_at=? WHERE login=?',salt,hash,now,login),dataAudit(db,user.login,user.role,'password_reset',login,'',now)]);}
    else{const active=body.active===true?1:0;await db.batch([dataStatement(db,'UPDATE user_accounts SET active=?,version=version+1,updated_at=? WHERE login=?',active,now,login),dataAudit(db,user.login,user.role,active?'account_enabled':'account_disabled',login,'',now)]);}
    return dataReply({ok:true});
   }
   if(p==='/api/admin/audit'&&req.method==='GET')return dataReply({events:(await dataRows(db,'SELECT * FROM audit_log ORDER BY created_at DESC,id DESC LIMIT 300')).map(e=>({id:e.id,actor:e.actor,role:e.role,action:e.action,target:e.target,details:e.details,createdAt:e.created_at}))});
   if(p==='/api/admin/leads'&&req.method==='GET')return dataReply({leads:(await dataRows(db,'SELECT * FROM pilot_leads ORDER BY created_at DESC LIMIT 300')).map(l=>({id:l.id,name:l.name,organization:l.organization,role:l.role,contact:l.contact,city:l.city,message:l.message,status:l.status,createdAt:l.created_at}))});
   const leadRoute=p.match(/^\/api\/admin\/leads\/([0-9a-f-]{36})$/i);
   if(leadRoute&&req.method==='POST'){if(!['new','contacted','closed'].includes(body.status))return dataError('Неверный статус.',400,'status');const now=dataNow();const r=await db.batch([dataStatement(db,'UPDATE pilot_leads SET status=? WHERE id=?',body.status,leadRoute[1]),dataAudit(db,user.login,user.role,'pilot_status',leadRoute[1],body.status,now)]);if(!Number(r[0]?.meta?.changes))return dataError('Заявка не найдена.',404,'not_found');return dataReply({ok:true});}
  }
  return dataError('Маршрут не найден.',404,'not_found');
 }catch(error){if(error&&Number.isInteger(error.status))return dataError(error.message,error.status,error.code);return dataError('Не удалось выполнить операцию. Повторите позже.',503,'platform_error');}
}
