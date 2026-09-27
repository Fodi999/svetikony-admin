import {withAuth} from '../../_lib/auth';
import {POLICY} from '../../_lib/route-policies';
import {proxyBinary} from '../../_lib/proxy';
export const GET=withAuth(POLICY.contentView,async request=>{
 const key=new URL(request.url).searchParams.get('key')??'';
 if(!/^media\/[a-zA-Z0-9_/-]+\.(png|jpg|webp)$/.test(key)||key.includes('..'))return Response.json({message:'Invalid image key'},{status:400});
 return proxyBinary('/'+key,true);
});
