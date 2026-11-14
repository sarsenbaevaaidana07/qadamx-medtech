const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../web/core.js');let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name)}
const sourceId='ACI-BENCH/train/D2N001';
const submission={schema:'qadamx.study.v1',kind:'submission',sourceId,requestId:'12345678-1234-5678-1234-123456789012',student:'student',version:2,text:'A synthetic teaching draft.',at:'2026-11-10T00:00:00Z'};
const feedback={...submission,kind:'feedback',status:'returned',comment:'Please clarify the source.'};
test('Study file preserves text but strips unexpected fields',()=>{const p=core.parseStudyFile({...submission,role:'doctor',admin:true},[sourceId]);assert.equal(p.text,submission.text);assert(!('admin'in p));assert(!('role'in p))});
test('Unknown sources and malformed files are rejected',()=>{for(const v of [null,{}, {...submission,sourceId:'unknown'},{...submission,text:''},{...submission,student:'<script>'},{...submission,version:-1}])assert.throws(()=>core.parseStudyFile(v,[sourceId]))});
test('Feedback requires a comment and a permitted result',()=>{assert.equal(core.parseStudyFile(feedback,[sourceId]).status,'returned');assert.throws(()=>core.parseStudyFile({...feedback,comment:''},[sourceId]));assert.throws(()=>core.parseStudyFile({...feedback,status:'prescribed'},[sourceId]))});
test('Feedback cannot overwrite another student or revision',()=>{const doc={status:'review',submission:{requestId:submission.requestId,version:2}};assert(core.matchesFeedback(doc,feedback,'student'));assert(!core.matchesFeedback(doc,feedback,'other'));assert(!core.matchesFeedback(doc,{...feedback,version:3},'student'));assert(!core.matchesFeedback({...doc,status:'draft'},feedback,'student'));assert(!core.matchesFeedback(doc,{...feedback,requestId:'different'},'student'))});
test('Mentor reviews education, not clinical documents',()=>{assert(!core.canEdit('mentor'));assert(!core.transition('mentor','review','approved'));assert(!core.roles.mentor.includes('editor'));assert(core.roles.mentor.includes('review'));assert(!core.roles.student.includes('review'));assert(!core.roles.doctor.includes('practice'))});
const {render}=require('./workspace-harness.cjs');
test('Each role opens a distinct operational dashboard',()=>{const d=render('doctor').html(),s=render('student').html(),m=render('mentor').html();assert(d.includes('Продолжить приём'));assert(!s.includes('Продолжить приём'));assert(s.includes('Мои задания'));assert(m.includes('Очередь проверки'));assert(!m.includes('Начать учебный приём'));assert(!s.includes('Утвердить в демо'));assert(!d.includes('Экономика на 12 месяцев'))});
test('Kazakh dashboard contains role-specific translated labels',()=>{for(const [role,title,action]of [['doctor','Дәрігер кабинеті','Оқу мақсатындағы қабылдауды бастау'],['student','Студент кабинеті','Менің тапсырмаларым'],['mentor','Тәлімгер кабинеті','Тексеру кезегі']]){const x=render(role,'kk');assert(x.html().includes(title));assert(x.html().includes(action));assert(!x.html().includes('Кабинет врача'));assert.equal(x.context.document.documentElement.lang,'kk')}});

test('Invalid saved data cannot crash dashboard startup',()=>{assert(render('doctor','ru',{'qadamx.research.v2.doctor':'null'}).html().includes('Кабинет врача'));assert(render('student','kk',{'qadamx.research.v2.student':'{"docs":{"bad":{"text":null}},"reviews":{"bad":{}}}'}).html().includes('Студент кабинеті'))});
test('Language choice is shared with public login pages',()=>{const x=render('student','kk',{'qadamx.research.v2.student':'{"lang":"ru"}'});assert.equal(x.context.document.documentElement.lang,'kk')});
test('Kazakh interface leaves original clinical dialogue untouched',()=>{const x=render('student','kk');const source=x.context.QADAM_DATA[0].dialogue;vm.runInContext("go('editor')",x.context);assert(x.html().includes('lang="en"'));assert.equal(x.context.QADAM_DATA[0].dialogue,source)});
// Regression: while /api/metrics is still loading, the metrics pages must not re-render in a
// loop (a render → load → render microtask loop froze phones before the response arrived).
(async()=>{
 for(const role of ['doctor','student','mentor','admin'])for(const lang of ['ru','kk']){
  const x=render(role,lang);await new Promise(r=>setImmediate(r));
  for(const page of core.roles[role]){await vm.runInContext('go('+JSON.stringify(page)+')',x.context);assert(x.html().length>600,role+' '+lang+' '+page);assert(!x.html().includes('Не удалось показать раздел')&&!x.html().includes('Бөлімді көрсету мүмкін болмады'),role+' '+lang+' '+page);}
 }
 count++;console.log('PASS Every reachable page renders for all four roles in both languages');

 for(const [role,page] of [['doctor','analytics'],['mentor','progress'],['student','progress']]){
  const x=render(role);
  x.context.fetch=async url=>String(url).includes('/api/metrics')?new Promise(()=>{}):{ok:true,status:200,json:async()=>({documents:[],assignments:[],notifications:[],requests:[],accounts:[],profiles:[]})};
  vm.runInContext("var __renders=0;var __base=render;render=function(){if(++__renders>50)throw Error('render loop');return __base.apply(this,arguments)};",x.context);
  vm.runInContext('go('+JSON.stringify(page)+')',x.context);
  for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
  const n=vm.runInContext('__renders',x.context);
  assert(n<10,role+' '+page+' rendered '+n+' times while loading');
  assert(x.html().includes('Загрузка'),role+' '+page+' shows a loading state');
 }
 count++;console.log('PASS Metrics pages wait for data without a render loop');
 console.log(count+' workspace checks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
