import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyJsonWrite } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import { toBffVisualizerModelDto, type WorkerVisualizerModelDto } from "../../_contract";

async function handlePost(_request: NextRequest, _session: { user: SafeUser }, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyJsonWrite(
    `${UPSTREAM_ENDPOINTS.visualizerModels}/${encodeURIComponent(id)}/set-base-earth`,
    "POST",
    undefined,
    (raw: WorkerVisualizerModelDto) => toBffVisualizerModelDto(raw),
  );
}

export const POST = withAuth(POLICY.contentEdit, handlePost);
