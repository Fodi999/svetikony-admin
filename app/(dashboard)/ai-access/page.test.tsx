import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import AiAccess from "./page";
vi.mock("@/components/layout/require-access", () => ({
  RequireAccess: ({ children }: { children: ReactNode }) => children,
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("clears a recovered read error and shows activity entity and outcome", async () => {
  let fail = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => (fail ? new Response("{}", { status: 502 }) : Response.json([]))),
  );
  render(<AiAccess />);
  const message = "Не вдалося виконати дію. Оновіть сторінку та перевірте стан перед повтором.";
  await screen.findByText(message);
  fail = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      Response.json(
        url.endsWith("activity")
          ? [
              {
                id: "activity",
                created_at: "2026-09-11T08:00:00Z",
                module: "visualizer",
                operation: "update",
                target_type: "events",
                target_id: "draft-fixture",
                status: "success",
              },
            ]
          : [],
      ),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Оновити" }));
  await waitFor(() => expect(screen.queryByText(message)).not.toBeInTheDocument());
  expect(screen.getByText(/events: draft-fixture/)).toHaveTextContent("Успішно");
  expect(screen.getByText(/Оновлено чернетку/)).toBeInTheDocument();
});
it("lets an active grant issue a new pairing code after a client restart", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      Response.json(
        url.endsWith("grants")
          ? [
              {
                id: "grant",
                mode: "DRAFT_EDIT",
                scopes: ["prayers.read"],
                createdAt: "2026-09-11T08:00:00Z",
                expiresAt: "2100-01-01T00:00:00Z",
                status: "active",
                connected: true,
                lastActivity: null,
              },
            ]
          : [],
      ),
    ),
  );
  render(<AiAccess />);
  expect(await screen.findByRole("button", { name: "Створити новий код" })).toBeEnabled();
  expect(screen.getByText("Публікація недоступна в цій версії")).toBeInTheDocument();
});
