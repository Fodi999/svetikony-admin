import type { NextRequest } from "next/server";
import { UPSTREAM_ENDPOINTS } from "@/lib/api/endpoints";
import { withAuth, type SafeUser } from "../../../_lib/auth";
import { proxyAndMap, proxyBinary } from "../../../_lib/proxy";
import { POLICY } from "../../../_lib/route-policies";
import type { WorkerVisualizerModelDto } from "../../_contract";

async function handleGet(
  _request: NextRequest,
  _session: { user: SafeUser },
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const metadata = await proxyAndMap(
    `${UPSTREAM_ENDPOINTS.visualizerModels}/${encodeURIComponent(id)}`,
    undefined,
    (model: WorkerVisualizerModelDto) => model,
  );
  if (!metadata.ok) return metadata;
  const model = (await metadata.json()) as WorkerVisualizerModelDto;
  // No arbitrary URLs or credentials are accepted from the browser.
  if (!/^media\/visualizer\/[a-zA-Z0-9_-]+\/model\/[a-f0-9-]+\.glb$/.test(model.r2Key)) {
    return Response.json(
      { code: "VALIDATION_ERROR", message: "Invalid model key" },
      { status: 400 },
    );
  }
  return proxyBinary(`/${model.r2Key}`);
}

export const GET = withAuth(POLICY.contentView, handleGet);
