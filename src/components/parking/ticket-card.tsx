import QRCode from "qrcode";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bluetooth,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  Smartphone,
} from "lucide-react";

import { formatDateTime, formatRupiah, paymentStatusLabel } from "@/lib/parking";
import type { ParkingEvent, Ticket } from "@/lib/types";
import {
  bluetoothPrintAvailable,
  getConnectedPrinterName,
  isBluetoothPrinterConnected,
  printTicketBluetooth,
  type PrintProgressStage,
} from "@/lib/escpos";
import { printTicketBrowser } from "@/lib/ticket-print";
import {
  getTicketTemplate,
  TICKET_TEMPLATES,
  type TicketTemplate,
} from "@/lib/ticket-settings";
import { TemplateSelectorDialog } from "@/components/parking/template-selector-dialog";
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
  const [btStage, setBtStage] = useState<PrintProgressStage | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [template, setTemplate] = useState<TicketTemplate>(() => getTicketTemplate());
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const bluetoothOk = bluetoothPrintAvailable();
  const isIframe = typeof window !== "undefined" && window.self !== window.top;
  const isPrinterConnected = isBluetoothPrinterConnected();
  const connectedPrinterName = getConnectedPrinterName();

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
    setBtStage("selecting");
    setPrintError(null);
    try {
      await printTicketBluetooth(
        printData(),
        { widthMm: 58, template },
        (stage) => setBtStage(stage),
      );
      toast.success("Karcis berhasil dicetak ke printer thermal");
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.name === "UserCancelledError") {
        toast.info("Pemilihan printer dibatalkan");
      } else {
        const msg =
          e instanceof Error
            ? e.message
            : "Gagal mencetak via Bluetooth. Periksa koneksi printer atau gunakan cetak browser.";
        setPrintError(msg);
        toast.error(msg, { duration: 6000 });
      }
    } finally {
      setPrinting(null);
      setBtStage(null);
    }
  };

  const printBrowser = async () => {
    setPrinting("browser");
    try {
      await printTicketBrowser(printData(), { template });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Gagal membuka jendela cetak.");
    } finally {
      setPrinting(null);
    }
  };

  const getBtButtonLabel = () => {
    if (printing !== "bluetooth") {
      return isPrinterConnected
        ? `Cetak ke ${connectedPrinterName || "Printer"}`
        : "Cetak Thermal (Bluetooth)";
    }
    if (btStage === "selecting") return "Memilih printer Bluetooth…";
    if (btStage === "connecting") return "Menghubungkan ke printer…";
    if (btStage === "sending") return "Mengirim data cetak…";
    return "Memproses cetak…";
  };

  const currentTemplateInfo =
    TICKET_TEMPLATES.find((t) => t.id === template) || TICKET_TEMPLATES[0]!;

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
        {/* Template Selector Bar */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="size-3.5 text-primary" />
            <span>Format Cetak:</span>
            <span className="font-bold text-foreground">{currentTemplateInfo.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowTemplateDialog(true)}
            className="font-bold text-primary hover:underline"
          >
            Ubah
          </button>
        </div>

        {isPrinterConnected && (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500" />
            <Bluetooth className="size-3.5" />
            <span>Terhubung: {connectedPrinterName}</span>
          </div>
        )}

        {isIframe && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-amber-800 dark:text-amber-200">
            <p className="font-bold">⚠️ Mode Preview Editor Terdeteksi</p>
            <p className="mt-1">
              Browser memblokir dialog Bluetooth jika dibuka di dalam panel preview editor. Buka langsung di tab baru browser Google Chrome di HP Anda agar dialog Bluetooth bisa muncul.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(window.location.href, "_blank")}
              className="mt-2 h-8 gap-1.5 border-amber-600 bg-amber-500/20 text-xs font-bold text-amber-900 hover:bg-amber-500/30 dark:text-amber-100"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Buka di Tab Baru Chrome
            </Button>
          </div>
        )}

        {printError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-left text-xs text-destructive">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              <span>Gagal Terhubung ke Printer</span>
            </div>
            <p className="mt-1 text-foreground/90">{printError}</p>
            <p className="mt-1.5 text-muted-foreground">
              Tip: Pastikan printer ON. Jika printer berstatus <strong>"Tersambung"</strong> di pengaturan Bluetooth HP, <strong>putuskan (disconnect)</strong> terlebih dahulu di menu HP karena Chrome memerlukan akses langsung. Atau gunakan{" "}
              <strong>Cetak via Browser</strong> di bawah.
            </p>
          </div>
        )}

        {bluetoothOk ? (
          <>
            <Button
              onClick={printBt}
              disabled={printing !== null}
              className="h-13 w-full text-base font-bold"
              size="lg"
            >
              {printing === "bluetooth" ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Printer className="size-5" aria-hidden />
              )}
              {getBtButtonLabel()}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              {isPrinterConnected
                ? "Koneksi printer tersimpan — mencetak langsung tanpa dialog pencarian."
                : "Pastikan printer thermal ON. Dialog pencarian Bluetooth akan muncul."}
            </p>
          </>
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

      <TemplateSelectorDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        selectedTemplate={template}
        onSelect={setTemplate}
      />
    </div>
  );
}

export interface RowProps {
  label: string;
  value: string;
  strong?: boolean;
}

export function Row({ label, value, strong }: RowProps) {
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
