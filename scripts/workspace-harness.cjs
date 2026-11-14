const fs=require('node:fs'),vm=require('node:vm');
function render(role,lang='ru',storageOverrides={}){
 const events={};
 const elements={'#app':{innerHTML:''},'.skip':{textContent:''},'#toast':{textContent:'',style:{}}};
 const local={getItem:k=>k==='qadamx.language'?lang:(storageOverrides[k]||null),setItem:()=>{}};
 const context={fetch:async()=>({ok:true,status:200,json:async()=>({documents:[],assignments:[],notifications:[],requests:[],accounts:[]})}),console,structuredClone,Set,Date,Intl,TextEncoder,setTimeout:()=>0,clearTimeout:()=>{},clearInterval:()=>{},setInterval:()=>{},location:{replace:()=>{}},localStorage:local,document:{documentElement:{},querySelector:s=>elements[s]||null,addEventListener:(name,fn)=>(events[name]??=[]).push(fn),querySelectorAll:()=>[],getElementById:id=>elements['#'+id]||null,title:''}};
 context.navigator={hardwareConcurrency:8};context.window=context;context.QADAM_SESSION={login:role,role};context.addEventListener=(name,fn)=>(events[name]??=[]).push(fn);context.scrollTo=()=>{};
 vm.createContext(context);for(const name of ['data.js','i18n.js','core.js','dashboards.js','app.js','integrations.js','server-client.js','server-study.js','templates.js','avatars.js','evaluation.js','features.js','heart3d.js'])vm.runInContext(fs.readFileSync('web/'+name,'utf8'),context,{filename:name});
 return {context,elements,events,dispatch:async(name,event)=>{for(const fn of events[name]||[])await fn(event);},html:()=>elements['#app'].innerHTML};
}
module.exports={render};
