import {withAuth} from '../../../_lib/auth';
import {POLICY} from '../../../_lib/route-policies';
import {proxyAndMap,proxyJsonWrite} from '../../../_lib/proxy';
type Context={params:Promise<{kind:string;id:string}>};
export const GET=withAuth(POLICY.contentView,async(_request,_session,context:Context)=>{const {kind,id}=await context.params;return proxyAndMap(`/api/admin/marker-images/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`,undefined,value=>value);});
export const POST=withAuth(POLICY.contentEdit,async(request,_session,context:Context)=>{const {kind,id}=await context.params;return proxyJsonWrite(`/api/admin/marker-images/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`,'POST',await request.json(),value=>value);});
