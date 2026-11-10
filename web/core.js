(function(root){
 'use strict';
 const roles={doctor:['home','library','editor','documents','requests','assignments','notifications','integrations','sources','settings'],mentor:['home','practice','review','notifications','integrations','sources','settings'],student:['home','practice','library','editor','documents','notifications','integrations','sources','settings'],patient:['home','requests','documents','sources','settings'],admin:['home','analytics','sources','settings']};
 function canEdit(role){return ['doctor','student'].includes(role)}
 function transition(role,from,to){
  if(to==='review')return canEdit(role)&&['draft','returned'].includes(from);
  if(to==='approved'||to==='returned')return role==='doctor'&&from==='review';
  return false;
 }
 function financial(price=29000,variable=12000,fixed=600000){
  const scenarios={cautious:[0,0,0,5,5,10,10,15,15,20,20,25],base:[0,0,5,10,15,20,25,30,35,40,45,50],growth:[0,0,10,20,30,40,50,60,70,80,90,100]};
  return Object.entries(scenarios).map(([name,seats])=>{const months=seats.reduce((a,b)=>a+b,0);return {name,seats,revenue:months*price,cost:months*variable+fixed*12,result:months*(price-variable)-fixed*12,breakEven:price>variable?Math.ceil(fixed/(price-variable)):null}});
 }
 function parseStudyFile(data,validIds){
  if(!data||data.schema!=='qadamx.study.v1'||!['submission','feedback'].includes(data.kind))throw Error('format');
  if(!validIds.includes(data.sourceId)||typeof data.requestId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(data.requestId))throw Error('source');
  if(typeof data.student!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(data.student))throw Error('student');
  if(!Number.isInteger(data.version)||data.version<1||data.version>10000)throw Error('version');
  if(data.kind==='submission'){
   if(typeof data.text!=='string'||!data.text.trim()||data.text.length>60000)throw Error('text');
   return {schema:data.schema,kind:data.kind,sourceId:data.sourceId,requestId:data.requestId,student:data.student,version:data.version,text:data.text,at:typeof data.at==='string'?data.at:''};
  }
  if(!['approved','returned'].includes(data.status)||typeof data.comment!=='string'||!data.comment.trim()||data.comment.length>5000)throw Error('feedback');
  return {schema:data.schema,kind:data.kind,sourceId:data.sourceId,requestId:data.requestId,student:data.student,version:data.version,status:data.status,comment:data.comment};
 }
 function matchesFeedback(doc,feedback,login){return !!doc&&feedback.kind==='feedback'&&feedback.student===login&&doc.status==='review'&&doc.submission?.requestId===feedback.requestId&&doc.submission?.version===feedback.version;}
 const api={roles,canEdit,transition,financial,parseStudyFile,matchesFeedback};root.QCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
