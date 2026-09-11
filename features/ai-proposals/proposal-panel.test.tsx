import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, it, expect, vi } from "vitest";
import { ProposalPanel } from "./proposal-panel";
vi.mock("@/components/feedback/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div role="dialog">
        {title}
        <button onClick={onConfirm}>Confirm human</button>
      </div>
    ) : null,
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup() {
  let applied = false;
  const mutations: string[] = [];
  const p = {
    id: "proposal",
    target_type: "calendar",
    target_id: "day",
    status: "pending",
    created_at: "2026-09-11",
    reason: "Review",
    before: { history: "Old", status: "published", title: "Day" },
    current: { history: "Old", status: "published" },
    patch: { history: "New", imageUrl: "https://example.invalid/image.png", seoTitle: "SEO" },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options: { method?: string }) => {
      if (options.method === "POST") {
        mutations.push(url);
        applied = true;
        return Response.json({ ...p, status: "applied" });
      }
      return Response.json(url.includes("?") ? (applied ? [] : [p]) : p);
    }),
  );
  const onApplied = vi.fn(async () => {});
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ProposalPanel targetId="day" onApplied={onApplied} />
    </QueryClientProvider>,
  );
  return { mutations, onApplied };
}
it("shows current/proposed and image; applies only after human confirmation and refreshes", async () => {
  const { mutations, onApplied } = setup();
  fireEvent.click(await screen.findByText("Переглянути"));
  await screen.findByText("New");
  expect(screen.getByText("Old")).toBeInTheDocument();
  expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.invalid/image.png");
  fireEvent.click(screen.getByRole("button", { name: "Застосувати" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent(
    "Ця дія змінить уже опублікований матеріал",
  );
  expect(mutations).toEqual([]);
  fireEvent.click(screen.getByText("Confirm human"));
  await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
  expect(mutations).toEqual(["/api/bff/ai-proposals/proposal/apply"]);
  await screen.findByText("Немає пропозицій");
});
it("reject does not invoke the target refresh/apply callback", async () => {
  const { mutations, onApplied } = setup();
  fireEvent.click(await screen.findByText("Переглянути"));
  fireEvent.click(await screen.findByText("Відхилити"));
  await waitFor(() => expect(mutations).toEqual(["/api/bff/ai-proposals/proposal/reject"]));
  expect(onApplied).not.toHaveBeenCalled();
});
