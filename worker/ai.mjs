// Bundled by scripts/build.mjs into the Worker as the global QadamAI.
// Draft = structured fields where every statement cites dialogue fragment numbers.
import Anthropic from '@anthropic-ai/sdk';
const MODEL='claude-opus-5-5';
const SYSTEM=`You help clinicians and medical students prepare a DRAFT medical record from a doctor–patient dialogue.
Rules:
- Use only facts stated in the dialogue. Never invent findings, numbers, diagnoses or plans.
- If a field has no support in the dialogue, return an empty text and an empty fragment list.
- Keep negations, numbers, units and who said what exactly as in the source.
- Every field lists the fragment numbers (1-based, as given in brackets) that support it.
- Write field text in the requested output language; keep drug names and measurements as stated.
- This is a draft for human review, not a final medical decision.`;
export async function draft({apiKey,lines,fields,language},{client:providedClient}={}){
 const languages={en:'English',ru:'Russian',kk:'Kazakh'};
 if(!Object.hasOwn(languages,language))throw Object.assign(Error('Unsupported output language'),{code:'ai_language'});
 const outputLanguage=languages[language];
 const client=providedClient||new Anthropic({apiKey,maxRetries:1,timeout:90000});
 const schema={type:'object',additionalProperties:false,required:['fields'],properties:{fields:{type:'array',items:{type:'object',additionalProperties:false,required:['key','text','fragments'],properties:{key:{type:'string',enum:fields.map(f=>f.key)},text:{type:'string'},fragments:{type:'array',items:{type:'integer'}}}}}}};
 const dialogue=lines.map((l,i)=>`[${i+1}] ${l}`).join('\n');
 const spec=fields.map(f=>`- ${f.key}: ${f.label}${f.hint?' — '+f.hint:''}`).join('\n');
 const response=await client.beta.messages.create({
  model:MODEL,max_tokens:16000,
  betas:['server-side-fallback-2026-07-01'],fallbacks:'default',
  output_config:{effort:'medium',format:{type:'json_schema',schema}},
  system:SYSTEM,
  messages:[{role:'user',content:`Output language: ${outputLanguage}.\n\nFields to fill:\n${spec}\n\nDialogue fragments:\n${dialogue}`}]
 });
 if(response.stop_reason==='refusal')throw Object.assign(Error('refusal'),{publicMessage:'AI отказался обрабатывать этот текст. Заполните запись вручную.',code:'ai_refusal'});
 if(response.stop_reason==='max_tokens')throw Object.assign(Error('truncated'),{publicMessage:'Ответ AI оказался слишком длинным. Попробуйте шаблон с меньшим числом полей.',code:'ai_truncated'});
 const text=response.content.filter(b=>b.type==='text').map(b=>b.text).join('');
 let parsed;try{parsed=JSON.parse(text)}catch{throw Object.assign(Error('parse'),{publicMessage:'AI вернул ответ в неверном формате. Повторите.',code:'ai_format'})}
 const allowed=new Set(fields.map(f=>f.key)),out={};
 for(const f of parsed.fields||[]){if(!allowed.has(f.key)||typeof f.text!=='string')continue;out[f.key]={text:f.text.slice(0,8000),fragments:[...new Set((f.fragments||[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=lines.length))].sort((a,b)=>a-b)};}
 return {model:response.model||MODEL,fields:out};
}
export const model=MODEL;
