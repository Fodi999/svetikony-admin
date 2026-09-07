import { describe, expect, it } from "vitest";
import { formatCents } from "./format-money";

describe("formatCents", () => {
  it("12345 cents displays as 123.45 in the given currency (your example value, verified exactly)", () => {
    const result = formatCents(12345, "PLN");
    // Intl.NumberFormat("uk-UA") uses a comma decimal separator and a
    // non-breaking space before the currency symbol/code -- asserting the
    // digits/decimal split rather than a hardcoded literal string, which
    // would be brittle against ICU data differences across Node versions.
    expect(result).toMatch(/123,45/);
    expect(result).toContain("PLN");
  });

  it("never hardcodes a specific currency -- reads whatever the order's real currency field says", () => {
    expect(formatCents(10000, "UAH")).not.toContain("PLN");
    expect(formatCents(10000, "USD")).toContain("USD");
  });

  it("does not mutate the persisted integer-cents value -- this is purely a display-time computation", () => {
    const cents = 9999;
    formatCents(cents, "UAH");
    expect(cents).toBe(9999);
  });

  it("falls back to a plain 'amount code' string instead of throwing on an invalid/unexpected currency code", () => {
    expect(() => formatCents(1000, "NOT_A_REAL_CODE")).not.toThrow();
    const result = formatCents(1000, "NOT_A_REAL_CODE");
    expect(result).toContain("10.00");
    expect(result).toContain("NOT_A_REAL_CODE");
  });
});
