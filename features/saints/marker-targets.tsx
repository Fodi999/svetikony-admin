'use client';
import {useEffect,useState} from 'react';
import {MapPin} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {MarkerImageEditor} from './marker-image-editor';
import {CreateMarkerPlace} from './create-marker-place';
type Target={id:string;title:string};
type Catalog={places:Target[];saints:Target[];links:{entityId:string;groupId:string}[]};
export function MarkerTargets({groupId}:{groupId?:string}){
 const [catalog,setCatalog]=useState<Catalog|null>(null),[selected,setSelected]=useState(''),[placeId,setPlaceId]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const r=await fetch('/api/bff/marker-targets');if(!r.ok)throw Error('Не удалось загрузить метки');setCatalog(await r.json());}
 useEffect(()=>{const abort=new AbortController();void fetch('/api/bff/marker-targets',{signal:abort.signal}).then(async r=>{if(!r.ok)throw Error('Не удалось загрузить метки');return r.json();}).then(setCatalog).catch(e=>{if(!abort.signal.aborted)setError(String(e));});return()=>abort.abort();},[]);
 async function connect(){setBusy(true);setError('');try{const r=await fetch('/api/bff/marker-targets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:groupId?'saint':'place',id:selected,groupId})});const value=await r.json();if(!r.ok)throw Error(value.details??value.message??'Ошибка связи');if(!groupId)setPlaceId(value.placeId);await load();}catch(e){setError(String(e));}finally{setBusy(false);}}
 const targets=groupId?catalog?.saints:catalog?.places;
 return <section className="space-y-4"><h2 className="text-lg font-semibold">{groupId?'Связь с меткой на глобусе':'Места и метки глобуса'}</h2>
 {!groupId?<CreateMarkerPlace onCreated={id=>{setSelected(id);setPlaceId(id);void load().catch(e=>setError(String(e)));}}/>:null}
 {groupId?catalog?.links.filter(l=>l.groupId===groupId).map(l=><p key={l.entityId}>{catalog.saints.find(s=>s.id===l.entityId)?.title??l.entityId}</p>):null}
 <div className="flex flex-wrap gap-2"><select aria-label="Метка на глобусе" className="min-w-0 max-w-full rounded border p-2" value={selected} onChange={e=>{setSelected(e.target.value);setPlaceId('');}} disabled={busy}><option value="">Выберите метку</option>{targets?.map(t=><option value={t.id} key={t.id}>{t.title} · {t.id}</option>)}</select><Button type="button" disabled={!selected||busy} onClick={()=>void connect()}><MapPin/>{groupId?'Связать со святым':'Открыть фото метки'}</Button></div>
 {placeId?<MarkerImageEditor key={placeId} kind="place" groupId={placeId}/>:null}
 {error?<p role="alert">{error}</p>:null}</section>;
}
