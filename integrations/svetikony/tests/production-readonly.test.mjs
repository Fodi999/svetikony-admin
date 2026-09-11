import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AdminApi,requireLocal} from '../src/transport.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const config={origin:'https://svetikony.com',environment:'production',token:'test-only',readOnly:false};
test('production rejects every write before fetch, even with readOnly false',async()=>{
 let calls=0;const api=new AdminApi(config,async()=>{calls++;return new Response('{}');});
 for(const method of ['POST','PUT','DELETE','PATCH'])await assert.rejects(api.request('/api/admin/church-content/saints',{method}),/WRITE ACCESS DISABLED/);
 assert.equal(calls,0);await assert.rejects(api.request('/api/admin/church-content/saints'),/pairing required/);assert.equal(calls,0);
 assert.throws(()=>requireLocal(config),/LOCAL only/);
 await assert.rejects(api.request('/api/admin/church-content/visualizer-models'),/pairing required/);
 await assert.rejects(api.terrainRequest('/api/admin/terrain-bundles/test/L1'),/LOCAL only/);assert.equal(calls,0);
});
test('all 34 MCP tools remain discoverable, but write handlers cannot execute',async()=>{
 let called=false;const server=createServer({store:{},async apply(){called=true;}},config);
 const client=new Client({name:'readonly-test',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
 try{assert.equal((await client.listTools()).tools.length,36);const r=await client.callTool({name:'apply_draft',arguments:{changeId:'12345678-1234-4234-8234-123456789abc'}});assert.equal(r.isError,true);assert.match(r.content[0].text,/WRITE ACCESS DISABLED/);assert.equal(called,false);}finally{await client.close();await server.close();}
});
