import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { toBffCalendarDayDto, type WorkerCalendarDayDto } from "../../_contract";

/** "Промпт для AI" -- generates directly from an admin-authored English
 * prompt, bypassing the saint-reference resolver. 60s timeout, same as
 * generate-image: a real OpenAI image call commonly takes 20-40s. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { prompt: string };
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/generate-image-prompt`,
    "POST",
    body,
    (raw: WorkerCalendarDayDto) => toBffCalendarDayDto(raw),
    60_000,
  );
}
