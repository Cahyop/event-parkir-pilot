import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, QrCode } from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  onResult: (text: string) => void;
}

export function QrScanner({ onResult }: QrScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const instanceRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<{ text: string; at: number } | null>(null);
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode: Scanner, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;

        // Kunci format scanner secara spesifik hanya untuk QR Code (2D), bukan 1D barcode
        const instance = new Scanner("qr-reader-box", {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        instanceRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            aspectRatio: 1.0, // Memastikan rasio kamera proporsional persegi 1:1 (tidak gepeng)
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // Kotak fokus persegi presisi berukuran 72% dari area kamera
              const edge = Math.min(viewfinderWidth, viewfinderHeight);
              const size = Math.max(180, Math.floor(edge * 0.72));
              return { width: size, height: size };
            },
          },
          (decodedText: string) => {
            const now = Date.now();
            const last = lastRef.current;
            if (last && last.text === decodedText && now - last.at < 2500) return;
            lastRef.current = { text: decodedText, at: now };
            cbRef.current(decodedText);
          },
          () => {
            // per-frame decode failures are normal — ignore
          },
        );
      } catch (e) {
        console.error(e);
        setError("Kamera tidak dapat diakses. Periksa izin kamera browser.");
        setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
      const inst = instanceRef.current;
      instanceRef.current = null;
      if (inst) {
        inst
          .stop()
          .then(() => inst.clear())
          .catch(() => {});
      }
    };
  }, [scanning]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          id="qr-reader-box"
          className={
            "overflow-hidden rounded-2xl border-2 border-border bg-black " +
            (scanning ? "aspect-square w-full shadow-md" : "hidden")
          }
        />
        {scanning && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4">
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              Arahkan ke QR Code karcis
            </span>
            {/* Visual Reticle 4 Sudut Persegi Simetris Khusus QR Code */}
            <div className="relative aspect-square w-[72%] max-w-[240px] rounded-2xl border-2 border-primary/50">
              <div className="absolute -left-1 -top-1 size-5 rounded-tl border-l-4 border-t-4 border-primary" />
              <div className="absolute -right-1 -top-1 size-5 rounded-tr border-r-4 border-t-4 border-primary" />
              <div className="absolute -bottom-1 -left-1 size-5 rounded-bl border-b-4 border-l-4 border-primary" />
              <div className="absolute -bottom-1 -right-1 size-5 rounded-br border-b-4 border-r-4 border-primary" />
            </div>
            <span className="text-[11px] font-medium text-white/80 drop-shadow">
              Otomatis mendeteksi saat QR berada di dalam kotak
            </span>
          </div>
        )}
      </div>

      {!scanning && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setScanning(true);
          }}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/20 bg-primary/5 text-base font-bold text-primary transition-colors hover:bg-primary/10 active:scale-95"
        >
          <Camera className="size-5" aria-hidden />
          Scan QR Karcis
        </button>
      )}
      {scanning && (
        <button
          type="button"
          onClick={() => setScanning(false)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground hover:bg-accent"
        >
          <CameraOff className="size-4" aria-hidden />
          Tutup Pemindai Kamera
        </button>
      )}
      {error && <p className="text-center text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
