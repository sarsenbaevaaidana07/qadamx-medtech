import http from 'node:http';
import readline from 'node:readline';
import {readFile} from 'node:fs/promises';
import {randomBytes,pbkdf2Sync} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createLocalD1} from './sqlite-d1.mjs';
const code=await readFile(new URL('../dist/server/index.js',import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
let config;
if(process.argv.includes('--demo')){
 // Fictional demo people for the local preview only.
 const people=[['admin','admin','Администратор QadamX'],['doctor','doctor','Айгерим Сейткали'],['mentor','mentor','Ерлан Тулеуов'],['mentor2','mentor','Динара Ахметова'],['mentor3','mentor','Сергей Ким'],['student','student','Алия Нурланова'],['student2','student','Тимур Исаев'],['student3','student','Мадина Жуматова']];
 const rows=people.map(([login,role,name])=>{const salt=randomBytes(16);return {login,role,name,version:1,salt:salt.toString('base64url'),hash:pbkdf2Sync('Local-preview-only-2026',salt,100000,32,'sha256').toString('hex')}});
 config={QADAMX_ACCOUNTS:JSON.stringify(rows),QADAMX_SESSION_SECRET:randomBytes(32).toString('base64url')};
}else{
 process.stdin.setRawMode?.(true);
 console.log('Ready for preview secrets on stdin (input is hidden).');
 const rl=readline.createInterface({input:process.stdin,terminal:false});
 config=await new Promise(resolve=>rl.once('line',line=>resolve(JSON.parse(line))));
 rl.close();
}
mkdirSync(new URL('../.local-data/',import.meta.url),{recursive:true});
config.DB=createLocalD1(fileURLToPath(new URL('../.local-data/preview.sqlite',import.meta.url)));
if(process.argv.includes('--demo')){
 const seed=[['doctor','Айгерим Сейткали','врач-терапевт высшей категории','Терапия, кардиология','12 лет амбулаторной практики. Ведёт учебные приёмы и назначает наставников.'],['mentor','Ерлан Тулеуов','к.м.н., доцент','Внутренние болезни','Проверяет точность записей: числа, отрицания и опору на источник.'],['mentor2','Динара Ахметова','врач-педиатр, клинический наставник','Педиатрия','Учит структурировать жалобы и анамнез по SOAP.'],['mentor3','Сергей Ким','врач общей практики','Семейная медицина','Помогает формулировать рекомендации и план понятным языком.']];
 const now=new Date().toISOString();for(const [login,name,title,specialty,bio] of seed)config.DB.raw.prepare("INSERT OR IGNORE INTO profiles(login,name,title,specialty,bio,photo,updated_at) VALUES(?,?,?,?,?,'',?)").run(login,name,title,specialty,bio,now);
}
const server=http.createServer(async(req,res)=>{
 try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const url='http://127.0.0.1:8765'+req.url;const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}: {})});const response=await worker.fetch(request,config,{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Preview error');}
});
server.listen(8765,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:8765'));
