'use client';
import {useRef,useState} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/lib/auth/auth-context';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {CandidatePreview} from './candidate-preview';
type Place={id:string;revision:string;canonical_name:string;historical_name:string|null;modern_name:string|null;lat:number|null;lon:number|null;relation_type:string;source_url:string;geo_status:string};
export type ActionProfile={id:string;entityId:string|null;revision:string;places:Place[];candidates:{qid:string;confidence:string;status:string;evidence?:unknown}[]};
const relationTypes=['birth','ministry','residence','martyrdom','death','burial','relics','founded','council','icon_origin','veneration','pilgrimage','other'];
export function ReviewActions({profile}:{profile:ActionProfile}) {
  const {canEdit}=useAuth(),client=useQueryClient();
  const [qid,setQid]=useState(''),[type,setType]=useState('saint'),[preview,setPreview]=useState<{qid:string;entity:unknown}|null>(null),[error,setError]=useState('');
  const [target,setTarget]=useState(''),[merge,setMerge]=useState<{previewToken:string}|null>(null),[editing,setEditing]=useState<Place|null>(null),[placeOpen,setPlaceOpen]=useState(false);
  const attempts=useRef(new Map<string,string>());
  const mutation=useMutation({mutationFn:async(command:Record<string,unknown>)=>{
    // Reuse the logical request after an uncertain network response.
    const payload={profileId:profile.id,revision:profile.revision,...command},key=JSON.stringify(payload);
    const requestId=attempts.current.get(key)??crypto.randomUUID();attempts.current.set(key,requestId);
    const response=await fetch('/api/bff/calendar-geo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,...payload})});
    const body=await response.json();if(!response.ok)throw new Error(body.details??body.message??`HTTP ${response.status}`);return body;
  },onSuccess:()=>{setPreview(null);setMerge(null);setPlaceOpen(false);setError('');void client.invalidateQueries({queryKey:['calendar-geo-review']});void client.invalidateQueries({queryKey:['calendar-geo-profile',profile.id]});}});
  async function candidate(value:string){setPreview(null);setError('');try{const response=await fetch(`/api/bff/calendar-geo?${new URLSearchParams({id:profile.id,qid:value})}`);const body=await response.json();if(!response.ok)throw new Error(body.message);setPreview(body);setQid(value);}catch(e){setError(String(e));}}
  async function previewMerge(){setMerge(null);setError('');try{const response=await fetch(`/api/bff/calendar-geo?${new URLSearchParams({source:profile.entityId??'',target})}`);const body=await response.json();if(!response.ok)throw new Error(body.message);setMerge(body);}catch(e){setError(String(e));}}
  if(!canEdit('content'))return null;
  const submit=(command:Record<string,unknown>)=>mutation.mutate(command);
  return <section className="space-y-4 border-t pt-4" aria-label="Review actions">
    {(error||mutation.error)?<p role="alert">{error||mutation.error?.message}</p>:null}
    <fieldset disabled={mutation.isPending} className="space-y-3">
      <legend className="font-semibold">Identity review</legend>
      <div className="flex flex-wrap gap-2">{profile.candidates.map(c=><Button key={c.qid} variant="outline" onClick={()=>void candidate(c.qid)}>{c.qid} · {c.status}</Button>)}</div>
      <div className="flex gap-2"><Input aria-label="Wikidata QID" placeholder="Q44258" value={qid} onChange={e=>{setQid(e.target.value);setPreview(null);}}/><Button variant="outline" disabled={!/^Q\d+$/.test(qid)} onClick={()=>void candidate(qid)}>Preview QID</Button></div>
      {preview?<div className="space-y-3"><CandidatePreview entity={preview.entity}/>
        <label className="block">Entity type <select className="rounded border p-2" value={type} onChange={e=>setType(e.target.value)}>{['saint','feast','icon','church_event','historical_event','relic','church','monastery','shrine'].map(t=><option key={t}>{t}</option>)}</select></label>
        <Button onClick={()=>submit({action:'confirm',qid:preview.qid,entityType:type})}>Confirm match</Button>{' '}
        <Button variant="outline" onClick={()=>submit({action:'reject',qid:preview.qid})}>Reject match</Button>
      </div>:null}
    </fieldset>
    {profile.entityId?<fieldset disabled={mutation.isPending} className="space-y-3"><legend className="font-semibold">Geography</legend>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{setEditing(null);setPlaceOpen(true);}}>Add place manually</Button><Button variant="outline" onClick={()=>submit({action:'geo_unknown'})}>Mark geo unknown</Button></div>
      {profile.places.map(p=><div key={`${p.id}:${p.relation_type}`} className="flex flex-wrap items-center gap-2 border-b py-2"><span>{p.canonical_name} · {p.relation_type}</span><Button variant="outline" onClick={()=>{setEditing(p);setPlaceOpen(true);}}>Edit place</Button><Button variant="outline" onClick={()=>submit({action:'remove_relation',placeId:p.id,relationType:p.relation_type})}>Remove relation</Button></div>)}
      {placeOpen?<form key={`${editing?.id??'new'}:${editing?.relation_type??''}`} className="grid gap-3" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);submit({action:editing?'edit_place':'manual_place',placeId:editing?.id,placeRevision:editing?.revision,originalRelationType:editing?.relation_type,name:data.get('name'),historicalName:data.get('historicalName'),modernName:data.get('modernName'),lat:Number(data.get('lat')),lon:Number(data.get('lon')),relationType:data.get('relationType'),sourceUrl:data.get('sourceUrl'),sourceNote:data.get('sourceNote'),geoStatus:data.get('geoStatus')});}}>
        <label>Name<Input name="name" required defaultValue={editing?.canonical_name??''}/></label>
        <label>Historical name<Input name="historicalName" defaultValue={editing?.historical_name??''}/></label>
        <label>Modern name<Input name="modernName" defaultValue={editing?.modern_name??''}/></label>
        <div className="grid grid-cols-2 gap-3"><label>Latitude<Input name="lat" type="number" step="any" min={-90} max={90} required defaultValue={editing?.lat??''}/></label><label>Longitude<Input name="lon" type="number" step="any" min={-180} max={180} required defaultValue={editing?.lon??''}/></label></div>
        <label>Relation <select name="relationType" className="rounded border p-2" defaultValue={editing?.relation_type??'other'}>{relationTypes.map(r=><option key={r}>{r}</option>)}</select></label>
        <label>Source URL<Input name="sourceUrl" type="url" defaultValue={editing?.source_url??''}/></label>
        <label>Source note<Input name="sourceNote"/></label>
        <label>Verification <select name="geoStatus" className="rounded border p-2" defaultValue="manual_unverified"><option>manual_unverified</option><option>needs_review</option><option>reviewed_verified</option></select></label>
        <div className="flex gap-2"><Button type="submit">Save place</Button><Button type="button" variant="outline" onClick={()=>setPlaceOpen(false)}>Cancel</Button></div>
      </form>:null}
      <h3 className="font-semibold">Merge duplicate entity</h3>
      <Input aria-label="Target canonical entity ID" value={target} onChange={e=>{setTarget(e.target.value);setMerge(null);}}/>
      <Button variant="outline" disabled={!target||target===profile.entityId} onClick={()=>void previewMerge()}>Preview merge</Button>
      {merge?<><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(merge,null,2)}</pre><Button onClick={()=>submit({action:'merge',targetEntityId:target,previewToken:merge.previewToken})}>Confirm merge</Button></>:null}
    </fieldset>:null}
  </section>;
}
