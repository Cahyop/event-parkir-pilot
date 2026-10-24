import {
  AlertTriangle,
  Bluetooth,
  HelpCircle,
  Info,
  MapPin,
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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <Bluetooth className="size-5 text-primary" />
            Panduan Printer Bluetooth HP
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Solusi printer Bluetooth tidak muncul atau muncul pesan "Pemilihan dibatalkan"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1 text-xs">
          {/* Box Penjelasan Masalah */}
          <div className="space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
            <p className="font-bold flex items-center gap-1.5 text-xs">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              Mengapa list printer lama muncul / dibatalkan?
            </p>
            <p className="leading-relaxed text-[11px]">
              1. <strong>Mengklik tombol 2 kali:</strong> Jika tombol "Sambungkan" ditekan lagi saat
              Chrome sedang memindai, Chrome otomatis membatalkan pemindaian pertama. Cukup tekan sekali dan tunggu.
            </p>
            <p className="leading-relaxed text-[11px]">
              2. <strong>Printer sudah di-pair di HP:</strong> Printer thermal Bluetooth yang sedang
              terkoneksi di menu Bluetooth HP sering kali mengunci salurannya sehingga Chrome tidak bisa
              mendeteksinya.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-foreground">Langkah Mengatasi:</h4>

            {/* Syarat 1: GPS / Lokasi */}
            <div className="flex gap-2.5 rounded-lg border border-border p-2.5 bg-muted/20">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                1
              </span>
              <div>
                <p className="font-bold text-foreground flex items-center gap-1">
                  <MapPin className="size-3.5 text-primary" />
                  Wajib Aktifkan GPS / Lokasi HP
                </p>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  Sistem keamanan Android mewajibkan <strong>GPS / Layanan Lokasi ON</strong> agar Google Chrome
                  diizinkan memindai perangkat Bluetooth di sekitar. Pastikan ikon Lokasi di bar atas HP Anda aktif.
                </p>
              </div>
            </div>

            {/* Syarat 2: Putuskan koneksi di menu HP */}
            <div className="flex gap-2.5 rounded-lg border border-border p-2.5 bg-muted/20">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                2
              </span>
              <div>
                <p className="font-bold text-foreground">Putuskan Status "Tersambung" di HP</p>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  Buka <strong>Pengaturan HP &gt; Bluetooth</strong>. Jika printer Anda berstatus{" "}
                  <strong>"Tersambung / Connected"</strong>, tekan nama printer lalu pilih <strong>"Putuskan / Disconnect"</strong>{" "}
                  (tidak perlu hapus sandingan). Chrome harus menghubungkannya secara langsung.
                </p>
              </div>
            </div>

            {/* Syarat 3: Izin Chrome */}
            <div className="flex gap-2.5 rounded-lg border border-border p-2.5 bg-muted/20">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                3
              </span>
              <div>
                <p className="font-bold text-foreground">Izin "Perangkat di Sekitar" untuk Chrome</p>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  Pastikan Chrome memiliki izin Bluetooth: Buka Pengaturan HP &gt; Aplikasi &gt; Chrome &gt; Izin &gt;{" "}
                  <strong>Perangkat di sekitar (Nearby devices)</strong> &gt; pilih <strong>Izinkan</strong>.
                </p>
              </div>
            </div>

            {/* Alternatif Browser Print */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
              <p className="font-bold text-primary flex items-center gap-1.5">
                <Smartphone className="size-3.5" />
                Alternatif Cetak (Pasti Berhasil)
              </p>
              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                Jika printer Anda merupakan tipe lama yang hanya mendukung Bluetooth Klasik (SPP), Anda tetap bisa
                mencetak dengan memilih tombol <strong>"Check-in & Pratinjau Karcis"</strong> lalu tekan{" "}
                <strong>"Cetak via Browser"</strong>.
              </p>
            </div>
          </div>

          <div className="pt-1">
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
