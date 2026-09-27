import {expect,it} from 'vitest';
import {markerMediaId} from './marker-media-id';
it('preserves existing safe namespaces',async()=>{expect(await markerMediaId('saint','abc-123')).toBe('abc-123');});
it.each(['wd:Q123','manual:abc','a/b','x'.repeat(200)])('makes a safe stable namespace for %s',async id=>{
 const result=await markerMediaId('place',id);
 expect(result).toMatch(/^[a-zA-Z0-9_-]{1,128}$/);
 expect(await markerMediaId('place',id)).toBe(result);
 expect(await markerMediaId('saint',id)).not.toBe(result);
});
it('does not conflate punctuation variants',async()=>{expect(await markerMediaId('place','wd:Q123')).not.toBe(await markerMediaId('place','wd_Q123'));});
