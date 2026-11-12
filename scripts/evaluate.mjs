// Offline evaluation on the clean held-out set (research/evaluation-clean.json).
// Writes only aggregate numbers to web/evaluation.js; no held-out text reaches the web bundle.
// Usage: npm run evaluate            → baselines only
//        ANTHROPIC_API_KEY=… npm run evaluate -- --ai 50   → also AI drafts on 50 cases (billed)
import {readFile,writeFile} from 'node:fs/promises';
const rows=JSON.parse(await readFile(new URL('../research/evaluation-clean.json',import.meta.url),'utf8'));
const tok=s=>String(s).toLowerCase().replace(/\[(doctor|patient|[a-z_ ]+)\]/g,' ').match(/[a-z0-9]+(?:[.'][a-z0-9]+)*/g)||[];
function f1(p,r){return p+r?2*p*r/(p+r):0;}
function rouge1(a,b){const ca=new Map();for(const w of a)ca.set(w,(ca.get(w)||0)+1);let o=0;const cb=new Map();for(const w of b)cb.set(w,(cb.get(w)||0)+1);for(const [w,n] of cb)o+=Math.min(n,ca.get(w)||0);return f1(a.length?o/a.length:0,b.length?o/b.length:0);}
function lcs(a,b){if(!a.length||!b.length)return 0;let prev=new Uint16Array(b.length+1),cur=new Uint16Array(b.length+1);for(let i=1;i<=a.length;i++){for(let j=1;j<=b.length;j++)cur[j]=a[i-1]===b[j-1]?prev[j-1]+1:Math.max(prev[j],cur[j-1]);[prev,cur]=[cur,prev];}return prev[b.length];}
function rougeL(a,b){const l=lcs(a,b);return f1(a.length?l/a.length:0,b.length?l/b.length:0);}
const numbers=s=>new Set(String(s).match(/\d+(?:\.\d+)?/g)||[]);
const NEG=/\b(no|not|denies|denied|deny|without|negative|never|none)\b/i;
// ACI-BENCH lines look like "[doctor] text", MTS-Dialog lines like "Doctor: text".
const SPEAKER=/^\s*(?:\[([a-z_ ]+)\]|([A-Za-z_ ]{2,30}):)\s*/i;
const turns=(d,who)=>d.split(/\n+/).map(l=>[SPEAKER.exec(l),l]).filter(([m])=>m&&(m[1]||m[2]).toLowerCase().trim()===who).map(([m,l])=>l.slice(m[0].length)).join(' ');
function score(name,outputs){
 let r1=0,rl=0,numHit=0,numTotal=0,negHit=0,negTotal=0;const err={numbers:0,negation:0,verbose:0,speech:0};
 outputs.forEach(({row,out})=>{const a=tok(out),b=tok(row.reference);r1+=rouge1(a,b);rl+=rougeL(a.slice(0,3000),b.slice(0,3000));
  const rn=numbers(row.reference),on=numbers(out);if(rn.size){numTotal++;const hit=[...rn].filter(n=>on.has(n)).length/rn.size;numHit+=hit;if(hit<1)err.numbers++;}
  if(NEG.test(row.reference)){negTotal++;if(NEG.test(out))negHit++;else err.negation++;}
  if(a.length>2*b.length)err.verbose++;if(/\b(i|i'm|my|you)\b/i.test(out))err.speech++;});
 const n=outputs.length;return {name,n,rouge1:r1/n,rougeL:rl/n,numberRecall:numTotal?numHit/numTotal:0,negationRecall:negTotal?negHit/negTotal:0,err:Object.fromEntries(Object.entries(err).map(([k,v])=>[k,v/n]))};
}
const systems=[];
const patient=score('patient',rows.map(row=>({row,out:turns(row.dialogue,'patient')})));
systems.push({...patient,id:'patient',name:'Базовая линия: все реплики пациента',nameKk:'Базалық сызық: пациенттің барлық сөздері',note:'Без модели. Нижняя граница, с которой должен сравниваться AI.',noteKk:'Модельсіз. AI салыстырылатын төменгі шек.'});
const doctor=score('doctor',rows.map(row=>({row,out:turns(row.dialogue,'doctor')})));
systems.push({...doctor,id:'doctor',name:'Базовая линия: все реплики врача',nameKk:'Базалық сызық: дәрігердің барлық сөздері',note:'Без модели. Врач часто проговаривает осмотр и план.',noteKk:'Модельсіз. Дәрігер жиі тексеру мен жоспарды айтады.'});
const aiIndex=process.argv.indexOf('--ai');
if(aiIndex>0){
 const n=Number(process.argv[aiIndex+1]||20);if(!process.env.ANTHROPIC_API_KEY)throw Error('ANTHROPIC_API_KEY is required for --ai');
 const {draft,model}=await import('../worker/ai.mjs');
 const fields=[{key:'subjective',label:'Subjective: complaints and history'},{key:'objective',label:'Objective: exam and results'},{key:'assessment',label:'Assessment'},{key:'plan',label:'Plan'}];
 const sample=rows.filter((_,i)=>i%Math.max(1,Math.floor(rows.length/n))===0).slice(0,n),outs=[];
 for(const row of sample){try{const r=await draft({apiKey:process.env.ANTHROPIC_API_KEY,lines:row.dialogue.split(/\n+/).filter(Boolean),fields,language:'en'});outs.push({row,out:fields.map(f=>r.fields[f.key]?.text||'').join('\n')});process.stdout.write('.');}catch(e){console.error('\n'+row.id+': '+e.message);}}
 if(outs.length)systems.push({...score('ai',outs),id:'ai',name:'AI-черновик '+model,nameKk:'AI-жоба '+model,note:'SOAP-поля, английский вывод, выборка '+outs.length,noteKk:'SOAP өрістері, ағылшынша, іріктеме '+outs.length});
}
const words=rows.map(r=>tok(r.reference).length).sort((a,b)=>a-b);
const out={generatedAt:new Date().toISOString(),script:'scripts/evaluate.mjs',count:rows.length,byDataset:['ACI-BENCH','MTS-Dialog'].map(d=>({dataset:d,count:rows.filter(r=>r.dataset===d).length})),referenceWords:{median:words[Math.floor(words.length/2)],p90:words[Math.floor(words.length*.9)]},
 systems:systems.map(({err,...s})=>s),
 errors:[['numbers','Потеряны числа из эталона','Эталондағы сандар жоғалды'],['negation','Потеряны отрицания («нет», «отрицает»)','Терістеулер жоғалды'],['verbose','Текст в 2+ раза длиннее эталона','Мәтін эталоннан 2+ есе ұзын'],['speech','Остался разговорный стиль (я, вы)','Сөйлеу стилі қалды (мен, сіз)']].map(([k,label,labelKk])=>({key:k,label,labelKk,share:patient.err[k]}))};
await writeFile(new URL('../web/evaluation.js',import.meta.url),'window.QADAM_EVAL = '+JSON.stringify(out)+';\n');
console.log(`\nEvaluated ${rows.length} cases:`,out.systems.map(s=>`${s.id} R-L ${(s.rougeL*100).toFixed(1)}%`).join(', '));
