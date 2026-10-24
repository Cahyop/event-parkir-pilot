import { describe, expect, it } from "vitest";

import {
  computeReport,
  formatDuration,
  formatRupiah,
  isPaid,
  makeTicketCode,
  normalizePlate,
  paymentStatusLabel,
} from "@/lib/parking";

describe("normalizePlate", () => {
  it("uppercases and collapses whitespace", () => {
    expect(normalizePlate("b  1234 abc")).toBe("B 1234 ABC");
  });
  it("strips non-alphanumeric characters", () => {
    expect(normalizePlate("b-1234!!ab")).toBe("B 1234 AB");
  });
  it("keeps a clean plate unchanged", () => {
    expect(normalizePlate("B 1234 ABC")).toBe("B 1234 ABC");
  });
});

describe("formatRupiah", () => {
  it("formats thousands with id-ID separators", () => {
    expect(formatRupiah(3000)).toBe("Rp 3.000");
  });
  it("rounds fractional values", () => {
    expect(formatRupiah(2500.6)).toBe("Rp 2.501");
  });
});

describe("formatDuration", () => {
  it("shows minutes only", () => {
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T10:05:00Z")).toBe("5 mnt");
  });
  it("shows hours and minutes", () => {
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T12:05:00Z")).toBe("2 jam 5 mnt");
  });
  it("shows whole hours without minutes", () => {
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T13:00:00Z")).toBe("3 jam");
  });
  it("never shows negative durations", () => {
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T09:00:00Z")).toBe("0 mnt");
  });
});

describe("makeTicketCode", () => {
  it("uses the PK-XXXX-XXX format", () => {
    expect(makeTicketCode()).toMatch(/^PK-[0-9A-Z]{4}-[0-9A-Z]{3}$/);
  });
});

describe("paymentStatusLabel and isPaid", () => {
  it("labels prepaid and paid_at_exit", () => {
    expect(paymentStatusLabel("prepaid")).toBe("Lunas di Awal");
    expect(paymentStatusLabel("paid_at_exit")).toBe("Lunas di Keluar");
    expect(paymentStatusLabel("unpaid")).toBe("Belum Bayar");
  });
  it("treats prepaid and paid_at_exit as paid", () => {
    expect(isPaid("prepaid")).toBe(true);
    expect(isPaid("paid_at_exit")).toBe(true);
    expect(isPaid("unpaid")).toBe(false);
  });
});

describe("computeReport", () => {
  const base = {
    tariff: 3000,
    payment_status: "unpaid" as const,
    exit_at: null as string | null,
  };

  it("counts totals and splits revenue correctly", () => {
    const r = computeReport([
      { ...base, payment_status: "prepaid" as const }, // inside, paid upfront
      { ...base }, // inside, unpaid
      { ...base, exit_at: "2026-01-01T12:00:00Z", payment_status: "paid_at_exit" as const },
      { ...base, exit_at: "2026-01-01T12:00:00Z", payment_status: "prepaid" as const },
    ]);
    expect(r.totalIn).toBe(4);
    expect(r.stillInside).toBe(2);
    expect(r.exited).toBe(2);
    expect(r.revenuePrepaid).toBe(6000); // one inside prepaid + one exited prepaid
    expect(r.revenueAtExit).toBe(3000);
    expect(r.revenueTotal).toBe(9000);
  });

  it("returns zeroed summary for an empty event", () => {
    const r = computeReport([]);
    expect(r.totalIn).toBe(0);
    expect(r.revenueTotal).toBe(0);
  });
});
