const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const crypto=require('node:crypto');
const core=require('./web/core.js');const ctx={window:{}};vm.runInNewContext(fs.readFileSync('web/data.js','utf8'),ctx);
const rows=ctx.window.QADAM_DATA,audit=ctx.window.QADAM_AUDIT;
let checks=0;function test(name,f){f();checks++;console.log('PASS '+name)}
test('Public data are train only, no held-out rows',()=>{assert.equal(rows.length,1268);assert(rows.every(r=>r.split==='train'))});
test('Stable composite IDs and complete source fields',()=>{assert.equal(new Set(rows.map(r=>r.id)).size,1268);assert(rows.every(r=>r.dialogue&&r.reference&&r.source&&r.synthetic===true))});
test('Archive audit totals and duplicates',()=>{assert.equal(audit.total,1908);assert.equal(audit.files.reduce((s,f)=>s+f.count,0),1908);assert.equal(audit.duplicateDialogueGroups.length,5);assert.equal(audit.audioFiles.length,0)});
test('Clean evaluation set has no exact overlap with train',()=>{const held=JSON.parse(fs.readFileSync('research/evaluation-clean.json','utf8'));const hash=r=>crypto.createHash('sha256').update(r.dialogue.toLowerCase().split(/\s+/).filter(Boolean).join(' ')).digest('hex');const train=new Set(rows.map(hash)),seen=new Set();for(const r of held){const h=hash(r);assert(!train.has(h));assert(!seen.has(h));seen.add(h)}assert.equal(held.length,audit.cleanHeldOutCount)});
test('Student can submit, never approve',()=>{assert(core.transition('student','draft','review'));assert(!core.transition('student','review','approved'));assert(!core.transition('student','review','returned'))});
test('Patient and administrator cannot edit or approve',()=>{for(const role of ['patient','admin']){assert(!core.canEdit(role));assert(!core.roles[role].includes('editor'));assert(!core.transition(role,'review','approved'))}});
test('Approval only after review',()=>{assert(core.transition('doctor','review','approved'));assert(!core.transition('mentor','review','returned'));assert(!core.transition('doctor','draft','approved'));assert(!core.transition('doctor','approved','approved'))});
test('Returned drafts can be resubmitted',()=>assert(core.transition('student','returned','review')));
test('Financial scenarios reconcile',()=>{const m=core.financial();assert.equal(m[0].revenue,3625000);assert.equal(m[0].result,-5075000);assert.equal(m[1].result,-2525000);assert.equal(m[2].result,2150000);assert.equal(m[0].breakEven,36)});
test('Nonpositive margin has no break-even',()=>assert.equal(core.financial(100,100,600000)[0].breakEven,null));
test('All required packaged assets exist',()=>{for(const name of ['index.html','app.js','core.js','styles.css','data.js','icon.svg','project-brief.txt','attribution/LICENSE','attribution/NOTICE'])assert(fs.existsSync('web/'+name))});
console.log(`${checks} checks passed. No clinical or AI performance claims.`);
