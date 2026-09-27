'use client';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Button} from '@/components/ui/button';
import {ChevronLeft,ChevronRight,X} from 'lucide-react';
import {ReviewActions,type ActionProfile} from './actions';
type Row={id:string;entityId:string|null;title:string;matchStatus:string;enrichmentStatus:string;candidates:number};
type Detail=ActionProfile&{matchStatus:string;profile:{names:string[];biography?:string;calendarDates?:string[]};
  candidates:{qid:string;confidence:string;status:string;evidence:unknown}[];occurrences:{date:string;title:string;source:string}[];images:unknown[]};
const filters={needs_review:'Needs review',machine_high:'HIGH machine',medium:'MEDIUM',low:'LOW',not_found:'NO MATCH',multiple:'Multiple candidates',missing_geo:'Missing geo',missing_uk:'Missing UK',missing_ru:'Missing RU',missing_en:'Missing EN',missing_image:'Missing image',conflict:'Conflicting identity',duplicate:'Duplicate suspected',all:'All'};
async function read<T>(query:string,signal:AbortSignal):Promise<T>{
  const response=await fetch(`/api/bff/calendar-geo?${query}`,{signal});
  if(!response.ok)throw new Error(`Calendar Geo Review: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
export function CalendarGeoReview(){
  const [filter,setFilter]=useState('needs_review'),[offset,setOffset]=useState(0),[id,setId]=useState<string|null>(null);
  const queue=useQuery({queryKey:['calendar-geo-review',filter,offset],queryFn:({signal})=>read<{items:Row[];total:number}>(new URLSearchParams({filter,offset:String(offset)}).toString(),signal)});
  const selected=useQuery({queryKey:['calendar-geo-profile',id],enabled:!!id,queryFn:({signal})=>read<Detail>(`id=${encodeURIComponent(id!)}`,signal)});
  const items=queue.data?.items??[],total=queue.data?.total??0,loading=queue.isFetching,detail=id?selected.data:null;
  const error=queue.error?.message??selected.error?.message;
  return <main className="space-y-4 p-4 md:p-6">
    <h1 className="text-2xl font-semibold">Calendar Geo Review</h1>
    <div className="flex flex-wrap items-center gap-3"><select className="rounded border p-2" aria-label="Review filter" value={filter} onChange={e=>{setFilter(e.target.value);setOffset(0);setId(null);}}>{Object.entries(filters).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><span>{total} profiles · LOCAL</span></div>
    {error?<p role="alert">{error}</p>:null}
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="min-w-0" aria-busy={loading}><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Identity</th><th>Status</th><th>Candidates</th></tr></thead><tbody>{items.map(row=><tr key={row.id} className="border-b"><td className="p-2"><button className="text-left underline underline-offset-4" onClick={()=>setId(row.id)}>{row.title}</button><small className="block text-muted-foreground">{row.enrichmentStatus}</small></td><td>{row.matchStatus}</td><td>{row.candidates}</td></tr>)}</tbody></table></div>
      <nav className="mt-4 flex items-center gap-3"><Button variant="outline" size="icon" title="Previous page" aria-label="Previous page" disabled={loading||offset===0} onClick={()=>setOffset(Math.max(0,offset-30))}><ChevronLeft/></Button><span>{total?offset+1:0}–{Math.min(offset+30,total)} / {total}</span><Button variant="outline" size="icon" title="Next page" aria-label="Next page" disabled={loading||offset+30>=total} onClick={()=>setOffset(offset+30)}><ChevronRight/></Button></nav></section>
      {detail?<section className="min-w-0 space-y-4"><header className="flex items-start justify-between gap-3"><h2 className="text-xl font-semibold">{detail.profile.names[0]}</h2><Button variant="ghost" size="icon" title="Close" aria-label="Close" onClick={()=>setId(null)}><X/></Button></header>
        <p>{detail.matchStatus}</p><p>{detail.profile.names.join(' · ')}</p><p>{detail.profile.biography}</p>
        <h3 className="font-semibold">Wikidata candidates</h3>{detail.candidates.map(candidate=><div key={candidate.qid} className="border-b py-3"><a className="underline" href={`https://www.wikidata.org/wiki/${candidate.qid}`} target="_blank" rel="noreferrer">{candidate.qid}</a> · {candidate.confidence} · {candidate.status}<pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(candidate.evidence,null,2)}</pre></div>)}
        <details><summary>Calendar occurrences ({detail.occurrences.length})</summary><ul>{detail.occurrences.map((item,index)=><li key={index}>{item.date} · <a className="underline" href={item.source} target="_blank" rel="noreferrer">{item.title}</a></li>)}</ul></details>
        <details><summary>Places ({detail.places.length})</summary><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(detail.places,null,2)}</pre></details>
        <details><summary>Images ({detail.images.length})</summary><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(detail.images,null,2)}</pre></details>
        <ReviewActions key={detail.id} profile={detail}/>
      </section>:null}
    </div>
  </main>;
}
