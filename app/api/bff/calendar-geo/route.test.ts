import {NextRequest} from 'next/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {GET,POST} from './route';
import {mockAuthenticatedFetch,withSessionCookie} from '../_lib/test-support';
beforeEach(()=>{vi.stubEnv('NODE_ENV','development');vi.stubEnv('SVET_IKONY_API_BASE_URL','http://localhost:3000');vi.stubEnv('SVET_IKONY_ADMIN_TOKEN','test-token');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('refuses a production upstream before authentication or network access',async()=>{
  vi.stubEnv('SVET_IKONY_API_BASE_URL','https://svetikony.com');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  expect((await GET(new NextRequest('http://localhost:3001/api/bff/calendar-geo',withSessionCookie()))).status).toBe(404);expect(fetch).not.toHaveBeenCalled();
});
it('is disabled in production builds',async()=>{
  vi.stubEnv('NODE_ENV','production');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  expect((await GET(new NextRequest('http://localhost:3001/api/bff/calendar-geo',withSessionCookie()))).status).toBe(404);expect(fetch).not.toHaveBeenCalled();
});
it('requires a session',async()=>{expect((await GET(new NextRequest('http://localhost:3001/api/bff/calendar-geo'))).status).toBe(401);});
it('forwards authenticated local filter and pagination',async()=>{
  const fetch=mockAuthenticatedFetch('viewer',()=>Response.json({items:[],total:0}));vi.stubGlobal('fetch',fetch);
  const response=await GET(new NextRequest('http://localhost:3001/api/bff/calendar-geo?filter=missing_uk&offset=30',withSessionCookie()));
  expect(response.status).toBe(200);expect(fetch.mock.calls.some(([url])=>String(url).includes('/api/admin/calendar-geo?filter=missing_uk&offset=30'))).toBe(true);
});
it('denies viewer mutations',async()=>{
  const fetch=mockAuthenticatedFetch('viewer',()=>Response.json({ok:true}));vi.stubGlobal('fetch',fetch);
  const response=await POST(new NextRequest('http://localhost:3001/api/bff/calendar-geo',withSessionCookie({method:'POST',body:'{}'})));
  expect(response.status).toBe(403);expect(fetch.mock.calls.some(([url])=>String(url).includes('/api/admin/calendar-geo'))).toBe(false);
});
it('forwards the authenticated human session for editor review without accepting a body actor',async()=>{
  const fetch=mockAuthenticatedFetch('editor',()=>Response.json({ok:true}));vi.stubGlobal('fetch',fetch);
  const response=await POST(new NextRequest('http://localhost:3001/api/bff/calendar-geo',withSessionCookie({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reject',reviewer:'forged'})})));
  expect(response.status).toBe(200);
  const call=fetch.mock.calls.find(([url])=>String(url).endsWith('/api/admin/calendar-geo'))!;
  expect(new Headers(call[1]?.headers).get('X-Admin-Session')).toBe('test-session-token');
});
it('blocks remote POST upstream before even resolving the human session',async()=>{
  vi.stubEnv('SVET_IKONY_API_BASE_URL','https://svetikony.com');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  expect((await POST(new NextRequest('http://localhost:3001/api/bff/calendar-geo',withSessionCookie({method:'POST',body:'{}'})))).status).toBe(404);expect(fetch).not.toHaveBeenCalled();
});
