import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffCalendarDayDto, type WorkerCalendarDayDto } from "../../_contract";

/** "Обрати з медіатеки" -- assigns an already-uploaded R2 key/URL directly. */
async function handlePut(request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { imageUrl: string };
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/image`,
    "PUT",
    body,
    (raw: WorkerCalendarDayDto) => toBffCalendarDayDto(raw),
  );
}

export const PUT = withAuth(POLICY.contentEdit, handlePut);
