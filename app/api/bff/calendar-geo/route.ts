import {withAuth} from '../_lib/auth';
import {proxyAndMap} from '../_lib/proxy';
import {POLICY} from '../_lib/route-policies';
import {readSessionCookie} from '@/lib/auth/cookie';

export const GET=withAuth(POLICY.contentView,
  async(request)=>proxyAndMap('/api/admin/calendar-geo',request.nextUrl.searchParams,(raw:unknown)=>raw),
  {localUpstreamOnly:true});
export const POST=withAuth(POLICY.contentEdit,async(request)=>{
  const response=await fetch(new URL('/api/admin/calendar-geo',process.env.SVET_IKONY_API_BASE_URL),{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),
    headers:{Authorization:`Bearer ${process.env.SVET_IKONY_ADMIN_TOKEN}`,'X-Admin-Session':readSessionCookie(request)??'','Content-Type':'application/json'},
    body:JSON.stringify(await request.json()),
  });
  return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
},{localUpstreamOnly:true});
