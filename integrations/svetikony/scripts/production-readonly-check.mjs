// Real MCP handshake; only GET-backed tools are called. Never logs credentials or content.
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir,homedir} from 'node:os';import {resolve,join} from 'node:path';
const state=mkdtempSync(join(tmpdir(),'svetikony-production-readonly-'));
const client=new Client({name:'production-readonly-check',version:'1'});
const transport=new StdioClientTransport({command:process.execPath,args:[resolve(import.meta.dirname,'../dist/server.mjs')],env:{...process.env,SVETIKONY_ENV_FILE:join(homedir(),'.config/svetikony/production.env'),SVETIKONY_API_ORIGIN:'https://svetikony.com',SVETIKONY_READ_ONLY:'true',SVETIKONY_STATE_DIR:state},stderr:'pipe'});transport.stderr?.on('data',()=>{});
try{
 await client.connect(transport);const catalogue=await client.listTools();console.log('TOOLS_LOADED='+catalogue.tools.length);
 const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});return {isError:!!r.isError,...JSON.parse(r.content[0].text)};};
 const s=await call('connection_status');console.log('PRODUCTION_KEY_CONFIGURED='+Boolean(s.result?.PRODUCTION_KEY_CONFIGURED));console.log('PRODUCTION_AUTH='+(s.result?.connected?'CONNECTED':'FAILED'));console.log('WRITE_ACCESS=DISABLED');
 if(s.result?.connected){for(const entity of ['calendar','saints','prayers']){const r=await call('list_content',{entity,limit:1});console.log(entity+'_LIST='+(r.isError?'FAILED':'PASSED'));const data=r.result;const items=Array.isArray(data)?data:(data?.items||data?.data||[]);const item=items[0];if(item?.id){const detail=await call('get_content',{entity,id:item.id});console.log(entity+'_READ='+(detail.isError?'FAILED':'PASSED'));}else console.log(entity+'_READ=NO_RECORD_RETURNED');}}
 else console.log('READ_TESTS=BLOCKED_BY_AUTH');
 console.log('VISUALIZER=BLOCKED_BY_LOCAL_POLICY');console.log('TERRAIN=BLOCKED_BY_LOCAL_POLICY');console.log('WRITE_REQUESTS=0');
}finally{await client.close();rmSync(state,{recursive:true,force:true});}
