import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Users, Clock, LogOut, Banknote } from "lucide-react";

import { eventQueryOptions } from "./event.$id";
import { useTickets } from "@/hooks/use-tickets";
import {
  computeReport,
  formatDateTime,
  formatDuration,
  formatRupiah,
  normalizePlate,
  paymentStatusLabel,
} from "@/lib/parking";
import type { Ticket } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Filter = "all" | "inside" | "exited";

export const Route = createFileRoute("/event/$id/report")({
  component: ReportPage,
  head: () => ({
    meta: [
      { title: "Laporan Kas — Parkir Event" },
      { name: "description", content: "Ringkasan pendapatan kas realtime dan riwayat transaksi." },
    ],
  }),
});

function ReportPage() {
  const event = useLoaderData({ from: "/event/$id" });
  const { tickets, pending, online } = useTickets(event.id);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const report = useMemo(() => computeReport(tickets), [tickets]);

  const filtered = useMemo(() => {
    const q = normalizePlate(query);
    return tickets.filter((t) => {
      if (filter === "inside" && t.exit_at) return false;
      if (filter === "exited" && !t.exit_at) return false;
      if (q && !normalizePlate(t.plate).includes(q) && !t.code.toUpperCase().includes(q))
        return false;
      return true;
    });
  }, [tickets, filter, query]);

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "Semua" },
    { id: "inside", label: "Di Dalam" },
    { id: "exited", label: "Keluar" },
  ];

  return (
    <div className="space-y-5">
      {!online && (
        <p className="rounded-xl bg-warning/15 px-3 py-2 text-sm font-medium text-warning-foreground">
          Mode offline — data dari perangkat ini.
        </p>
      )}
      {online && pending > 0 && (
        <p className="rounded-xl bg-warning/15 px-3 py-2 text-sm font-medium text-warning-foreground">
          {pending} transaksi menunggu sinkron.
        </p>
      )}

      <section className="grid grid-cols-2 gap-2">
        <SummaryCard icon={<Users className="size-4" aria-hidden />} label="Total Masuk" value={String(report.totalIn)} />
        <SummaryCard icon={<Clock className="size-4" aria-hidden />} label="Masih di Dalam" value={String(report.stillInside)} />
        <SummaryCard icon={<LogOut className="size-4" aria-hidden />} label="Sudah Keluar" value={String(report.exited)} />
        <div className="col-span-2 rounded-xl border-2 border-primary bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-primary">
            <Banknote className="size-4" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest">Uang Masuk</span>
          </div>
          <p className="tabular mt-1 font-display text-3xl font-bold text-foreground">
            {formatRupiah(report.revenueTotal)}
          </p>
          <p className="tabular mt-1 text-xs text-muted-foreground">
            Lunas di awal {formatRupiah(report.revenuePrepaid)} · Lunas di keluar{" "}
            {formatRupiah(report.revenueAtExit)}
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-9 rounded-full px-3.5 text-xs font-bold uppercase tracking-wide transition-colors",
                  filter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nopol…"
            className="tabular h-11 pl-9 text-base uppercase"
            aria-label="Cari nomor polisi di riwayat"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Tidak ada transaksi yang cocok.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <TicketRow key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <p className="tabular mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="tabular truncate font-display text-base font-bold">{ticket.plate}</p>
        <p className="tabular truncate text-xs text-muted-foreground">
          {ticket.code} · {ticket.vehicle_type} · masuk {formatDateTime(ticket.entry_at)}
          {ticket.exit_at ? ` · keluar ${formatDateTime(ticket.exit_at)} · ${formatDuration(ticket.entry_at, ticket.exit_at)}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="tabular font-display text-sm font-bold">{formatRupiah(ticket.tariff)}</p>
        <span
          className={cn(
            "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            ticket.payment_status === "unpaid"
              ? "bg-warning/20 text-warning-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          {ticket.exit_at ? paymentStatusLabel(ticket.payment_status) : ticket.payment_status === "prepaid" ? "Lunas" : "Belum Bayar"}
        </span>
      </div>
    </div>
  );
}
