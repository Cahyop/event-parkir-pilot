import { useState, useEffect } from "react";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasEventPin, setEventPin, unlockEvent } from "@/lib/event-pin";
import type { ParkingEvent } from "@/lib/types";

interface EventPinDialogProps {
  event: ParkingEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EventPinDialog({
  event,
  open,
  onOpenChange,
  onSuccess,
}: EventPinDialogProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasPin = event ? hasEventPin(event.id) : false;

  useEffect(() => {
    if (open) {
      setPin("");
      setConfirmPin("");
      setError(null);
    }
  }, [open, event?.id]);

  if (!event) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin.trim().length < 4) {
      setError("PIN minimal 4 digit angka");
      return;
    }
    if (unlockEvent(event.id, pin.trim())) {
      toast.success(`Akses event "${event.name}" berhasil dibuka`);
      onOpenChange(false);
      onSuccess();
    } else {
      setError("PIN salah. Silakan coba lagi.");
      setPin("");
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin.trim().length < 4) {
      setError("PIN minimal 4 digit angka");
      return;
    }
    if (pin !== confirmPin) {
      setError("Konfirmasi PIN tidak cocok");
      return;
    }
    setEventPin(event.id, pin.trim());
    unlockEvent(event.id, pin.trim());
    toast.success(`PIN untuk event "${event.name}" berhasil dibuat`);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-6 text-center">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {hasPin ? <Lock className="size-6" /> : <KeyRound className="size-6" />}
          </div>
          <DialogTitle className="font-display text-lg font-bold text-foreground">
            {hasPin ? "Verifikasi PIN Event" : "Buat PIN Keamanan"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {hasPin ? (
              <>
                Masukkan PIN keamanan untuk membuka akses kasir & laporan acara{" "}
                <strong className="text-foreground">{event.name}</strong>.
              </>
            ) : (
              <>
                Event <strong className="text-foreground">{event.name}</strong> belum memiliki
                PIN. Masukkan 4-6 digit angka untuk mengamankannya.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {hasPin ? (
          <form onSubmit={handleVerify} className="space-y-4 pt-2 text-left">
            <div>
              <label htmlFor="verify-pin" className="text-xs font-semibold text-muted-foreground">
                PIN Event (4-6 Digit)
              </label>
              <Input
                id="verify-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setError(null);
                  setPin(e.target.value.replace(/\D/g, ""));
                }}
                placeholder="••••"
                className="tabular mt-1 h-13 text-center font-display text-2xl font-bold tracking-[0.4em]"
                autoFocus
                required
              />
              {error && <p className="mt-1.5 text-center text-xs font-bold text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="h-12 w-full text-sm font-bold">
              Buka Akses Event
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3 pt-2 text-left">
            <div>
              <label htmlFor="new-pin" className="text-xs font-semibold text-muted-foreground">
                PIN Baru (4-6 Digit Angka)
              </label>
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setError(null);
                  setPin(e.target.value.replace(/\D/g, ""));
                }}
                placeholder="Misal: 1234"
                className="tabular mt-1 h-12 text-center font-display text-xl font-bold tracking-[0.3em]"
                autoFocus
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-pin" className="text-xs font-semibold text-muted-foreground">
                Ulangi PIN
              </label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => {
                  setError(null);
                  setConfirmPin(e.target.value.replace(/\D/g, ""));
                }}
                placeholder="Ulangi PIN"
                className="tabular mt-1 h-12 text-center font-display text-xl font-bold tracking-[0.3em]"
                required
              />
              {error && <p className="mt-1.5 text-center text-xs font-bold text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="h-12 w-full text-sm font-bold">
              <ShieldCheck className="size-4 mr-1.5" />
              Simpan PIN & Buka Event
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
