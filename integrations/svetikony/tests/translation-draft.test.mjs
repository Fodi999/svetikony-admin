import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Operator } from '../src/operator.mjs';
function setup() {
  const source = {id:'uk',title:'Назва',description:'Опис',slug:'sample',language:'uk',status:'published',translationGroupId:'group',imageUrl:'https://example.org/image.png'};
  const rows = {icons:[source],calendar:[]};
  let writes=0;
  const api={delegated:true,async request(path,{method='GET',body}={}){
    if(path === '/api/admin/telegram/autopost/settings') return {globalEnabled:false};
    const [,entity,id]=path.match(/church-content\/([^/]+)(?:\/([^/]+))?$/);
    const collection=rows[entity==='calendar-days'?'calendar':entity];
    if(method==='GET')return structuredClone(id?collection.find(r=>r.id===id):collection);
    assert.equal(method,'POST');writes++;
    const row={...body,id:'new',translationGroupId:'group'};collection.push(row);return row;
  }};
  return {op:new Operator(api,{}),api,source,rows,writes:()=>writes};
}
const fields={title:'Title',description:'Description'};
test('creates server draft, preserves group/assets and published source; duplicate retry is blocked',async()=>{
 const s=setup();const before=structuredClone(s.source);
 const result=await s.op.createTranslationDraft('icons','uk','en',fields,'Translate');
 assert.equal(result.after.status,'draft');assert.equal(result.verified,true);
 assert.equal(result.after.imageUrl,s.source.imageUrl);assert.equal(result.translationGroupId,'group');
 assert.deepEqual(s.source,before);assert.equal(s.writes(),1);
 await assert.rejects(s.op.createTranslationDraft('icons','uk','en',fields,'Translate'),/already exists/);
 assert.equal(s.writes(),1);
});
test('refuses identity overrides, missing translation text, unsupported language and nondelegated use',async()=>{
 for(const patch of [{title:'Title'}, {...fields,slug:'other'},{...fields,status:'published'}]){
 const s=setup();await assert.rejects(s.op.createTranslationDraft('icons','uk','en',patch,'Translate'));assert.equal(s.writes(),0);
 }
 const s=setup();await assert.rejects(s.op.createTranslationDraft('icons','uk','uk',fields,'Translate'));
 s.api.delegated=false;await assert.rejects(s.op.createTranslationDraft('icons','uk','en',fields,'Translate'));assert.equal(s.writes(),0);
});
test('requires translated relationships and resolves their actual IDs',async()=>{
 const s=setup();s.source.calendarDayId='day-uk';s.rows.calendar.push({id:'day-uk',slug:'day',language:'uk',translationGroupId:'day-group'});
 await assert.rejects(s.op.createTranslationDraft('icons','uk','en',fields,'Translate'),/related translation/);assert.equal(s.writes(),0);
 s.rows.calendar.push({id:'day-en',slug:'day',language:'en',translationGroupId:'day-group'});
 const r=await s.op.createTranslationDraft('icons','uk','en',fields,'Translate');assert.equal(r.after.calendarDayId,'day-en');
});
test('propagates backend permission/autopost rejection without retrying',async()=>{
 const s=setup();const original=s.api.request;s.api.request=async(p,o)=>{if(o?.method==='POST')throw new Error('Calendar writes disabled');return original(p,o);};
 await assert.rejects(s.op.createTranslationDraft('icons','uk','en',fields,'Translate'),/disabled/);assert.equal(s.writes(),0);
});
test('changed source and ambiguous group are blocked before writes',async()=>{
 const s=setup();const original=s.op.get.bind(s.op);let reads=0;
 s.op.get=async(...args)=>{const row=await original(...args);if(++reads===2)row.title='Changed';return row;};
 await assert.rejects(s.op.createTranslationDraft('icons','uk','en',fields,'Translate'),/Source changed/);assert.equal(s.writes(),0);
 const a=setup();a.rows.icons.push({...a.source,id:'bad',language:'ru',translationGroupId:'other'});
 await assert.rejects(a.op.createTranslationDraft('icons','uk','en',fields,'Translate'),/Ambiguous/);assert.equal(a.writes(),0);
});
test('group mismatch after write reports failure without another write',async()=>{
 const s=setup();const request=s.api.request;
 s.api.request=async(p,o)=>{const row=await request(p,o);if(o?.method==='POST')s.rows.icons.at(-1).translationGroupId='wrong';return row;};
 await assert.rejects(s.op.createTranslationDraft('icons','uk','en',fields,'Translate'),/readback mismatch/);assert.equal(s.writes(),1);
});

test('calendar translation accepts nullable source fields and computes old-style date',async()=>{
 const s=setup();s.rows.calendar.push({...s.source,id:'day',dateNewStyle:'2026-09-12',dateOldStyle:null,calendarType:null,imageUrl:null,rank:null});
 const r=await s.op.createTranslationDraft('calendar','day','en',fields,'Translate');
 assert.equal(r.after.dateNewStyle,'2026-09-12');assert.equal(r.after.dateOldStyle,'2026-08-30');
 assert.equal(r.after.status,'draft');assert.equal(s.rows.calendar[0].dateOldStyle,null);
 assert.equal(s.writes(),1);
});
test('active or unknown autopost blocks calendar creation before POST',async()=>{
 for(const settings of [{globalEnabled:true},{}]) {
  const s=setup();s.rows.calendar.push({...s.source,id:'day',dateNewStyle:'2026-09-12',dateOldStyle:null});
  const original=s.api.request;s.api.request=async(p,o)=>p.includes('/autopost/')?settings:original(p,o);
  await assert.rejects(s.op.createTranslationDraft('calendar','day','en',fields,'Translate'),/autopost/);
  assert.equal(s.writes(),0);
 }
});
