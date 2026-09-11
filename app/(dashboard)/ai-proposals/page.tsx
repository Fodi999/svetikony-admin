"use client";
import { RequireAccess } from "@/components/layout/require-access";
import { ProposalPanel } from "@/features/ai-proposals/proposal-panel";
export default function AiProposalsPage() {
  return (
    <RequireAccess area="settings">
      <ProposalPanel list />
    </RequireAccess>
  );
}
