import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffGospelDto, type WorkerGospelDto } from "../../../gospel/_contract";

/** 30s: fetches an external source page + one D1 insert, longer than the
 * 10s default (see proxy.ts's proxyJsonWrite doc comment). Creates a new
 * DRAFT Gospel reading pre-linked to this day -- never writes to the
 * calendar day itself. */
async function handlePost(_request: Request, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.calendarDays}/${encodeURIComponent(id)}/prepare-gospel`,
    "POST",
    undefined,
    (raw: WorkerGospelDto) => toBffGospelDto(raw),
    30_000,
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
