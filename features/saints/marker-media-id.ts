/** File namespace only; the CMS owner and geographic ID remain unchanged. */
export async function markerMediaId(kind: 'saint' | 'place', id: string): Promise<string> {
  if (/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return id;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${kind}:${id}`));
  return `marker-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
