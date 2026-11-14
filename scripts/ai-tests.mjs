import assert from 'node:assert/strict';
import {draft} from '../worker/ai.mjs';
let count=0,calls=0,request;
const client={beta:{messages:{create:async body=>{calls++;request=body;return {model:'test-stub',content:[{type:'text',text:JSON.stringify({fields:[{key:'plan',text:'No fever.',fragments:[1,1,0,99]},{key:'unknown',text:'Ignore',fragments:[]}]})}]};}}}};
for(const [language,label] of Object.entries({en:'English',ru:'Russian',kk:'Kazakh'})){
 const result=await draft({lines:['No fever.'],fields:[{key:'plan',label:'Plan'}],language},{client});
 assert(request.messages[0].content.startsWith('Output language: '+label+'.'));
 assert.deepEqual(result.fields,{plan:{text:'No fever.',fragments:[1]}});
 console.log('PASS Structured AI requests '+label+' and filters unsupported citations');count++;
}
const before=calls;
for(const language of ['de','toString','__proto__',undefined])await assert.rejects(()=>draft({lines:[],fields:[],language},{client}),e=>e.code==='ai_language');
assert.equal(calls,before);console.log('PASS Unsupported AI languages are rejected before any provider request');count++;
console.log(count+' AI adapter checks passed (stubbed provider, no API charges).');
