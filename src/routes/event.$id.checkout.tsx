import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Banknote, LogOut, Search } from "lucide-react";
import { toast } from "sonner";

import { eventQueryOptions } from "./event.$id";
import { useTickets } from "@/hooks/use-tickets";
import { QrScanner } from "@/components/parking/qr-scanner";
import { normalizePlate, formatDuration, formatDateTime, formatRupiah, paymentStatusLabel } from "@/lib/parking";
import { fetchAndCacheTicket } from "@/lib/ticket-store";
import type { Ticket } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/event/$id/checkout")({
  component: CheckOutPage,
  head: () => ({
    meta: [
      { title: "Check-out Kendaraan — Parkir Event" },
      { name: "description", content: "Scan QR karcis atau cari nomor polisi untuk proses keluar." },
    ],
  }),
});

function CheckOutPage() {
  const event = useLoaderData({ from: "/event/$id" });
  const { tickets, online, createTicket, updateTicket, refresh } = useTickets(event.id);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  const results = useMemo(() => {
    const raw = query.trim().toUpperCase();
    if (!raw) return [];
    const plateQuery = normalizePlate(raw);
    return tickets
      .filter(
        (t) =>
          (t.exit_at === null || t.exit_at) &&
          (plateQuery && normalizePlate(t.plate).includes(plateQuery) ||
            t.code.toUpperCase().includes(raw)),
      )
      .slice(0, 5);
  }, [tickets, query]);

  const selectTicket = (t: Ticket) => {
    setSelectedId(t.id);
    setQuery("");
  };

  const onScan = async (text: string) => {
    const code = text.trim().toUpperCase();
    let found: Ticket | undefined = tickets.find((t) => t.code.toUpperCase() === code);
    if (!found && online) {
      setSearching(true);
      try {
        const fetched = await fetchAndCacheTicket(event.id, code);
        if (fetched) {
          found = fetched;
          await refresh();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }
    if (found) {
      selectTicket(found);
    } else {
      toast.error(`Karcis ${code} tidak ditemukan di event ini`);
    }
  };

  const markPaidThenExit = async (ticket: Ticket) => {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      if (ticket.payment_status === "unpaid") {
        await updateTicket(ticket.id, { payment_status: "paid_at_exit" });
      }
      const updated = await updateTicket(ticket.id, { exit_at: now });
      if (!online) toast.info("Tersimpan offline, akan tersinkron saat online");
      else toast.success(`Kendaraan ${ticket.plate} keluar`);
      if (updated) selectTicket(updated);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memproses keluar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {searching && <p className="text-sm text-muted-foreground">Mencari karcis di server…</p>}

      <QrScanner onResult={onScan} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nopol atau kode karcis…"
          className="tabular h-12 pl-9 text-base uppercase"
          aria-label="Cari nomor polisi atau kode karcis"
        />
      </div>

      {results.length > 0 && !selected && (
        <div className="space-y-2">
          {results.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTicket(t)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
            >
              <div>
                <p className="tabular font-display text-base font-bold">{t.plate}</p>
                <p className="tabular text-xs text-muted-foreground">
                  {t.code} · {t.vehicle_type} · {formatDateTime(t.entry_at)}
                </p>
              </div>
              <PaymentBadge ticket={t} />
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div
            className={cn(
              "px-4 py-2 text-center font-display text-sm font-bold tracking-wide",
              selected.exit_at ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            {selected.exit_at ? "KENDARAAN SUDAH KELUAR" : "DETAIL KARCIS"}
          </div>
          <div className="space-y-2 p-4">
            <Row label="Nomor Polisi" value={selected.plate} strong />
            <Row label="Kode Karcis" value={selected.code} />
            <Row label="Jenis Kendaraan" value={selected.vehicle_type} />
            <Row label="Jam Masuk" value={formatDateTime(selected.entry_at)} />
            <Row label="Jam Keluar" value={selected.exit_at ? formatDateTime(selected.exit_at) : formatDateTime(new Date().toISOString())} />
            <Row
              label="Durasi"
              value={formatDuration(
                selected.entry_at,
                selected.exit_at ?? new Date().toISOString(),
              )}
            />
            <Row
              label="Status"
              value={
                selected.payment_status === "unpaid"
                  ? "Belum Bayar"
                  : paymentStatusLabel(selected.payment_status)
              }
            />
            <Row label="Tarif" value={formatRupiah(selected.tariff)} />
          </div>
          <div className="space-y-2 border-t border-border bg-muted/50 p-4">
            {selected.exit_at ? (
              <Button
                variant="secondary"
                className="h-12 w-full font-semibold"
                onClick={() => setSelectedId(null)}
              >
                Proses Kendaraan Lain
              </Button>
            ) : (
              <>
                {selected.payment_status === "unpaid" && (
                  <div className="flex items-center justify-between rounded-xl bg-warning/15 px-4 py-3">
                    <span className="text-sm font-semibold text-warning-foreground">
                      Belum bayar — tagih saat keluar
                    </span>
                    <span className="tabular font-display text-lg font-bold text-warning-foreground">
                      {formatRupiah(selected.tariff)}
                    </span>
                  </div>
                )}
                <Button
                  onClick={() => markPaidThenExit(selected)}
                  disabled={busy}
                  className="h-16 w-full text-lg font-bold"
                  size="lg"
                >
                  {selected.payment_status === "unpaid" ? (
                    <>
                      <Banknote className="size-6" aria-hidden />
                      {busy ? "Memproses…" : `BAYAR & KELUAR (${formatRupiah(selected.tariff)})`}
                    </>
                  ) : (
                    <>
                      <LogOut className="size-6" aria-hidden />
                      {busy ? "Memproses…" : "KONFIRMASI KELUAR"}
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  className="h-12 w-full font-semibold"
                  onClick={() => setSelectedId(null)}
                  disabled={busy}
                >
                  Batal
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {!selected && results.length === 0 && !query && tickets.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Belum ada kendaraan tercatat di event ini.
        </p>
      )}
    </div>
  );
}

function PaymentBadge({ ticket }: { ticket: Ticket }) {
  const label =
    ticket.payment_status === "unpaid"
      ? "Belum Bayar"
      : paymentStatusLabel(ticket.payment_status);
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        ticket.payment_status === "unpaid"
          ? "bg-warning/20 text-warning-foreground"
          : "bg-primary/10 text-primary",
      )}
    >
      {label}
    </span>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          strong
            ? "tabular font-display text-lg font-bold tracking-wide text-foreground"
            : "tabular font-semibold text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
