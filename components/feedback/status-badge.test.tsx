import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the Ukrainian label for draft", () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText("Чернетка")).toBeInTheDocument();
  });

  it("renders the Ukrainian label for published", () => {
    render(<StatusBadge status="published" />);
    expect(screen.getByText("Опубліковано")).toBeInTheDocument();
  });

  it("renders the Ukrainian label for archived", () => {
    render(<StatusBadge status="archived" />);
    expect(screen.getByText("Архів")).toBeInTheDocument();
  });
});
