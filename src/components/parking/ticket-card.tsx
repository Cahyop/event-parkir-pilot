import { QRCode } from "qrcode";
import { useEffect, useState } from "react";
import { Printer, Smartphone } from "lucide-react";

import { formatDateTime, formatRupiah, paymentStatusLabel } from "@/lib/parking";
import type { ParkingEvent, Ticket } from "@/lib/types";
import { bluetoothPrintAvailable, printTicketBluetooth } from "@/lib/escpos";
import { printTicketBrowser } from "@/lib/ticket-print";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TicketCardProps {
  ticket: Ticket;
  event: ParkingEvent;
  onDone?: () => void;
  doneLabel?: string;
}

export function TicketCard({ ticket, event, onDone, doneLabel }: TicketCardProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [printing, setPrinting] = useState<"bluetooth" | "browser" | null>(null);
  const bluetoothOk = bluetoothPrintAvailable();

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(ticket.code, { margin: 1, width: 240, errorCorrectionLevel: "M" })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ticket.code]);

  const printData = () => ({
    eventName: event.name,
    code: ticket.code,
    plate: ticket.plate,
    vehicleType: ticket.vehicle_type,
    tariff: ticket.tariff,
    statusLabel: paymentStatusLabel(ticket.payment_status).toUpperCase(),
    entryAt: formatDateTime(ticket.entry_at),
  });

  const printBt = async () => {
    setPrinting("bluetooth");
    try {
      await printTicketBluetooth(printData(), { widthMm: 58 });
      toast.success("Tiket terkirim ke printer");
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error && e.message === "Web Bluetooth tidak tersedia di browser ini"
          ? e.message
          : "Gagal mencetak via Bluetooth. Coba koneksi ulang printer atau gunakan cetak browser.",
      );
    } finally {
      setPrinting(null);
    }
  };

  const printBrowser = async () => {
    setPrinting("browser");
    try {
      await printTicketBrowser(printData());
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Gagal membuka jendela cetak.");
    } finally {
      setPrinting(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-2 text-primary-foreground">
        <span className="font-display text-sm font-bold tracking-wide">KARCIS PARKIR</span>
        <span className="tabular font-display text-sm font-bold">{ticket.code}</span>
      </div>
      <div className="space-y-2 p-4">
        <Row label="Nomor Polisi" value={ticket.plate} strong />
        <Row label="Jenis Kendaraan" value={ticket.vehicle_type} />
        <Row label="Tarif" value={formatRupiah(ticket.tariff)} />
        <Row
          label="Status"
          value={
            ticket.payment_status === "unpaid"
              ? "Bayar Saat Keluar"
              : paymentStatusLabel(ticket.payment_status)
          }
        />
        <Row label="Jam Masuk" value={formatDateTime(ticket.entry_at)} />
        {qr && (
          <div className="flex flex-col items-center pt-2">
            <img src={qr} alt={`QR code karcis ${ticket.code}`} width={160} height={160} />
            <p className="mt-1 text-xs text-muted-foreground">Scan QR saat keluar</p>
          </div>
        )}
      </div>
      <div className="space-y-2 border-t border-border bg-muted/50 p-4">
        {bluetoothOk ? (
          <Button
            onClick={printBt}
            disabled={printing !== null}
            className="h-13 w-full text-base font-bold"
            size="lg"
          >
            <Printer className="size-5" aria-hidden />
            {printing === "bluetooth" ? "Mengirim ke printer…" : "Cetak Thermal (Bluetooth)"}
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Cetak Bluetooth tersedia di Android (Chrome). Gunakan tombol di bawah di perangkat lain.
          </p>
        )}
        <Button
          onClick={printBrowser}
          disabled={printing !== null}
          variant="outline"
          className="h-12 w-full text-sm font-semibold"
        >
          <Smartphone className="size-4" aria-hidden />
          Cetak via Browser
        </Button>
        {onDone && (
          <Button
            onClick={onDone}
            variant="secondary"
            className="h-12 w-full text-sm font-semibold"
          >
            {doneLabel ?? "Selesai"}
          </Button>
        )}
      </div>
    </div>
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
