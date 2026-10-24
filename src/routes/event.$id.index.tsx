import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useState } from "react";
import { CloudOff, LogIn } from "lucide-react";
import { toast } from "sonner";

import { useTickets } from "@/hooks/use-tickets";
import { PlateInput } from "@/components/parking/plate-input";
import { TicketCard } from "@/components/parking/ticket-card";
import { formatRupiah } from "@/lib/parking";
import type { PaymentStatus, Ticket } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/event/$id/")({
  component: CheckInPage,
  head: () => ({
    meta: [
      { title: "Check-in Kendaraan — Parkir Event" },
      { name: "description", content: "Input nomor polisi, pilih status pembayaran, cetak karcis." },
    ],
  }),
});

function CheckInPage() {
  const event = useLoaderData({ from: "/event/$id" });
  const { tickets, pending, online, createTicket } = useTickets(event.id);
  const [typeIdx, setTypeIdx] = useState(0);
  const [plate, setPlate] = useState("");
  const [payment, setPayment] = useState<PaymentStatus>("unpaid");
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const vehicleTypes = event.vehicle_types.length
    ? event.vehicle_types
    : [{ name: "Motor", tariff: 3000 }];
  const selected = vehicleTypes[Math.min(typeIdx, vehicleTypes.length - 1)] ?? vehicleTypes[0]!;

  const submit = async () => {
    if (plate.trim().length < 2) {
      toast.error("Masukkan nomor polisi kendaraan");
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket({
        plate,
        vehicle_type: selected.name,
        tariff: selected.tariff,
        payment_status: payment,
      });
      setLastTicket(ticket);
      setPlate("");
      if (!online) toast.info("Karcis tersimpan di perangkat, akan tersinkron saat online");
      else toast.success(`Karcis ${ticket.code} dibuat`);
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyimpan karcis");
    } finally {
      setSubmitting(false);
    }
  };

  if (lastTicket) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-3 text-primary">
          <LogIn className="size-5" aria-hidden />
          <p className="font-display text-base font-bold">KENDARAAN MASUK TERCATAT</p>
        </div>
        <TicketCard
          ticket={lastTicket}
          event={event}
          onDone={() => setLastTicket(null)}
          doneLabel="Check-in Berikutnya"
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-3"
    >
      {pending > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/15 px-3 py-2 text-xs font-medium text-warning-foreground">
          <CloudOff className="size-3.5 shrink-0" aria-hidden />
          {pending} karcis menunggu sinkron otomatis saat online.
        </div>
      )}

      {/* Jenis Kendaraan */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Jenis Kendaraan
          </h2>
          {vehicleTypes.length === 1 && (
            <span className="text-[11px] font-bold text-primary">
              {formatRupiah(selected.tariff)}
            </span>
          )}
        </div>
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${Math.min(vehicleTypes.length, 3)}, minmax(0, 1fr))`,
          }}
        >
          {vehicleTypes.map((v, idx) => (
            <button
              key={v.name}
              type="button"
              onClick={() => setTypeIdx(idx)}
              className={cn(
                "flex h-12 items-center justify-between rounded-xl border-2 px-3 transition-colors",
                idx === typeIdx
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-accent",
              )}
            >
              <span className="font-display text-sm font-bold">{v.name}</span>
              <span className="tabular text-xs font-semibold">
                {formatRupiah(v.tariff)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Nomor Polisi */}
      <section>
        <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Nomor Polisi
        </h2>
        <PlateInput value={plate} onChange={setPlate} onSubmit={submit} />
      </section>

      {/* Status Pembayaran */}
      <section>
        <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Status Pembayaran
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPayment("prepaid")}
            className={cn(
              "flex h-14 flex-col justify-center rounded-xl border-2 px-3 text-left transition-colors",
              payment === "prepaid"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-accent",
            )}
          >
            <span className="font-display text-xs font-bold leading-tight">Bayar di Awal</span>
            <span className="tabular mt-0.5 text-xs font-bold text-primary">
              {formatRupiah(selected.tariff)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPayment("unpaid")}
            className={cn(
              "flex h-14 flex-col justify-center rounded-xl border-2 px-3 text-left transition-colors",
              payment === "unpaid"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-accent",
            )}
          >
            <span className="font-display text-xs font-bold leading-tight">Bayar Nanti</span>
            <span className="tabular mt-0.5 text-xs font-bold text-muted-foreground">
              {formatRupiah(0)}
            </span>
          </button>
        </div>
      </section>

      {/* Tombol Check-in & Cetak Karcis */}
      <Button
        type="submit"
        disabled={submitting}
        className="h-14 w-full text-base font-bold shadow-md"
        size="lg"
      >
        <LogIn className="size-5" aria-hidden />
        {submitting ? "Memproses…" : "CHECK-IN & CETAK KARCIS"}
      </Button>
    </form>
  );
}
