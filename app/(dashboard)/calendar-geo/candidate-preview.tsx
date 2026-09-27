type Entity={id?:string;labels?:Record<string,{value:string}>;descriptions?:Record<string,{value:string}>;
  sitelinks?:Record<string,{title:string}>;claims?:Record<string,{rank?:string;mainsnak?:{snaktype?:string;datavalue?:{value:unknown}}}[]>};
function values(entity:Entity,property:string){return (entity.claims?.[property]??[]).filter(c=>c.rank!=='deprecated'&&c.mainsnak?.snaktype==='value').map(c=>c.mainsnak?.datavalue?.value);}
export function CandidatePreview({entity:raw}:{entity:unknown}){
  if(!raw||typeof raw!=='object')return null;
  const entity=raw as Entity;
  const dates=[['P569','Birth'],['P570','Death']].flatMap(([property,label])=>values(entity,property).flatMap(v=>{
    if(!v||typeof v!=='object'||!('time'in v)||typeof v.time!=='string')return [];
    return [{label,time:v.time,precision:'precision'in v?String(v.precision):'unknown'}];
  }));
  const places=[['P19','Birthplace'],['P20','Death place'],['P119','Burial'],['P551','Residence']].flatMap(([property,label])=>values(entity,property).flatMap(v=>{
    if(!v||typeof v!=='object'||!('id'in v)||typeof v.id!=='string'||!/^Q\d+$/.test(v.id))return [];
    return [{label,qid:v.id}];
  }));
  const files=values(entity,'P18').filter((v):v is string=>typeof v==='string');
  return <div className="space-y-3 break-words" aria-label="Candidate evidence">
    {['uk','ru','en'].map(locale=>entity.labels?.[locale]||entity.descriptions?.[locale]?<div key={locale}>
      <p className="font-semibold">{locale.toUpperCase()} · {entity.labels?.[locale]?.value??entity.id}</p>
      {entity.descriptions?.[locale]?<p className="text-sm text-muted-foreground">{entity.descriptions[locale].value}</p>:null}
    </div>:null)}
    {dates.length?<dl className="space-y-1 text-sm">{dates.map((d,i)=><div key={`${d.label}:${i}`}><dt className="font-medium">{d.label}</dt><dd>{d.time} · precision {d.precision}</dd></div>)}</dl>:null}
    {places.length?<ul className="space-y-1 text-sm">{places.map((p,i)=><li key={`${p.label}:${i}`}>{p.label}: <a className="underline" href={`https://www.wikidata.org/wiki/${p.qid}`} target="_blank" rel="noopener noreferrer">{p.qid}</a></li>)}</ul>:null}
    <div className="flex flex-wrap gap-3 text-sm">{['uk','ru','en'].map(locale=>{
      const title=entity.sitelinks?.[`${locale}wiki`]?.title;
      return title?<a key={locale} className="underline" href={`https://${locale}.wikipedia.org/wiki/${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">Wikipedia {locale.toUpperCase()}</a>:null;
    })}</div>
    {files.map(file=><p key={file} className="text-sm">Commons: <a className="underline" href={`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`} target="_blank" rel="noopener noreferrer">{file}</a></p>)}
    <details><summary className="cursor-pointer text-sm">Source statements</summary><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(entity,null,2)}</pre></details>
  </div>;
}
