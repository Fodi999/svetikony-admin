import {test} from 'node:test';import assert from 'node:assert/strict';
import {AdminApi} from '../src/transport.mjs';
const origin='https://svetikony.com';const token='ai_'+'b'.repeat(64);const code='ABCD-EFGH-JKLM';
function setup(mode='DRAFT_EDIT',scopes=['prayers.read','prayers.write']){const calls=[];const api=new AdminApi({origin,environment:'production',readOnly:true},async(url,options)=>{calls.push({url,options});if(url.endsWith('/exchange'))return Response.json({accessToken:token,mode,scopes,expiresAt:new Date(Date.now()+60000).toISOString()});return Response.json([]);});return{api,calls};}
test('pairing hides token, keeps it in process only and routes scoped draft operations',async()=>{const{api,calls}=setup();const result=await api.connectAiAccess(code);assert.equal(result.connected,true);assert.ok(!JSON.stringify(result).includes(token));assert.ok(!JSON.stringify(api).includes(token));await api.request('/api/admin/church-content/prayers',{method:'POST',body:{title:'fixture',status:'draft'}});assert.equal(calls[1].url,origin+'/api/ai-access/content/prayers');assert.equal(calls[1].options.headers.Authorization,'Bearer '+token);await assert.rejects(api.request('/api/admin/church-content/prayers',{method:'PUT',body:{status:'published'}}),/Publication/);await assert.rejects(api.request('/api/admin/church-content/saints'),/scope/);assert.equal(calls.length,2);const fresh=setup().api;assert.equal(fresh.delegated,false);});
test('read-only grant rejects mutations locally and auth revocation clears runtime access',async()=>{const{api,calls}=setup('READ_ONLY',['prayers.read']);await api.connectAiAccess(code);await assert.rejects(api.request('/api/admin/church-content/prayers',{method:'POST',body:{status:'draft'}}),/DISABLED/);assert.equal(calls.length,1);api.fetcher=async()=>new Response('',{status:401});await assert.rejects(api.request('/api/admin/church-content/prayers'),/revoked/);await assert.rejects(api.request('/api/admin/church-content/prayers'),/pair again/);});
test('base replacement and arbitrary routes remain impossible with delegated grant',async()=>{const{api,calls}=setup('DRAFT_EDIT',['visualizer.read','visualizer.write']);await api.connectAiAccess(code);for(const path of ['/api/admin/church-content/visualizer-models/id/set-base-earth','/api/admin/auth/login','/api/admin/media/delete','https://example.com'])await assert.rejects(api.request(path,{method:'POST',body:{}}));assert.equal(calls.length,1);});

test('production never falls back to a service credential before pairing or after failed pairing',async()=>{
 const {api,calls}=setup();api.config.token='fixture-legacy';
 await assert.rejects(api.request('/api/admin/church-content/prayers'),/pairing required/);
 await api.connectAiAccess(code);
 api.fetcher=async()=>new Response('{}',{status:401});
 await assert.rejects(api.connectAiAccess(code),/HTTP 401/);
 await assert.rejects(api.request('/api/admin/church-content/prayers'),/pair again/);
 assert.equal(calls.length,1);
});
test('expired runtime token blocks reads without issuing another HTTP request',async()=>{
 const {api,calls}=setup();await api.connectAiAccess(code);const realNow=Date.now;
 try{Date.now=()=>realNow()+120000;await assert.rejects(api.request('/api/admin/church-content/prayers'),/expired/);assert.equal(calls.length,1);}finally{Date.now=realNow;}
});
test('production config needs only origin and does not read an env/service token file',async()=>{
 const {loadConfig}=await import('../src/transport.mjs');
 const saved={...process.env};
 try{process.env.SVETIKONY_API_ORIGIN='https://backend.example';process.env.SVETIKONY_ENV_FILE='/missing/do-not-read';const c=loadConfig();assert.equal(c.environment,'production');assert.equal(c.token,undefined);}finally{process.env=saved;}
});
test('pairing and upstream errors never echo response bodies or tokens',async()=>{
 const {api}=setup();api.fetcher=async()=>Response.json({accessToken:token,error:token},{status:403});await assert.rejects(api.connectAiAccess(code),e=>!e.message.includes(token)&&/HTTP 403/.test(e.message));
});
