const assert=require('node:assert/strict'),vm=require('node:vm');
const {render}=require('./workspace-harness.cjs');
let count=0;
const run=(x,s)=>vm.runInContext(s,x.context);
const settle=()=>new Promise(r=>setImmediate(r));
async function test(name,fn){await fn();count++;console.log('PASS '+name);}
const input=(x,key,value)=>x.dispatch('input',{target:{dataset:{pf:key},value}});
(async()=>{
 await test('Profile accepts immediate input, survives refresh and language changes, then saves',async()=>{
  const x=render('doctor');await settle();await run(x,"go('profile')");
  assert(run(x,'!!state.profileDraft'));await input(x,'name','Profile test');
  assert(run(x,'hasUnsaved()'));await run(x,'syncServer()');
  run(x,"state.lang='kk';render()");assert(x.html().includes('Profile test'));
  let sent;x.context.fetch=async(url,opts)=>{sent=JSON.parse(opts.body);return {ok:true,json:async()=>({profiles:[{login:'doctor',role:'doctor',...sent}]})};};
  assert(await run(x,'saveProfile()'));assert.equal(sent.name,'Profile test');assert(!run(x,'hasUnsaved()'));
 });
 await test('Profile changes prompt on navigation and warn before closing the tab',async()=>{
  const x=render('doctor');await settle();await run(x,"go('profile')");await input(x,'bio','Unsaved text');
  x.context.confirm=()=>false;assert.equal(await run(x,'checkpoint({leaving:true})'),false);
  assert.equal(run(x,'state.profileDraft.bio'),'Unsaved text');
  let prevented=false;await x.dispatch('beforeunload',{preventDefault(){prevented=true;}});assert(prevented);
  x.context.confirm=()=>true;assert(await run(x,'checkpoint({leaving:true})'));assert(!run(x,'hasUnsaved()'));
 });
 await test('Profile save retains edits made while the response is pending',async()=>{
  const x=render('doctor');await settle();await run(x,"go('profile')");await input(x,'name','Before');
  let release;x.context.fetch=()=>new Promise(r=>release=r);const saving=run(x,'saveProfile()');await settle();
  await input(x,'name','After');release({ok:true,json:async()=>({profiles:[]})});await saving;
  assert.equal(run(x,'state.profileDraft.name'),'After');assert(run(x,'hasUnsaved()'));
 });
 await test('New account fields survive redraws and are discarded only after confirmation',async()=>{
  const x=render('admin');await settle();await run(x,"go('users')");
  for(const [key,value]of Object.entries({name:'Test person',login:'test.user',role:'student',password:'Local-only-12345'}))await x.dispatch('input',{target:{dataset:{account:key},value}});
  run(x,'render()');assert(x.html().includes('Test person'));assert(x.html().includes('Local-only-12345'));assert(x.html().includes('value="student" selected'));
  assert(run(x,'hasUnsaved()'));x.context.confirm=()=>true;assert(await run(x,'checkpoint({leaving:true})'));assert.equal(run(x,'Object.keys(state.accountDraft).length'),0);
 });
 await test('Kazakh administrator, analytics and evaluation labels do not fall back to Russian',async()=>{
  for(const role of ['admin','doctor','student','mentor']){
   const x=render(role,'kk');await settle();
   run(x,'state.metrics=[]');
   const pages=role==='admin'?['home','users','audit','leads','evaluation']:role==='doctor'?['analytics','evaluation']:['progress','evaluation'];
   for(const page of pages){await run(x,'go('+JSON.stringify(page)+')');for(const ru of ['Платформа под контролем.','АДМИНИСТРИРОВАНИЕ','Учётных записей','Все роли','Активные и отключённые','Событий в журнале','Учебных записей','Последний балл','Медиана времени','Случаев в оценке','Без пересечений с обучением','Слов в эталоне','Пока не запускалось'])assert(!x.html().includes(ru),role+' '+page+' contains '+ru);}
  }
 });
 await test('Integration and settings status follows server configuration independently of speech recognition',async()=>{
  const x=render('doctor');await settle();
  run(x,"state.aiStatus={available:true,model:'test-model'};state.page='integrations';render()");assert(x.html().includes('Настроено'));assert(x.html().includes('Распознавание речи пока не подключено'));
  assert(!x.html().includes('текст AI не генерируется'));
  run(x,"state.page='settings';render()");assert(x.html().includes('Настроено'));
  run(x,"state.aiStatus={available:false};render()");assert(!x.html().includes('Настроено'));
 });
 await test('Legacy unknown templates remain readable and citation metadata cannot inject markup',async()=>{
  const x=render('doctor');await settle();
  run(x,"state.docs[state.selected]={sourceId:state.selected,template:'old-template',text:'Preserved legacy note',revision:1,status:'draft',fields:{}};state.page='editor';state.form=null;render()");
  assert(x.html().includes('Preserved legacy note'));assert(!x.html().includes('Не удалось показать раздел'));
  run(x,"state.form.values.note__src='1,<img src=x>,999999,1'");const chips=run(x,"citeChips('note')");assert(!chips.includes('<img'));assert(!chips.includes('999999'));assert.equal((chips.match(/data-cite=/g)||[]).length,1);
 });
 await test('An open mobile menu survives background refresh and closes on navigation',async()=>{
  const x=render('doctor');await settle();run(x,'state.menuOpen=true;render()');await run(x,'syncServer()');
  assert(x.html().includes('class="sidebar open"'));assert(x.html().includes('aria-expanded="true"'));
  await run(x,"go('profile')");assert(!x.html().includes('class="sidebar open"'));
 });
 await test('Kazakh document options, exports and duration units use the selected language',async()=>{
  const x=render('doctor','kk');await settle();
  const out=run(x,"QTemplates.toText('referral',{sex:'ж',urgency:'плановое'},'kk')");assert(out.includes('Әйел'));assert(out.includes('Жоспарлы'));assert(!out.includes('плановое'));
  assert.equal(run(x,'fmtMs(3600000)'),'1 сағ 0 мин');
 });
 console.log(count+' review UI checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
