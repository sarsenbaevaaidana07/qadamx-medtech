// Interactive: builds QADAMX_ACCOUNTS (PBKDF2 hashes only) and uploads it as a Cloudflare secret.
// Passwords are typed with hidden input and never written to disk or printed.
// Usage: node scripts/set-accounts.mjs
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import readline from 'node:readline';
const ROLES=['admin','doctor','mentor','student'];
function ask(q,{hidden=false}={}){return new Promise(resolve=>{
 const rl=readline.createInterface({input:process.stdin,output:process.stdout,terminal:true});
 if(hidden){rl._writeToOutput=s=>{if(s.includes(q))rl.output.write(q);else if(s.includes('\n')||s.includes('\r'))rl.output.write('\n');else rl.output.write('*'.repeat(s.length));};}
 rl.question(q,a=>{rl.close();resolve(a);});});}
const accounts=[];
console.log('QadamX: создание учётных записей для сайта. Нужен хотя бы один admin.\nОставьте логин пустым, чтобы закончить.\n');
while(true){
 const login=(await ask('Логин (латиница, напр. a.seitkali): ')).trim().toLowerCase();
 if(!login){if(accounts.some(a=>a.role==='admin'))break;console.log('  Добавьте хотя бы одного администратора (роль admin).');continue;}
 if(!/^[a-z][a-z0-9_.-]{2,31}$/.test(login)||accounts.some(a=>a.login===login)){console.log('  Логин: 3–32 символа, латиница/цифры/._-, без повторов.');continue;}
 let role='';while(!ROLES.includes(role))role=(await ask(`Роль (${ROLES.join(' / ')}): `)).trim().toLowerCase();
 const name=(await ask('Имя и фамилия: ')).trim()||login;
 let password='';
 while(true){password=await ask('Пароль (от 10 символов, буквы и цифры): ',{hidden:true});
  if(password.length<10||!/[A-Za-zА-Яа-я]/.test(password)||!/\d/.test(password)){console.log('  Слишком простой пароль.');continue;}
  const again=await ask('Повторите пароль: ',{hidden:true});if(again!==password){console.log('  Пароли не совпали.');continue;}break;}
 const salt=randomBytes(16);
 accounts.push({login,role,name,version:1,salt:salt.toString('base64url'),hash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')});
 console.log(`  ✓ ${login} (${role}) добавлен.\n`);
}
console.log(`\nЗагружаю ${accounts.length} учётных записей в секрет QADAMX_ACCOUNTS…`);
const r=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['wrangler','secret','put','QADAMX_ACCOUNTS'],{input:JSON.stringify(accounts),stdio:['pipe','inherit','inherit'],shell:process.platform==='win32'});
process.exit(r.status??1);
