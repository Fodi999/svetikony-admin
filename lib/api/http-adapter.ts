import type { ApiClient } from "@/lib/api/client";
import { alphabetLettersHttpResource } from "@/lib/api/http/alphabet";
import { mediaHttpResource } from "@/lib/api/http/media";
import { prayersHttpResource } from "@/lib/api/http/prayers";
import { mockApiAdapter } from "@/lib/api/mock-adapter";

/**
 * Stage 2, Alphabet + Prayers READ, plus Stage 2D's real media upload.
 * Every other resource still delegates to the mock adapter — no other
 * module has been verified against the real svet-ikony API yet, and this
 * keeps the rest of the app fully functional while only these switch to
 * real data. Alphabet/Prayers writes throw a controlled `not_implemented`
 * ApiError (see lib/api/http/*.ts) — they do not fall back to the mock
 * store, so a write attempted in real-API mode never silently "succeeds"
 * without touching D1.
 *
 * `media` is a special case: it fully replaces MockApiAdapter's media
 * resource rather than only overriding one method, but only `uploadObject`
 * is real — `upload`/`list`/`remove` throw `not_implemented` too, and
 * nothing in features/media/** calls `uploadObject` yet (Stage 2D
 * deliberately doesn't wire it into any form).
 */
export function createHttpApiAdapter(): ApiClient {
  return {
    ...mockApiAdapter,
    alphabetLetters: alphabetLettersHttpResource,
    prayers: prayersHttpResource,
    media: mediaHttpResource,
  };
}
