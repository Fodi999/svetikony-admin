import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyMultipartUpload } from "../../_lib/proxy";

/**
 * Same-origin proxy for the verified svet-ikony media upload endpoint.
 * Forwards the incoming multipart body untouched (see proxyMultipartUpload)
 * and the server-side admin token — never the file's contents — is the
 * only thing ever logged-worthy here, and this route doesn't log at all.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { code: "VALIDATION_ERROR", message: "Validation failed", details: "Request body is not valid multipart/form-data" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  return proxyMultipartUpload(UPSTREAM_ENDPOINTS.media.upload, formData);
}
