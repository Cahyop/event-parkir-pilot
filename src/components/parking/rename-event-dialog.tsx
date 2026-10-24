import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchEventsWithCache, renameEvent } from "@/lib/ticket-store";
import { normalizeEventName } from "@/lib/parking";
import type { ParkingEvent } from "@/lib/types";

interface RenameEventDialogProps {
  event: ParkingEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newName: string) => void;
}

export function RenameEventDialog({
  event,
  open,
  onOpenChange,
  onSuccess,
}: RenameEventDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(event.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(event.name);
      setError(null);
    }
  }, [open, event.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = name.trim();
    if (!clean) {
      setError("Nama event tidak boleh kosong");
      return;
    }

    if (clean === event.name) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      // Validasi nama duplikat mengabaikan semua spasi
      const normalized = normalizeEventName(clean);
      const allEvents = await fetchEventsWithCache().catch(() => []);
      const isDuplicate = allEvents.some(
        (e) => e.id !== event.id && normalizeEventName(e.name) === normalized,
      );
      if (isDuplicate) {
        setError("Nama event sudah digunakan oleh event lain (spasi tidak membedakan nama).");
        setSaving(false);
        return;
      }

      await renameEvent(event.id, clean);
      await queryClient.invalidateQueries({ queryKey: ["event", event.id] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });

      toast.success(`Nama event berhasil diubah menjadi "${clean}"`);
      onOpenChange(false);
      onSuccess?.(clean);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Gagal mengubah nama event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <Pencil className="size-5 text-primary" />
            Ubah Nama Event
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Perbarui nama event yang sedang berjalan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label htmlFor="rename-input" className="text-xs font-semibold text-muted-foreground">
              Nama Event Baru
            </label>
            <Input
              id="rename-input"
              value={name}
              onChange={(e) => {
                setError(null);
                setName(e.target.value);
              }}
              placeholder="Masukkan nama event baru"
              className="mt-1 h-12 text-base font-semibold"
              autoFocus
              required
            />
            {error && (
              <p className="mt-1.5 text-xs font-semibold text-destructive">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
