import { type NextRequest } from "next/server";
import { POLICY } from "../../_lib/route-policies";
import { withAuth } from "../../_lib/auth";
import { readSessionCookie } from "@/lib/auth/cookie";
async function handle(
  request: NextRequest,
  _session: unknown,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join("/");
  if (
    !(request.method === "GET" && ["grants", "activity"].includes(path)) &&
    !(
      request.method === "POST" &&
      (path === "grants" || /^grants\/[a-zA-Z0-9-]+\/(revoke|pairing)$/.test(path))
    )
  )
    return Response.json({ error: "Unsupported route" }, { status: 404 });
  const base = process.env.SVET_IKONY_API_BASE_URL,
    token = process.env.SVET_IKONY_ADMIN_TOKEN;
  if (!base || !token) return Response.json({ error: "Upstream unavailable" }, { status: 503 });
  try {
    const r = await fetch(new URL("/api/admin/ai-access/" + path, base), {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Admin-Session": readSessionCookie(request)!,
        "Content-Type": "application/json",
      },
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
      // workerd supports follow/manual only; never forward credentials on redirects.
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    if (r.status >= 300 && r.status < 400) {
      await r.body?.cancel();
      return Response.json(
        { error: "Upstream redirect rejected" },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }
    return new Response(await r.text(), {
      status: r.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Upstream unavailable" }, { status: 502 });
  }
}
export const GET = withAuth(POLICY.aiAccess, handle);
export const POST = withAuth(POLICY.aiAccess, handle);
