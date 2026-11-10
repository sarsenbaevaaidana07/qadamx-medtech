'use strict';
document.addEventListener('input',e=>{if(e.target.id==='mentor-comment')state.mentorComment=e.target.value});
document.addEventListener('change',e=>{if(e.target.id==='review-filter'){state.reviewFilter=e.target.value;render()}if(e.target.dataset.mentorCheck!==undefined)state.mentorChecks[Number(e.target.dataset.mentorCheck)]=e.target.checked});
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.reviewOpen&&state.role==='mentor'){if(!await checkpoint({leaving:state.page==='review'&&state.reviewId!==b.dataset.reviewOpen}))return;state.reviewId=b.dataset.reviewOpen;state.mentorChecks=[false,false,false];state.mentorComment='';go('review');return}
 if(b.dataset.mentorDecision&&state.role==='mentor'){
  const r=state.reviews[state.reviewId];if(!r||r.status!=='review')return;
  const ok=await operation(async()=>{const result=await api('/api/documents/'+encodeURIComponent(r.id)+'/action',{action:b.dataset.mentorDecision==='approved'?'approve':'return',expectedRevision:r.revision,comment:state.mentorComment.trim(),checks:state.mentorChecks});state.mentorComment='';state.reviews[r.id]={...result.document,requestId:r.id,student:r.owner,version:result.document.revision};await syncServer(false);render();toast(t('Отзыв сохранён. Студент получил уведомление.'));});
 }
 if(b.dataset.action==='recall-study')await changeDocument('recall');
 if(b.dataset.action==='restore-draft'&&$('#draft')){$('#draft').value=documentFor()?.text||'';toast(t('Восстановлена сохранённая версия.'));}
});
