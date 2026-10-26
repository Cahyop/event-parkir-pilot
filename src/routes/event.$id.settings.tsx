import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bluetooth,
  Check,
  FileText,
  HelpCircle,
  Printer,
  ScrollText,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

import { PrinterGuideDialog } from "@/components/parking/printer-guide-dialog";
import {
  bluetoothPrintAvailable,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getConnectedPrinterName,
  isBluetoothPrinterConnected,
} from "@/lib/escpos";
import {
  getPaperWidth,
  getTicketTemplate,
  setPaperWidth,
  setTicketTemplate,
  TICKET_TEMPLATES,
  type TicketTemplate,
} from "@/lib/ticket-settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/event/$id/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Pengaturan Cetak — Parkir Event" },
      { name: "description", content: "Atur printer thermal Bluetooth, format struk default, dan lebar kertas." },
    ],
  }),
});

function SettingsPage() {
  const event = useLoaderData({ from: "/event/$id" });

  const [printerConnected, setPrinterConnected] = useState(() => isBluetoothPrinterConnected());
  const [printerName, setPrinterName] = useState(() => getConnectedPrinterName());
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  const [showPrinterGuide, setShowPrinterGuide] = useState(false);

  const [template, setTemplate] = useState<TicketTemplate>(() => getTicketTemplate());
  const [paperWidth, setPaperWidthState] = useState<58 | 80>(() => getPaperWidth());

  const btAvailable = bluetoothPrintAvailable();

  const handleConnectPrinter = async () => {
    if (connectingPrinter) return;
    setConnectingPrinter(true);
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
    } finally {
      setConnectingPrinter(false);
    }
  };

  const handleDisconnectPrinter = () => {
    disconnectBluetoothPrinter();
    setPrinterConnected(false);
    setPrinterName(null);
    toast.info("Koneksi printer diputuskan");
  };

  const handleSelectTemplate = (id: TicketTemplate) => {
    setTicketTemplate(id);
    setTemplate(id);
    const info = TICKET_TEMPLATES.find((t) => t.id === id);
    toast.success(`Format struk default: ${info?.name ?? id}`);
  };

  const handleSelectPaper = (w: 58 | 80) => {
    setPaperWidth(w);
    setPaperWidthState(w);
    toast.success(`Lebar kertas kini ${w}mm`);
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Printer className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            Pengaturan Cetak
          </h2>
          <p className="text-xs text-muted-foreground">
            Berlaku untuk semua event di perangkat ini
          </p>
        </div>
      </header>

      {/* Printer Bluetooth */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-1.5">
          <Bluetooth className="size-4 text-primary" aria-hidden />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Printer Thermal (Bluetooth)
          </h3>
        </div>

        {!btAvailable && (
          <p className="mb-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Cetak Bluetooth hanya tersedia di Google Chrome Android. Di perangkat lain gunakan
            "Cetak via Browser" saat mencetak karcis.
          </p>
        )}

        {printerConnected ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-foreground">
                  {printerName || "Printer Siap"}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Terhubung — cetak berikutnya langsung tanpa dialog
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDisconnectPrinter}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Unlink className="size-3.5" />
              Putuskan
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              disabled={!btAvailable || connectingPrinter}
              onClick={() => void handleConnectPrinter()}
              className="h-12 w-full font-bold"
            >
              <Bluetooth className={cn("size-4", connectingPrinter && "animate-pulse")} />
              {connectingPrinter ? "Mencari Printer…" : "Sambungkan Printer"}
            </Button>
            <button
              type="button"
              onClick={() => setShowPrinterGuide(true)}
              className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="size-3.5" />
              Panduan menyambungkan printer
            </button>
          </div>
        )}
      </section>

      {/* Format struk default */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="size-4 text-primary" aria-hidden />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Format Struk Default
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {TICKET_TEMPLATES.length} format
          </span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Format ini dipakai otomatis setiap kali karcis dicetak, di semua halaman.
        </p>

        <div className="space-y-2">
          {TICKET_TEMPLATES.map((t) => {
            const isSelected = template === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTemplate(t.id)}
                className={cn(
                  "flex w-full items-start justify-between rounded-xl border-2 p-3 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/40",
                )}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-foreground">{t.name}</span>
                    {t.id === "compact" && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Rekomendasi
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-bold",
                      t.id === "standard"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/15 text-primary",
                    )}
                  >
                    {t.savings}
                  </span>
                  {isSelected && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Lebar kertas */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-1.5">
          <ScrollText className="size-4 text-primary" aria-hidden />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Lebar Kertas Printer
          </h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Sesuaikan dengan kertas yang terpasang di printer Anda. Struk akan memakai lebar kertas
          secara penuh.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {([58, 80] as const).map((w) => {
            const isSelected = paperWidth === w;
            return (
              <button
                key={w}
                type="button"
                onClick={() => handleSelectPaper(w)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center rounded-xl border-2 transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-accent",
                )}
              >
                <span className="tabular font-display text-lg font-extrabold">{w}mm</span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {w === 58 ? "Mini (32 kolom)" : "Besar (48 kolom)"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <PrinterGuideDialog
        open={showPrinterGuide}
        onOpenChange={setShowPrinterGuide}
        onConnectNow={handleConnectPrinter}
      />
    </div>
  );
}
