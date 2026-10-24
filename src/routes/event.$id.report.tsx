import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Banknote, Clock, FileDown, LogOut, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { useTickets } from "@/hooks/use-tickets";
import {
  computeReport,
  formatDateTime,
  formatDuration,
  formatRupiah,
  normalizePlate,
  paymentStatusLabel,
} from "@/lib/parking";
import { exportReportPdf } from "@/lib/report-pdf";
import type { Ticket } from "@/lib/types";
import { Button } from "@/components/ui/button";
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

  const handleExportPdf = () => {
    try {
      const activeFilterLabel = filters.find((f) => f.id === filter)?.label ?? "Semua";
      exportReportPdf({
        event,
        tickets,
        filteredTickets: filtered,
        filterLabel: activeFilterLabel,
        report,
      });
      toast.success("Membuka dokumen PDF untuk dicetak atau disimpan.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Gagal membuka jendela cetak PDF.");
    }
  };

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

      {/* Ringkasan Kendaraan & Pendapatan */}
      <section className="space-y-2">
        {/* Total Masuk Sendiri di Atas */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                Total Masuk
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Total seluruh transaksi</span>
          </div>
          <p className="tabular mt-2 font-display text-3xl font-extrabold text-foreground">
            {report.totalIn}{" "}
            <span className="text-sm font-normal text-muted-foreground">kendaraan</span>
          </p>
        </div>

        {/* Masih di Dalam & Sudah Keluar Disandingkan */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Clock className="size-4 shrink-0" aria-hidden />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Masih di Dalam
              </span>
            </div>
            <p className="tabular mt-1.5 font-display text-2xl font-bold text-foreground">
              {report.stillInside}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Belum check-out</p>
          </div>

          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <LogOut className="size-4 shrink-0" aria-hidden />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Sudah Keluar
              </span>
            </div>
            <p className="tabular mt-1.5 font-display text-2xl font-bold text-foreground">
              {report.exited}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Selesai parkir</p>
          </div>
        </div>

        {/* Total Uang Masuk */}
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-primary">
            <Banknote className="size-5" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-widest">Total Uang Masuk</span>
          </div>
          <p className="tabular mt-1.5 font-display text-3xl font-extrabold text-foreground">
            {formatRupiah(report.revenueTotal)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              Lunas di awal:{" "}
              <strong className="text-foreground">{formatRupiah(report.revenuePrepaid)}</strong>
            </span>
            <span>·</span>
            <span>
              Lunas di keluar:{" "}
              <strong className="text-foreground">{formatRupiah(report.revenueAtExit)}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Tabel & Daftar Transaksi */}
      <section className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
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

          <Button
            onClick={handleExportPdf}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 font-bold shadow-sm"
          >
            <FileDown className="size-4" aria-hidden />
            Export PDF
          </Button>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nopol atau kode karcis…"
            className="tabular h-11 pl-9 text-base uppercase"
            aria-label="Cari nomor polisi di riwayat"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Tidak ada transaksi yang cocok.
          </p>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((t) => (
              <TicketRow key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const isInside = !ticket.exit_at;
  const duration = formatDuration(ticket.entry_at, ticket.exit_at ?? new Date().toISOString());

  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-card p-3.5 shadow-sm transition-colors">
      {/* Baris 1: Plat Nomor, Jenis, & Tarif */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-bold tracking-wide text-foreground">
            {ticket.plate}
          </span>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
            {ticket.vehicle_type}
          </span>
        </div>
        <div className="text-right">
          <span className="tabular font-display text-base font-bold text-foreground">
            {formatRupiah(ticket.tariff)}
          </span>
        </div>
      </div>

      {/* Baris 2: Detail Jam Masuk, Jam Keluar, & Durasi */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Jam Masuk
          </span>
          <span className="tabular font-medium text-foreground">
            {formatDateTime(ticket.entry_at)}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Jam Keluar
          </span>
          <span className="tabular font-medium text-foreground">
            {ticket.exit_at ? formatDateTime(ticket.exit_at) : "—"}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Durasi
          </span>
          <span className="tabular font-semibold text-foreground">{duration}</span>
        </div>
      </div>

      {/* Baris 3: Kode Karcis & Status Pembayaran / Lokasi */}
      <div className="flex items-center justify-between pt-0.5 text-xs text-muted-foreground">
        <span className="tabular font-mono text-[11px] font-medium">{ticket.code}</span>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              isInside
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            )}
          >
            {isInside ? "Di Dalam" : "Sudah Keluar"}
          </span>
          <span
            className={cn(
              "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              ticket.payment_status === "unpaid"
                ? "bg-warning/20 text-warning-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            {ticket.exit_at
              ? paymentStatusLabel(ticket.payment_status)
              : ticket.payment_status === "prepaid"
                ? "Lunas di Awal"
                : "Belum Bayar"}
          </span>
        </div>
      </div>
    </div>
  );
}
