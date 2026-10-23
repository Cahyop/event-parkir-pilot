import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
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
        const { Html5Qrcode: Scanner } = await import("html5-qrcode");
        if (cancelled) return;
        const instance = new Scanner("qr-reader-box");
        instanceRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 } },
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
      <div
        id="qr-reader-box"
        className={
          "overflow-hidden rounded-xl border border-border bg-black " +
          (scanning ? "aspect-square w-full" : "hidden")
        }
      />
      {!scanning && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setScanning(true);
          }}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-input bg-card text-base font-semibold text-foreground transition-colors hover:bg-accent"
        >
          <Camera className="size-5" aria-hidden />
          Scan QR Karcis
        </button>
      )}
      {scanning && (
        <button
          type="button"
          onClick={() => setScanning(false)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground"
        >
          <CameraOff className="size-4" aria-hidden />
          Hentikan Kamera
        </button>
      )}
      {error && <p className="text-center text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
