import {withAuth} from '../_lib/auth';
import {POLICY} from '../_lib/route-policies';
import {proxyAndMap,proxyJsonWrite} from '../_lib/proxy';
export const GET=withAuth(POLICY.contentView,async()=>proxyAndMap('/api/admin/marker-targets',undefined,value=>value));
export const POST=withAuth(POLICY.contentEdit,async request=>proxyJsonWrite('/api/admin/marker-targets','POST',await request.json(),value=>value));
