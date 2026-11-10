'use strict';
function exportSubmission(id){const d=state.docs[id];if(state.role!=='student'||!d?.submission)return;download('QadamX-study-'+d.submission.requestId+'.json',JSON.stringify({schema:'qadamx.study.v1',kind:'submission',sourceId:id,requestId:d.submission.requestId,version:d.submission.version,student:SESSION.login,text:d.text,at:d.updated},null,2),'application/json');}
function exportFeedback(id){const r=state.reviews[id];if(state.role!=='mentor'||!r||!['approved','returned'].includes(r.status))return;download('QadamX-feedback-'+r.requestId+'.json',JSON.stringify({schema:'qadamx.study.v1',kind:'feedback',sourceId:r.sourceId,requestId:r.requestId,version:r.version,student:r.student,status:r.status,comment:r.comment},null,2),'application/json');}
function storeChange(change){const before={docs:structuredClone(state.docs),reviews:structuredClone(state.reviews),events:structuredClone(state.events)};change();if(persist())return true;Object.assign(state,before);return false;}
document.addEventListener('change',async e=>{
 if(e.target.id==='review-filter'){state.reviewFilter=e.target.value;render();return;}
 if(e.target.dataset.mentorCheck!==undefined){state.mentorChecks[Number(e.target.dataset.mentorCheck)]=e.target.checked;return;}
 const kind=e.target.dataset.studyImport;if(!kind)return;const file=e.target.files?.[0];if(!file)return;
 if(!((state.role==='mentor'&&kind==='submission')||(state.role==='student'&&kind==='feedback')))return;
 try{
  if(file.size>256000)throw Error('size');const data=QCore.parseStudyFile(JSON.parse(await file.text()),DATA.map(r=>r.id));if(data.kind!==kind)throw Error('kind');
  if(kind==='submission'){
   const old=state.reviews[data.requestId];if(old&&(old.text!==data.text||old.student!==data.student||old.sourceId!==data.sourceId||old.version!==data.version))throw Error('conflict');
   if(!old&&!storeChange(()=>{state.reviews[data.requestId]={...data,status:'review',comment:'',imported:new Date().toISOString()}}))return;
   state.reviewId=data.requestId;state.mentorChecks=[false,false,false];state.mentorComment='';go('review');toast(t(old?'Эта работа уже загружена.':'Работа загружена для учебной проверки.'));
  }else{
   const d=state.docs[data.sourceId];if(!QCore.matchesFeedback(d,data,SESSION.login))throw Error('stale');
   if(!storeChange(()=>{d.status=data.status;d.comment=data.comment;d.updated=new Date().toISOString();d.versions.push({text:d.text,at:d.updated,role:'mentor',status:d.status,comment:d.comment});}))return;
   render();toast(t('Отзыв применён к отправленной версии.'));
  }
 }catch{toast(t('Файл не подходит: проверьте формат, автора и версию работы.'))}finally{e.target.value='';}
});
document.addEventListener('input',e=>{if(e.target.id==='mentor-comment')state.mentorComment=e.target.value;});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.reviewOpen&&state.role==='mentor'){state.reviewId=b.dataset.reviewOpen;state.mentorChecks=[false,false,false];state.mentorComment='';go('review');return;}
 if(b.dataset.submissionExport){exportSubmission(b.dataset.submissionExport);return;}
 if(b.dataset.feedbackExport){exportFeedback(b.dataset.feedbackExport);return;}
 if(b.dataset.mentorDecision&&state.role==='mentor'){
  const r=state.reviews[state.reviewId],status=b.dataset.mentorDecision;if(!r||r.status!=='review'||!['approved','returned'].includes(status))return;
  const comment=state.mentorComment.trim();if(!comment){toast(t('Добавьте понятный комментарий студенту.'));return;}
  if(status==='approved'&&!state.mentorChecks.every(Boolean)){toast(t('Проверьте все три критерия перед зачётом.'));return;}
  if(!storeChange(()=>{r.status=status;r.comment=comment;r.updated=new Date().toISOString()}))return;
  render();toast(t('Результат сохранён. Скачайте отзыв и передайте студенту.'));
 }
 if(b.dataset.action==='recall-study'&&state.role==='student'){const d=documentFor();if(d?.status!=='review')return;if(!storeChange(()=>{d.status='draft';delete d.submission;}))return;render();toast(t('Работа снова доступна для редактирования. Старый файл отзыва больше не подойдёт.'));}
 if(b.dataset.action==='restore-draft'){const d=documentFor();if($('#draft'))$('#draft').value=d?.text||'';toast(t('Восстановлена сохранённая версия.'));}
});
