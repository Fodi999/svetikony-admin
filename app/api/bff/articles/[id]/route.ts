import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffArticleDto, type WorkerArticleDto, type WorkerArticleWritePayload } from "../_contract";

/** Same-origin proxy for the verified svet-ikony single-article endpoint.
 * Returns a BffArticleDto, not the raw Worker row. */
async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAndMap(`${UPSTREAM_ENDPOINTS.articles}/${encodeURIComponent(id)}`, undefined, (raw: WorkerArticleDto) =>
    toBffArticleDto(raw),
  );
}

async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as WorkerArticleWritePayload;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.articles}/${encodeURIComponent(id)}`,
    "PUT",
    payload,
    (raw: WorkerArticleDto) => toBffArticleDto(raw),
  );
}

/** Real backend semantics: a hard DELETE (see svet-ikony's
 * lib/d1/repositories/articles.ts's deleteArticle), not an archive. The
 * admin's `status: 'archived'` enum value already covers the "keep the
 * row, hide it" case as a normal status update via PUT — DELETE here is
 * genuinely permanent, matching the confirm-dialog copy already shown in
 * features/articles/article-list-view.tsx ("буде видалено безповоротно"). */
async function handleDelete(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(`${UPSTREAM_ENDPOINTS.articles}/${encodeURIComponent(id)}`, "DELETE", undefined, () => undefined);
}

export const GET = withAuth(POLICY.contentView, handleGet);
export const PUT = withAuth(POLICY.contentEdit, handlePut);
export const DELETE = withAuth(POLICY.contentEdit, handleDelete);
