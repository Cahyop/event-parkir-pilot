import { useState, useEffect } from "react";
import { AlertTriangle, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteEvent } from "@/lib/ticket-store";
import { getEventPin, hasEventPin } from "@/lib/event-pin";
import type { ParkingEvent } from "@/lib/types";

interface DeleteEventDialogProps {
  event: ParkingEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteEventDialog({
  event,
  open,
  onOpenChange,
  onDeleted,
}: DeleteEventDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [pin, setPin] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPin = hasEventPin(event.id);

  useEffect(() => {
    if (open) {
      setPin("");
      setError(null);
    }
  }, [open, event.id]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Verifikasi PIN
    if (hasPin) {
      const correctPin = getEventPin(event.id);
      if (!correctPin || pin.trim() !== correctPin) {
        setError("PIN salah. Penghapusan event dibatalkan.");
        setPin("");
        return;
      }
    } else {
      // Jika event lama belum ber-PIN, minimal harus menginput 4 angka untuk konfirmasi
      if (pin.trim().length < 4) {
        setError("Masukkan minimal 4 digit angka untuk konfirmasi hapus");
        return;
      }
    }

    setDeleting(true);
    try {
      await deleteEvent(event.id);
      await queryClient.invalidateQueries({ queryKey: ["events"] });

      toast.success(`Event "${event.name}" berhasil dihapus secara permanen`);
      onOpenChange(false);
      if (onDeleted) {
        onDeleted();
      } else {
        void navigate({ to: "/", replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Gagal menghapus event");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-5 text-center">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <Trash2 className="size-6" />
          </div>
          <DialogTitle className="font-display text-lg font-bold text-destructive">
            Hapus Event Permanen
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-left pt-1">
            Tindakan ini akan <strong>menghapus permanen</strong> event{" "}
            <strong className="text-foreground">{event.name}</strong> beserta seluruh karcis,
            riwayat keluar masuk, dan laporan kas parkirnya.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDelete} className="space-y-4 pt-2 text-left">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
            <label
              htmlFor="delete-event-pin"
              className="text-xs font-bold text-destructive flex items-center gap-1.5"
            >
              <Lock className="size-3.5" />
              {hasPin ? "Masukkan PIN Event untuk Konfirmasi" : "Masukkan 4 Digit untuk Konfirmasi"}
            </label>
            <Input
              id="delete-event-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setError(null);
                setPin(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="••••"
              className="tabular mt-1.5 h-12 text-center font-display text-xl font-bold tracking-[0.4em] bg-background border-destructive/40 focus-visible:ring-destructive"
              autoFocus
              required
            />
            {error && (
              <p className="mt-1.5 text-center text-xs font-bold text-destructive">{error}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={deleting}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={deleting}
              className="flex-1 font-bold"
            >
              {deleting ? "Menghapus…" : "Hapus Permanen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
