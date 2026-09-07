import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth } from "../../_lib/auth";
import { proxyAndMap, proxyJsonWrite } from "../../_lib/proxy";
import { POLICY } from "../../_lib/route-policies";
import { toBffTelegramPostDto, type WorkerTelegramPostDto, type WorkerTelegramPostWritePayload } from "./_contract";

/** Admin "Публікації" tab: full history, newest first. */
async function handleGet() {
  return proxyAndMap(UPSTREAM_ENDPOINTS.telegram.posts, undefined, (raw: WorkerTelegramPostDto[]) => raw.map(toBffTelegramPostDto));
}

/** Creates a draft (or 'scheduled' if the composer set a date — nothing
 * currently acts on that field, see the plan's "no Cron this stage"). */
async function handlePost(request: Request) {
  const payload = (await request.json()) as WorkerTelegramPostWritePayload;
  return proxyJsonWrite(UPSTREAM_ENDPOINTS.telegram.posts, "POST", payload, (raw: WorkerTelegramPostDto) => toBffTelegramPostDto(raw));
}

export const GET = withAuth(POLICY.telegramView, handleGet);
export const POST = withAuth(POLICY.telegramEdit, handlePost);
