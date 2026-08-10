import { describe, it, expect } from "vitest";
import { currency, currencyCompact, bnNumber, formatDate, toBengaliDigits } from "@/lib/format";

describe("bangla formatting", () => {
  it("currency uses taka sign, bengali digits, lakh grouping", () => {
    expect(currency(1250)).toBe("৳১,২৫০");
    expect(currency(12345678)).toBe("৳১,২৩,৪৫,৬৭৮");
    expect(currency(0)).toBe("৳০");
    expect(currency(-500)).toBe("-৳৫০০");
  });
  it("compact abbreviates only at lakh and above", () => {
    expect(currencyCompact(5000)).toBe("৳৫,০০০");
    expect(currencyCompact(99999)).toBe("৳৯৯,৯৯৯");
    expect(currencyCompact(250000)).toBe("৳২.৫ লাখ");
    expect(currencyCompact(12345678)).toBe("৳১.৩ কোটি");
  });
  it("bnNumber handles decimal quantities", () => {
    expect(bnNumber(2.5)).toBe("২.৫");
    expect(bnNumber(12)).toBe("১২");
  });
  it("formatDate is fully bengali", () => {
    expect(formatDate("2026-08-10", "dd MMM yyyy")).toBe("১০ আগস্ট ২০২৬");
  });
  it("toBengaliDigits leaves non-digits alone", () => {
    expect(toBengaliDigits("SKU-2024")).toBe("SKU-২০২৪");
  });
});
