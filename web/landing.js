'use strict';
// Landing page: 2-minute animated walkthrough, public team list, pilot request form.
(function(){
 const L=(ru,kk)=>tr(ru,kk);
 const steps=[
  {t:['Учебный случай','Оқу жағдайы'],html:()=>`<div class="ts-list">${['D2N014 · ACI-BENCH','D2N015 · ACI-BENCH','MTS 0412 · HPI'].map((x,i)=>`<div class="ts-row ${i===0?'on':''}"><span>${x}</span><b>${L('Открыть →','Ашу →')}</b></div>`).join('')}</div>`},
  {t:['Шаблон документа','Құжат үлгісі'],html:()=>`<div class="ts-tpl">${[['✚','Консультация','Консультация'],['◧','SOAP','SOAP'],['▤','Выписка','Үзінді'],['➚','Направление','Жолдама']].map(([i,r,k],n)=>`<div class="${n===0?'on':''}"><span>${i}</span>${L(r,k)}</div>`).join('')}</div><p class="ts-note">${L('Дата, № карты и врач подставлены автоматически','Күн, карта № және дәрігер автоматты түрде қойылды')}</p>`},
  {t:['Цитаты в поля','Өрістердегі дәйексөздер'],html:()=>`<div class="ts-split"><div><p class="frag hl">2 · Patient: chest pain for three days</p><p class="frag">3 · Doctor: any shortness of breath?</p><p class="frag hl">4 · Patient: no.</p></div><div><small>${L('ЖАЛОБЫ','ШАҒЫМДАРЫ')}</small><p class="fld">${L('Боль в груди 3 дня','Кеудедегі ауырсыну 3 күн')} <b>2</b></p><small>${L('ОСМОТР','ТЕКСЕРУ')}</small><p class="fld">${L('Одышку отрицает','Ентігуді жоққа шығарады')} <b>4</b></p></div></div>`},
  {t:['Проверка','Тексеру'],html:()=>`<div class="ts-checks">${[['Случай сверён','Жағдай салыстырылды'],['Числа и отрицания проверены','Сандар мен терістеулер тексерілді'],['Выводы опираются на источник','Қорытындылар дереккөзге сүйенеді']].map(([r,k])=>`<p>✓ ${L(r,k)}</p>`).join('')}<span class="ts-badge">${L('Утверждено в демо','Демода бекітілді')}</span></div>`},
  {t:['PDF и Word','PDF және Word'],html:()=>`<div class="ts-paper"><div class="ts-head"><b>Q</b> QadamX MedTech<span>№ QX-7F3A21</span></div><h4>${L('КОНСУЛЬТАТИВНОЕ ЗАКЛЮЧЕНИЕ','КОНСУЛЬТАЦИЯЛЫҚ ҚОРЫТЫНДЫ')}</h4><i></i><i></i><i class="s"></i><div class="ts-sign">${L('Врач','Дәрігер')} ________ <em>${L('учебный','оқу')}</em></div></div>`}
 ];
 const per=24000;let t0=Date.now(),paused=false,pausedAt=0,last=-1;
 const screen=document.querySelector('#tour-screen'),bar=document.querySelector('#tour-bar'),clock=document.querySelector('#tour-clock'),toggle=document.querySelector('#tour-toggle');
 const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function draw(force){const el=(paused?pausedAt:Date.now())-t0,total=steps.length*per,pos=el%total,i=Math.floor(pos/per);
  if(i!==last||force){last=i;screen.innerHTML=`<div class="ts-title"><span>${i+1}/5</span>${L(...steps[i].t)}</div>`+steps[i].html();document.querySelectorAll('#tour-list li').forEach((li,n)=>li.classList.toggle('active',n===i));}
  bar.style.width=(pos/total*100)+'%';const s=Math.floor(pos/1000);clock.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
 if(screen){if(reduce){paused=true;pausedAt=t0;toggle.textContent=L('Смотреть','Көру');toggle.dataset.ru='Смотреть';toggle.dataset.kk='Көру';}draw(true);setInterval(()=>{if(!paused)draw(false)},250);
  document.querySelectorAll('#tour-list li').forEach(li=>{li.tabIndex=0;const go=()=>{const i=Number(li.dataset.step);t0=(paused?pausedAt:Date.now())-i*per;draw(true);};li.addEventListener('click',go);li.addEventListener('keydown',e=>{if(e.key==='Enter')go();});});
  toggle.addEventListener('click',()=>{if(paused){t0+=Date.now()-pausedAt;paused=false;toggle.dataset.ru='Пауза';toggle.dataset.kk='Үзіліс';}else{paused=true;pausedAt=Date.now();toggle.dataset.ru='Продолжить';toggle.dataset.kk='Жалғастыру';}toggle.textContent=L(toggle.dataset.ru,toggle.dataset.kk);});
  document.querySelector('[data-language]').addEventListener('click',()=>draw(true));}
 // Team
 const roleName=r=>r==='mentor'?L('Наставник','Тәлімгер'):L('Врач','Дәрігер');
 async function team(){const box=document.querySelector('#land-team');if(!box)return;let list=[];try{const r=await fetch('/api/public/team');if(r.ok)list=(await r.json()).team||[];}catch{}
  box.replaceChildren();if(!list.length){const p=document.createElement('p');p.className='muted';p.textContent=L('Профили появятся после регистрации наставников.','Тәлімгерлер тіркелгеннен кейін профильдер пайда болады.');box.append(p);return;}
  for(const m of list){const card=document.createElement('article');card.className='land-person';const img=document.createElement('img');img.alt='';img.src=m.photo||QAvatars.url(m.seed||m.name);const b=document.createElement('span');b.className='person-role';b.textContent=roleName(m.role);const h=document.createElement('h3');h.textContent=m.name;const ti=document.createElement('p');ti.className='person-title';ti.textContent=[m.title,m.specialty].filter(Boolean).join(' · ');const bio=document.createElement('p');bio.className='muted';bio.textContent=m.bio||'';card.append(img,b,h,ti,bio);box.append(card);}}
 team();
 // Pilot
 const form=document.querySelector('#pilot-form');let sending=false;
 form?.addEventListener('submit',async e=>{e.preventDefault();if(sending)return;const st=document.querySelector('#pilot-status'),btn=form.querySelector('button[type=submit]');sending=true;btn.disabled=true;st.textContent='';
  const v=id=>document.querySelector(id).value.trim();
  try{const r=await fetch('/api/pilot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:v('#pl-name'),role:v('#pl-role'),organization:v('#pl-org'),contact:v('#pl-contact'),city:v('#pl-city'),message:v('#pl-msg'),consent:document.querySelector('#pl-consent').checked})});
   if(r.ok){form.reset();st.className='small ok';st.textContent=L('Спасибо! Заявка получена, мы свяжемся с вами.','Рақмет! Өтінім қабылданды, біз сізбен хабарласамыз.');}
   else{st.className='small error';st.textContent=r.status===429?L('Слишком много заявок. Повторите позже.','Өтінім тым көп. Кейінірек қайталаңыз.'):L('Проверьте поля и согласие.','Өрістер мен келісімді тексеріңіз.');}}
  catch{st.className='small error';st.textContent=L('Нет связи с сервером.','Сервермен байланыс жоқ.');}finally{sending=false;btn.disabled=false;}});
})();
