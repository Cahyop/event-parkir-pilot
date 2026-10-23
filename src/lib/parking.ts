/**
 * Pure business logic for the event parking app.
 * Isomorphic: safe on server (SSR) and client.
 */

export function formatRupiah(value: number): string {
  const n = Math.round(value);
  return "Rp " + n.toLocaleString("id-ID");
}

/** Uppercase, trim, collapse whitespace. "b  1234 abc" -> "B 1234 ABC" */
export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function formatDuration(fromIso: string, toIso: string): string {
  const ms = Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} mnt`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} mnt`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/** Short ticket code, e.g. "PK-K3F9-8Z2" — QR payload is the code itself. */
export function makeTicketCode(): string {
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5).padEnd(3, "0");
  return `PK-${time}-${rand}`;
}

export type PaymentStatus = "unpaid" | "prepaid" | "paid_at_exit";

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "prepaid":
      return "Lunas di Awal";
    case "paid_at_exit":
      return "Lunas di Keluar";
    default:
      return "Belum Bayar";
  }
}

export function isPaid(status: PaymentStatus): boolean {
  return status === "prepaid" || status === "paid_at_exit";
}

export interface ReportSummary {
  totalIn: number;
  stillInside: number;
  exited: number;
  revenuePrepaid: number;
  revenueAtExit: number;
  revenueTotal: number;
}

export function computeReport(
  tickets: Array<{
    exit_at: string | null;
    tariff: number;
    payment_status: PaymentStatus;
  }>,
): ReportSummary {
  let totalIn = 0;
  let stillInside = 0;
  let exited = 0;
  let revenuePrepaid = 0;
  let revenueAtExit = 0;
  for (const t of tickets) {
    totalIn += 1;
    if (t.exit_at) {
      exited += 1;
      if (t.payment_status === "paid_at_exit") revenueAtExit += t.tariff;
      else if (t.payment_status === "prepaid") revenuePrepaid += t.tariff;
    } else {
      stillInside += 1;
      if (t.payment_status === "prepaid") revenuePrepaid += t.tariff;
    }
  }
  return {
    totalIn,
    stillInside,
    exited,
    revenuePrepaid,
    revenueAtExit,
    revenueTotal: revenuePrepaid + revenueAtExit,
  };
}
