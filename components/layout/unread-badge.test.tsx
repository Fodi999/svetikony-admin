import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UnreadBadge } from "./unread-badge";

describe("UnreadBadge", () => {
  it("renders nothing at count 0", () => {
    const { container } = render(<UnreadBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a negative count (defensive floor)", () => {
    const { container } = render(<UnreadBadge count={-1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the exact number for count 1", () => {
    render(<UnreadBadge count={1} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows the exact number for count 12", () => {
    render(<UnreadBadge count={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("caps at 99+ for count 100", () => {
    render(<UnreadBadge count={100} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("shows the exact number at the 99 boundary (not yet capped)", () => {
    render(<UnreadBadge count={99} />);
    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("uses a solid red background with white text, not the soft-tint status-badge style", () => {
    render(<UnreadBadge count={1} />);
    const badge = screen.getByText("1");
    expect(badge.className).toContain("bg-destructive");
    expect(badge.className).toContain("text-white");
  });
});
