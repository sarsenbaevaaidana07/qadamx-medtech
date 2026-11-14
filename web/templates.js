/* QadamX document templates: structured fields → plain text, printable page and Word file.
 * All exports are marked as training documents without legal force. */
'use strict';
(function(root){
 const P=[
  {key:'patient_name',label:['ФИО пациента','Пациенттің аты-жөні'],type:'text',half:true,placeholder:['Учебный пациент','Оқу пациенті'],patient:true},
  {key:'birth_date',label:['Дата рождения','Туған күні'],type:'date',quarter:true,patient:true},
  {key:'sex',label:['Пол','Жынысы'],type:'select',quarter:true,options:[['','—'],['ж',['Женский','Әйел']],['м',['Мужской','Ер']]],patient:true},
  {key:'card_no',label:['№ медкарты','Медкарта №'],type:'text',quarter:true,placeholder:['Авто','Авто'],patient:true}
 ];
 const VITALS={key:'vitals',label:['Показатели','Көрсеткіштер'],type:'vitals',parts:[['bp','АД, мм рт. ст.','120/80'],['hr','ЧСС, уд/мин','72'],['temp','t°, °C','36.6'],['spo2','SpO₂, %','98'],['weight','Вес, кг','']]};
 const ICD={key:'icd',label:['Код МКБ-10','АХЖ-10 коды'],type:'text',quarter:true,placeholder:['например, J06.9','мысалы, J06.9']};
 const list={
  consult:{name:['Консультативное заключение','Консультациялық қорытынды'],short:['Консультация','Консультация'],icon:'✚',doc:['КОНСУЛЬТАТИВНОЕ ЗАКЛЮЧЕНИЕ','КОНСУЛЬТАЦИЯЛЫҚ ҚОРЫТЫНДЫ'],
   description:['Приём врача: жалобы, анамнез, осмотр, диагноз и план.','Дәрігер қабылдауы: шағымдар, анамнез, тексеру, диагноз және жоспар.'],
   fields:[...P,{key:'visit_date',label:['Дата приёма','Қабылдау күні'],type:'date',quarter:true,auto:'today'},
    {key:'complaints',label:['Жалобы','Шағымдары'],type:'area',rows:3,hint:['Причина обращения словами пациента','Пациенттің сөзімен келу себебі']},
    {key:'history',label:['Анамнез заболевания','Ауру анамнезі'],type:'area',rows:4,hint:['Начало, длительность, динамика, что принимал','Басталуы, ұзақтығы, динамикасы, не қабылдады']},
    {key:'life_history',label:['Анамнез жизни, аллергии, лекарства','Өмір анамнезі, аллергия, дәрілер'],type:'area',rows:2},
    VITALS,
    {key:'exam',label:['Объективный осмотр','Объективті тексеру'],type:'area',rows:4,hint:['Только озвученные результаты осмотра','Тек айтылған тексеру нәтижелері']},
    {key:'diagnosis',label:['Диагноз / заключение','Диагноз / қорытынды'],type:'area',rows:2,wide3:true},ICD,
    {key:'plan',label:['Рекомендации и план','Ұсыныстар мен жоспар'],type:'area',rows:4,hint:['Обследования, лечение, режим — как озвучил врач','Тексеру, ем, режим — дәрігер айтқандай']},
    {key:'follow_up',label:['Повторный приём','Қайта қабылдау'],type:'text',placeholder:['через 2 недели','2 аптадан кейін']}]},
  soap:{name:['SOAP-запись','SOAP-жазба'],short:['SOAP','SOAP'],icon:'◧',doc:['ЗАПИСЬ ПРИЁМА (SOAP)','ҚАБЫЛДАУ ЖАЗБАСЫ (SOAP)'],
   description:['Учебный формат: субъективно, объективно, оценка, план.','Оқу форматы: субъективті, объективті, бағалау, жоспар.'],
   fields:[...P,{key:'visit_date',label:['Дата приёма','Қабылдау күні'],type:'date',quarter:true,auto:'today'},
    {key:'subjective',label:['S — Субъективно','S — Субъективті'],type:'area',rows:4,hint:['Жалобы и история со слов пациента','Пациенттің айтуы бойынша шағымдар мен тарих']},
    {key:'objective',label:['O — Объективно','O — Объективті'],type:'area',rows:4,hint:['Осмотр, показатели, результаты анализов','Тексеру, көрсеткіштер, талдау нәтижелері']},VITALS,
    {key:'assessment',label:['A — Оценка','A — Бағалау'],type:'area',rows:3},ICD,
    {key:'plan',label:['P — План','P — Жоспар'],type:'area',rows:3}]},
  discharge:{name:['Выписка из медицинской карты','Медициналық картадан үзінді'],short:['Выписка','Үзінді'],icon:'▤',doc:['ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ','МЕДИЦИНАЛЫҚ КАРТАДАН ҮЗІНДІ'],
   description:['Период наблюдения, диагноз, лечение и рекомендации.','Бақылау кезеңі, диагноз, ем және ұсыныстар.'],
   fields:[...P,{key:'period_from',label:['Наблюдение с','Бақылау басталуы'],type:'date',quarter:true},{key:'period_to',label:['по','дейін'],type:'date',quarter:true,auto:'today'},
    {key:'diagnosis',label:['Основной диагноз','Негізгі диагноз'],type:'area',rows:2,wide3:true},ICD,
    {key:'course',label:['Течение и проведённое лечение','Ағымы және жүргізілген ем'],type:'area',rows:4},
    {key:'results',label:['Результаты обследований','Тексеру нәтижелері'],type:'area',rows:3},
    {key:'condition',label:['Состояние на момент выписки','Шығару кезіндегі жағдайы'],type:'area',rows:2},
    {key:'plan',label:['Рекомендации','Ұсыныстар'],type:'area',rows:4}]},
  referral:{name:['Направление','Жолдама'],short:['Направление','Жолдама'],icon:'➚',doc:['НАПРАВЛЕНИЕ','ЖОЛДАМА'],
   description:['К специалисту или на обследование.','Маманға немесе тексеруге.'],
   fields:[...P,{key:'visit_date',label:['Дата','Күні'],type:'date',quarter:true,auto:'today'},
    {key:'referred_to',label:['Куда / к какому специалисту','Қайда / қандай маманға'],type:'text',half:true,placeholder:['Кардиолог, ЭКГ, УЗИ…','Кардиолог, ЭКГ, УДЗ…']},
    {key:'urgency',label:['Срочность','Шұғылдығы'],type:'select',quarter:true,options:[['плановое',['Плановое','Жоспарлы']],['срочное',['Срочное','Шұғыл']]]},
    {key:'reason',label:['Цель направления','Жолдау мақсаты'],type:'area',rows:3},
    {key:'diagnosis',label:['Предварительный диагноз','Алдын ала диагноз'],type:'area',rows:2,wide3:true},ICD,
    {key:'results',label:['Данные обследований','Тексеру деректері'],type:'area',rows:3}]},
  certificate:{name:['Справка (учебная)','Анықтама (оқу)'],short:['Справка','Анықтама'],icon:'▢',doc:['СПРАВКА','АНЫҚТАМА'],
   description:['Учебный образец справки для учёбы или работы.','Оқу немесе жұмыс үшін анықтаманың оқу үлгісі.'],
   fields:[...P,{key:'visit_date',label:['Дата выдачи','Берілген күні'],type:'date',quarter:true,auto:'today'},
    {key:'purpose',label:['Для предоставления в','Ұсыну үшін'],type:'text',half:true,placeholder:['по месту учёбы','оқу орнына']},
    {key:'period_from',label:['Период с','Кезең басы'],type:'date',quarter:true},{key:'period_to',label:['по','дейін'],type:'date',quarter:true},
    {key:'diagnosis',label:['Заключение','Қорытынды'],type:'area',rows:3},
    {key:'plan',label:['Рекомендации','Ұсыныстар'],type:'area',rows:2}]}
 };
 const order=['consult','soap','discharge','referral','certificate'];
 function lab(l,lang){return Array.isArray(l)?(lang==='kk'?l[1]:l[0]):l;}
 function fieldList(id){return (list[id]||list.consult).fields;}
 function aiFields(id,lang){return fieldList(id).filter(f=>!['birth_date','sex','card_no','patient_name','visit_date','period_from','period_to','urgency'].includes(f.key)).flatMap(f=>f.type==='vitals'?f.parts.map(([k,l])=>({key:'vitals_'+k,label:l,hint:'number with unit only if stated'})):[{key:f.key,label:lab(f.label,'ru'),hint:f.hint?f.hint[0]:''}]);}
 const fmtDate=v=>{if(!v)return '';const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);return m?`${m[3]}.${m[2]}.${m[1]}`:v;};
 function vitalsText(values){return VITALS.parts.map(([k,l])=>values['vitals_'+k]?`${l}: ${values['vitals_'+k]}`:'').filter(Boolean).join('; ');}
 function valueText(f,values,lang='ru'){if(f.type==='vitals')return vitalsText(values);const v=values[f.key]||'';if(f.type==='date')return fmtDate(v);if(f.type==='select')return lab(f.options.find(([key])=>key===v)?.[1]??v,lang);return v.trim();}
 // Plain text is what the server stores and the mentor reads; it stays readable without the form.
 function toText(id,values,lang='ru'){
  const tpl=list[id]||list.consult,lines=[lab(tpl.doc,lang),''];
  const pat=tpl.fields.filter(f=>f.patient).map(f=>[lab(f.label,lang),valueText(f,values,lang)]).filter(([,v])=>v);
  if(pat.length)lines.push(...pat.map(([l,v])=>`${l}: ${v}`),'');
  for(const f of tpl.fields.filter(f=>!f.patient)){const v=valueText(f,values,lang);if(!v)continue;if(f.type==='area')lines.push(lab(f.label,lang).toUpperCase(),v,'');else lines.push(`${lab(f.label,lang)}: ${v}`);}
  return lines.join('\n').trim();
 }
 function filled(id,values){const fs=fieldList(id).filter(f=>!f.patient&&f.type==='area');return {done:fs.filter(f=>(values[f.key]||'').trim()).length,total:fs.length};}
 function defaults(id,ctx){const v={};for(const f of fieldList(id)){if(f.auto==='today')v[f.key]=new Date().toISOString().slice(0,10);}v.card_no=ctx.cardNo||'';return v;}
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const para=s=>e(s).split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
 // Printable A4 page. ctx: {lang, doctor, specialty, number, status, approvedAt, caseId, synthetic}
 function printHtml(id,values,ctx){
  const lang=ctx.lang||'ru',tpl=list[id]||list.consult,L=(ru,kk)=>lang==='kk'?kk:ru;
  const pat=tpl.fields.filter(f=>f.patient);
  const body=tpl.fields.filter(f=>!f.patient).map(f=>{const v=valueText(f,values,lang);if(!v)return '';return f.type==='area'?`<section class="pd-section"><h3>${e(lab(f.label,lang))}</h3>${para(v)}</section>`:`<div class="pd-line"><span>${e(lab(f.label,lang))}</span><strong>${e(v)}</strong></div>`;}).join('');
  return `<article class="print-doc">
<div class="pd-watermark">${L('УЧЕБНЫЙ ДОКУМЕНТ','ОҚУ ҚҰЖАТЫ')}</div>
<header class="pd-head"><div class="pd-org"><div class="pd-logo">Q</div><div><strong>QadamX MedTech</strong><span>${L('Учебная клиника · исследовательский прототип','Оқу клиникасы · зерттеу прототипі')}</span></div></div><div class="pd-meta"><span>№ ${e(ctx.number||'—')}</span><span>${e(fmtDate(values.visit_date||values.period_to||new Date().toISOString().slice(0,10)))}</span></div></header>
<h1 class="pd-title">${e(lab(tpl.doc,lang))}</h1>
<table class="pd-patient"><tbody>${pat.map(f=>`<tr><th>${e(lab(f.label,lang))}</th><td>${e(valueText(f,values,lang)||'—')}</td></tr>`).join('')}</tbody></table>
<div class="pd-body">${body||`<p class="pd-empty">${L('Поля документа не заполнены.','Құжат өрістері толтырылмаған.')}</p>`}</div>
<footer class="pd-sign"><div><span>${L('Врач','Дәрігер')}</span><strong>${e(ctx.doctor||'')}</strong>${ctx.specialty?`<small>${e(ctx.specialty)}</small>`:''}</div><div class="pd-signline"><span></span><small>${L('подпись','қолы')}</small></div><div class="pd-stamp">${ctx.status==='approved'?L('Утверждено в демо','Демода бекітілді')+'<br>'+e(ctx.approvedAt||''):L('Черновик','Жоба')}</div></footer>
<p class="pd-foot">${L('Учебный документ QadamX на синтетических данных. Не является медицинским документом, не имеет юридической силы, ЭЦП отсутствует.','QadamX оқу құжаты синтетикалық деректерде жасалған. Медициналық құжат емес, заңды күші жоқ, ЭЦҚ жоқ.')}${ctx.caseId?' · '+e(ctx.caseId):''}</p>
</article>`;
 }
 const PRINT_CSS=`@page{size:A4;margin:16mm 16mm 18mm}body{font:11pt/1.5 'Times New Roman',Georgia,serif;color:#111}.print-doc{position:relative;max-width:180mm;margin:0 auto}.pd-watermark{position:fixed;top:42%;left:0;right:0;text-align:center;font:700 54pt Arial,sans-serif;color:rgba(200,30,30,.08);transform:rotate(-28deg);pointer-events:none}.pd-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1563e0;padding-bottom:8pt}.pd-org{display:flex;gap:10pt;align-items:center}.pd-logo{width:30pt;height:30pt;border-radius:7pt;background:#1563e0;color:#fff;font:700 17pt Arial;display:flex;align-items:center;justify-content:center}.pd-org strong{display:block;font:700 13pt Arial,sans-serif}.pd-org span{font:9pt Arial,sans-serif;color:#555}.pd-meta{text-align:right;font:10pt Arial,sans-serif;display:flex;flex-direction:column}.pd-title{text-align:center;font:700 15pt Arial,sans-serif;letter-spacing:1pt;margin:18pt 0 12pt}.pd-patient{width:100%;border-collapse:collapse;margin-bottom:12pt;font-size:10.5pt}.pd-patient th,.pd-patient td{border:1px solid #9aa;padding:4pt 7pt;text-align:left}.pd-patient th{width:38%;background:#eef4fd;font:600 9.5pt Arial,sans-serif}.pd-section{margin:0 0 9pt;break-inside:avoid}.pd-section h3{font:700 9.5pt Arial,sans-serif;text-transform:uppercase;letter-spacing:.6pt;color:#1563e0;margin:0 0 3pt}.pd-section p{margin:0 0 4pt}.pd-line{display:flex;gap:8pt;margin:0 0 6pt}.pd-line span{font:600 9.5pt Arial,sans-serif;color:#1563e0;min-width:42mm}.pd-sign{display:flex;justify-content:space-between;align-items:flex-end;gap:14pt;margin-top:22pt;padding-top:10pt;border-top:1px solid #ccc}.pd-sign span{display:block;font:9pt Arial,sans-serif;color:#555}.pd-sign small{display:block;font:8.5pt Arial,sans-serif;color:#666}.pd-signline{flex:1;text-align:center}.pd-signline span{border-bottom:1px solid #333;height:18pt;margin-bottom:2pt}.pd-stamp{border:2px solid #1563e0;color:#1563e0;border-radius:6pt;padding:5pt 9pt;font:700 8.5pt Arial,sans-serif;text-align:center;text-transform:uppercase;transform:rotate(-4deg)}.pd-foot{margin-top:16pt;font:8pt Arial,sans-serif;color:#a01818;text-align:center}.pd-empty{color:#888}`;
 // Word opens HTML saved as .doc with these Office namespaces, keeping fonts and tables.
 function wordFile(id,values,ctx){return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${e(lab((list[id]||list.consult).doc,ctx.lang||'ru'))}</title><style>${PRINT_CSS.replace('.pd-watermark{position:fixed','.pd-watermark{display:none;position:fixed')}</style></head><body>${printHtml(id,values,ctx)}</body></html>`;}
 const api={list,order,lab,fieldList,aiFields,toText,filled,defaults,printHtml,wordFile,PRINT_CSS,fmtDate,VITALS};
 root.QTemplates=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
