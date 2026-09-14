import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import type { WorkerPreparedGospelReadingDto } from "../../_contract";

/**
 * Read-only counterpart to prepare-gospel/route.ts — resolves the day's
 * canonical Gospel citation without creating anything, for the AI
 * preparation review step ("don't mutate until the admin confirms the
 * plan"). Same 30s timeout as prepare-gospel: this hits the same external
 * OCA fetch, so the default 10s (proxyAndMap's GET path) would abort
 * before the Worker's own 15s upstream timeout could ever surface a clean
 * error — proxyJsonWrite is reused here (GET, no body) purely for its
 * configurable timeout.
 */
async function handleGet(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/gospel-preview`,
    "GET",
    undefined,
    (raw: WorkerPreparedGospelReadingDto) => raw,
    30_000,
  );
}

export const GET = withAuth(POLICY.contentEdit, handleGet);
