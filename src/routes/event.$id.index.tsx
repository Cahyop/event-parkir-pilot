import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bluetooth,
  CloudOff,
  Eye,
  FileText,
  HelpCircle,
  LogIn,
  Printer,
  Unlink,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { useTickets } from "@/hooks/use-tickets";
import { PlateInput } from "@/components/parking/plate-input";
import { TicketCard } from "@/components/parking/ticket-card";
import { TemplateSelectorDialog } from "@/components/parking/template-selector-dialog";
import { PrinterGuideDialog } from "@/components/parking/printer-guide-dialog";
import { formatDateTime, formatRupiah, paymentStatusLabel } from "@/lib/parking";
import {
  bluetoothPrintAvailable,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getConnectedPrinterName,
  isBluetoothPrinterConnected,
  printTicketBluetooth,
} from "@/lib/escpos";
import {
  getTicketTemplate,
  TICKET_TEMPLATES,
  type TicketTemplate,
} from "@/lib/ticket-settings";
import type { PaymentStatus, Ticket } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/event/$id/")({
  component: CheckInPage,
  head: () => ({
    meta: [
      { title: "Check-in Kendaraan — Parkir Event" },
      { name: "description", content: "Input nomor polisi, pilih status pembayaran, cetak karcis langsung." },
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

  // Status Bluetooth & Template
  const [printerConnected, setPrinterConnected] = useState(() => isBluetoothPrinterConnected());
  const [printerName, setPrinterName] = useState(() => getConnectedPrinterName());
  const [template, setTemplate] = useState<TicketTemplate>(() => getTicketTemplate());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPrinterGuide, setShowPrinterGuide] = useState(false);

  const btAvailable = bluetoothPrintAvailable();
  const currentTemplate =
    TICKET_TEMPLATES.find((t) => t.id === template) || TICKET_TEMPLATES[0]!;

  const vehicleTypes = event.vehicle_types.length
    ? event.vehicle_types
    : [{ name: "Motor", tariff: 3000 }];
  const selected = vehicleTypes[Math.min(typeIdx, vehicleTypes.length - 1)] ?? vehicleTypes[0]!;

  const handleConnectPrinter = async () => {
    try {
      const name = await connectBluetoothPrinter();
      setPrinterName(name);
      setPrinterConnected(true);
      toast.success(`Printer "${name}" siap digunakan!`);
    } catch (e) {
      if (e instanceof Error && e.name === "UserCancelledError") {
        toast.info(e.message, {
          action: {
            label: "Bantuan",
            onClick: () => setShowPrinterGuide(true),
          },
        });
        return;
      }
      toast.error(e instanceof Error ? e.message : "Gagal menyambung printer", {
        action: {
          label: "Bantuan",
          onClick: () => setShowPrinterGuide(true),
        },
      });
    }
  };

  const handleDisconnectPrinter = () => {
    disconnectBluetoothPrinter();
    setPrinterConnected(false);
    setPrinterName(null);
    toast.info("Koneksi printer diputuskan");
  };

  /** Check-in dan LANGSUNG cetak ke printer Bluetooth tanpa membuka preview */
  const submitDirectPrint = async () => {
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

      const printData = {
        eventName: event.name,
        code: ticket.code,
        plate: ticket.plate,
        vehicleType: ticket.vehicle_type,
        tariff: ticket.tariff,
        statusLabel: paymentStatusLabel(ticket.payment_status).toUpperCase(),
        entryAt: formatDateTime(ticket.entry_at),
      };

      try {
        await printTicketBluetooth(printData, { widthMm: 58, template });
        // Berhasil cetak: langsung bersihkan input plat nopol untuk kendaraan berikutnya
        setPlate("");
        setPrinterConnected(true);
        setPrinterName(getConnectedPrinterName());
        toast.success(`Karcis ${ticket.code} dicetak!`, {
          description: `${ticket.plate} · Siap kendaraan berikutnya`,
        });
      } catch (printErr) {
        console.error(printErr);
        // Jika gagal cetak, tampilkan tiket card agar data tidak hilang & bisa cetak manual
        setLastTicket(ticket);
        const errMsg = printErr instanceof Error ? printErr.message : "Koneksi printer terputus";
        toast.error(`Karcis tersimpan, namun gagal cetak: ${errMsg}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyimpan karcis");
    } finally {
      setSubmitting(false);
    }
  };

  /** Check-in biasa dengan pratinjau kartu karcis */
  const submitWithPreview = async () => {
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
    <div className="space-y-3">
      {pending > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/15 px-3 py-2 text-xs font-medium text-warning-foreground">
          <CloudOff className="size-3.5 shrink-0" aria-hidden />
          {pending} karcis menunggu sinkron otomatis saat online.
        </div>
      )}

      {/* Bar Pengaturan Cepat: Status Printer & Format Struk */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-2 text-xs">
        {/* Status Bluetooth */}
        {printerConnected ? (
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <Bluetooth className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-foreground">
              {printerName || "Printer Siap"}
            </span>
            <button
              type="button"
              onClick={handleDisconnectPrinter}
              title="Putuskan sambungan printer"
              className="ml-1 text-muted-foreground hover:text-destructive"
            >
              <Unlink className="size-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConnectPrinter}
              className="flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              <Bluetooth className="size-3.5" />
              <span>Sambungkan Printer</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPrinterGuide(true)}
              className="text-muted-foreground hover:text-foreground"
              title="Panduan cara menyambungkan printer"
            >
              <HelpCircle className="size-3.5" />
            </button>
          </div>
        )}

        {/* Pilihan Format Karcis */}
        <button
          type="button"
          onClick={() => setShowTemplateModal(true)}
          className="flex items-center gap-1 rounded-md bg-muted/80 px-2 py-1 font-semibold text-foreground hover:bg-muted"
        >
          <FileText className="size-3 text-primary" />
          <span>{currentTemplate.name}</span>
          <span className="text-[10px] text-muted-foreground">({currentTemplate.savings})</span>
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (btAvailable) {
            void submitDirectPrint();
          } else {
            void submitWithPreview();
          }
        }}
        className="space-y-3"
      >
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
          <PlateInput
            value={plate}
            onChange={setPlate}
            onSubmit={() => {
              if (btAvailable) {
                void submitDirectPrint();
              } else {
                void submitWithPreview();
              }
            }}
          />
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

        {/* Tombol Aksi: Langsung Cetak vs Pratinjau Karcis */}
        <div className="space-y-2 pt-1">
          {/* Tombol Utama: Langsung Cetak Tanpa Preview */}
          <Button
            type="button"
            disabled={submitting}
            onClick={submitDirectPrint}
            className="h-14 w-full text-base font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            <Zap className="size-5 fill-current" aria-hidden />
            <Printer className="size-5" aria-hidden />
            {submitting ? "Mencetak Karcis…" : "CHECK-IN & LANGSUNG CETAK"}
          </Button>

          {/* Tombol Alternatif: Pratinjau Karcis */}
          <Button
            type="button"
            disabled={submitting}
            onClick={submitWithPreview}
            variant="outline"
            className="h-11 w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Eye className="size-4" aria-hidden />
            Check-in & Pratinjau Karcis
          </Button>
        </div>
      </form>

      {/* Modal Pemilihan Format Struk */}
      <TemplateSelectorDialog
        open={showTemplateModal}
        onOpenChange={setShowTemplateModal}
        selectedTemplate={template}
        onSelect={setTemplate}
      />

      {/* Modal Panduan Koneksi Printer */}
      <PrinterGuideDialog
        open={showPrinterGuide}
        onOpenChange={setShowPrinterGuide}
        onConnectNow={handleConnectPrinter}
      />
    </div>
  );
}
