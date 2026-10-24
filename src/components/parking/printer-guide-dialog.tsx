import {
  AlertCircle,
  Bluetooth,
  CheckCircle2,
  HelpCircle,
  Info,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PrinterGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectNow?: () => void;
}

export function PrinterGuideDialog({
  open,
  onOpenChange,
  onConnectNow,
}: PrinterGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <Bluetooth className="size-5 text-primary" />
            Panduan Printer Bluetooth
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cara menyambungkan printer thermal Bluetooth di Google Chrome HP Android
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-2 text-xs">
          <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="font-bold text-primary flex items-center gap-1.5">
              <Info className="size-4 shrink-0" />
              Mengapa muncul pesan "User cancelled"?
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Pesan ini muncul ketika pop-up pencarian Bluetooth Chrome ditutup, atau printer tidak
              dipilih dari daftar perangkat.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-foreground">Langkah Penyambungan yang Benar:</h4>

            <div className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                1
              </span>
              <div>
                <p className="font-semibold text-foreground">Pastikan Printer Menyala (ON)</p>
                <p className="text-muted-foreground">
                  Lampu indikator power/status menyala hijau atau biru dan kertas thermal sudah terpasang rapi.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                2
              </span>
              <div>
                <p className="font-semibold text-foreground">
                  Putuskan Koneksi di Menu HP (Jika Tersambung)
                </p>
                <p className="text-muted-foreground">
                  Jika di <em>Pengaturan HP &gt; Bluetooth</em> status printer tertulis{" "}
                  <strong>"Tersambung / Connected"</strong>, tekan <strong>"Putuskan / Disconnect"</strong>{" "}
                  (jangan di-unpair). Browser Chrome membutuhkan akses langsung ke printer dan tidak
                  bisa terhubung jika sedang dikunci oleh sistem HP.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                3
              </span>
              <div>
                <p className="font-semibold text-foreground">Tutup Aplikasi Kasir / Cetak Lain</p>
                <p className="text-muted-foreground">
                  Tutup aplikasi seperti RawBT, Bluetooth Print, atau POS lain yang berjalan di background
                  agar printer tidak terkunci.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                4
              </span>
              <div>
                <p className="font-semibold text-foreground">Pilih Nama Printer dari Pop-up Chrome</p>
                <p className="text-muted-foreground">
                  Klik <strong>"Sambungkan Printer"</strong> di bawah, tunggu 2-3 detik hingga nama
                  printer Anda (misal: <em>POS-58</em>, <em>RPP02N</em>, <em>MTP-2</em>, atau{" "}
                  <em>Printer</em>) muncul di daftar pop-up Chrome, lalu <strong>ketuk nama printer tersebut</strong>{" "}
                  dan tekan <strong>Sandingkan / Sambungkan</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onConnectNow?.();
              }}
              className="h-11 w-full gap-2 text-sm font-bold"
            >
              <Bluetooth className="size-4" />
              Coba Sambungkan Printer Sekarang
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
