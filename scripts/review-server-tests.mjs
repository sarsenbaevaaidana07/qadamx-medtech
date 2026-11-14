import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import {createLocalD1} from './sqlite-d1.mjs';
const code=await readFile(new URL('../dist/server/index.js',import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const db=createLocalD1(),salt=randomBytes(16),hash=p=>pbkdf2Sync(p,salt,100000,32,'sha256').toString('hex');
const account={login:'doctor',role:'doctor',name:'Test',version:1,salt:salt.toString('base64url'),hash:hash('Old-test-only-123')};
const env={DB:db,QADAMX_ACCOUNTS:JSON.stringify([account]),QADAMX_SESSION_SECRET:randomBytes(32).toString('hex')};
const origin='https://qadamx.test';let cookie='',count=0;
const call=(path,body)=>worker.fetch(new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,{});
const signIn=password=>call('/api/login',{login:'doctor',password});
async function test(name,fn){await fn();count++;console.log('PASS '+name);}
try{
 await test('Config password changes revoke old sessions without a version bump',async()=>{
  const r=await signIn('Old-test-only-123');assert.equal(r.status,200);cookie=r.headers.get('Set-Cookie').split(';')[0];
  const payload=JSON.parse(Buffer.from(cookie.split('=')[1].split('.')[0],'base64url'));assert(!JSON.stringify(payload).includes(account.hash));assert(!JSON.stringify(payload).includes(account.salt));
  env.QADAMX_ACCOUNTS=JSON.stringify([{...account,hash:hash('New-test-only-456')}]);
  assert.equal((await signIn('Old-test-only-123')).status,401);assert.equal((await call('/api/session')).status,401);
  const fresh=await signIn('New-test-only-456');assert.equal(fresh.status,200);cookie=fresh.headers.get('Set-Cookie').split(';')[0];assert.equal((await call('/api/session')).status,200);
 });
 await test('Config role changes invalidate previous sessions',async()=>{
  env.QADAMX_ACCOUNTS=JSON.stringify([{...account,role:'admin',hash:hash('New-test-only-456')}]);assert.equal((await call('/api/session')).status,401);
  env.QADAMX_ACCOUNTS=JSON.stringify([{...account,hash:hash('New-test-only-456')}]);
 });
 const sourceId='ACI-BENCH/train/D2N001';let doc;
 await test('Unknown document templates are rejected before storage',async()=>{
  assert.equal((await call('/api/documents',{sourceId,text:'Synthetic',template:'unknown'})).status,400);
  const r=await call('/api/documents',{sourceId,text:'Synthetic',template:'soap'});assert.equal(r.status,201);doc=(await r.json()).document;
 });
 async function race(bodies,path,action){
  const original=db.batch.bind(db);let arrived=0,release;const barrier=new Promise(r=>release=r);
  db.batch=async stmts=>{if(stmts[0].sql.startsWith('UPDATE documents SET')){if(++arrived===2)release();await barrier;}return original(stmts);};
  try{const results=await Promise.all(bodies.map(b=>call(path,b)));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
   assert.equal(db.raw.prepare('SELECT COUNT(*) AS n FROM audit_log WHERE target=? AND action=?').get(doc.id,action).n,1);
   return (await results.find(r=>r.status===200).json()).document;
  }finally{db.batch=original;}
 }
 await test('Concurrent save emits one version and one successful audit event',async()=>{
  doc=await race(['A','B'].map(text=>({id:doc.id,sourceId,text,expectedRevision:doc.revision})),'/api/documents','document_saved');
  assert.equal(db.raw.prepare('SELECT COUNT(*) AS n FROM document_versions WHERE document_id=?').get(doc.id).n,2);
 });
 await test('Concurrent state changes do not audit a rejected action as successful',async()=>{
  doc=await race([1,2].map(()=>({action:'submit',expectedRevision:doc.revision})),`/api/documents/${doc.id}/action`,'document_submit');assert.equal(doc.status,'review');
 });
 console.log(count+' review server checks passed.');
}finally{db.close();}
