import { NextRequest } from 'next/server';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mockAuthenticatedFetch, withSessionCookie } from '../../../_lib/test-support';
import { GET } from './route';
const key = 'media/visualizer/event-1/model/11111111-1111-4111-8111-111111111111.glb';
beforeEach(() => {
  vi.stubEnv('SVET_IKONY_API_BASE_URL', 'https://site.example');
  vi.stubEnv('SVET_IKONY_ADMIN_TOKEN', 'private-upstream-token');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('authenticated same-origin GLB delivery', () => {
  it('streams a model without exposing the upstream credential or requiring CORS', async () => {
    const fetcher = mockAuthenticatedFetch('viewer', (input) => String(input).includes('/api/admin/church-content/')
      ? Response.json({ r2Key: key }) : new Response(new Uint8Array([103, 108, 84, 70])));
    vi.stubGlobal('fetch', fetcher);
    const response = await GET(new NextRequest('http://admin.example/api/bff/visualizer-models/one/file', withSessionCookie()), { params: Promise.resolve({ id: 'one' }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('model/gltf-binary');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('glTF');
  });
  it('rejects unauthenticated requests before reading any file', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await GET(new NextRequest('http://admin.example/api/bff/visualizer-models/one/file'), { params: Promise.resolve({ id: 'one' }) });
    expect(response.status).toBe(401); expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects metadata pointing outside the visualizer storage namespace', async () => {
    vi.stubGlobal('fetch', mockAuthenticatedFetch('viewer', () => Response.json({ r2Key: 'https://untrusted.example/model.glb' })));
    const response = await GET(new NextRequest('http://admin.example/api/bff/visualizer-models/one/file', withSessionCookie()), { params: Promise.resolve({ id: 'one' }) });
    expect(response.status).toBe(400);
  });
});
