import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TranslationSwitcher } from "./translation-switcher";

describe("TranslationSwitcher", () => {
  it("renders one tab per language with the active one marked selected", () => {
    render(
      <TranslationSwitcher
        active="uk"
        onSelect={() => {}}
        completeness={{ uk: "done", ru: "partial", en: "empty" }}
      />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole("tab", { name: /UK/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /RU/ })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelect with the clicked language", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <TranslationSwitcher
        active="uk"
        onSelect={onSelect}
        completeness={{ uk: "done", ru: "empty", en: "empty" }}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /RU/ }));
    expect(onSelect).toHaveBeenCalledWith("ru");
  });
});
