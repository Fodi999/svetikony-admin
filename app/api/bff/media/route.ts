import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../_lib/proxy";

/**
 * Same-origin proxy for the verified svet-ikony media delete endpoint
 * (Stage 2D built the Worker route; Stage 2H is its first real caller —
 * orphan cleanup of not-yet-saved uploads). Body is `{ key: string }`, the
 * R2 object key returned by a prior upload.
 */
export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { code: "VALIDATION_ERROR", message: "Validation failed", details: "Request body must be JSON" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  // The Worker returns { key, deleted: true } (200), not an empty 204 like
  // calendar-days' delete — nothing sensitive in it, so pass it through
  // rather than mapping to undefined (which Response.json() can't encode).
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.media.delete, "DELETE", body, (raw: { key: string; deleted: boolean }) => raw);
}
