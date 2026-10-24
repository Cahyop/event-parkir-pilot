import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createEvent } from "@/lib/ticket-store";
import { setEventPin, unlockEvent } from "@/lib/event-pin";
import type { VehicleType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/events/new")({
  component: NewEventPage,
  head: () => ({
    meta: [
      { title: "Buat Event Baru — Parkir Event" },
      {
        name: "description",
        content: "Atur nama acara, tanggal, dan tarif flat per jenis kendaraan.",
      },
    ],
  }),
});

const PRESETS: Array<VehicleType & { label: string }> = [
  { label: "+ Motor", name: "Motor", tariff: 3000 },
  { label: "+ Mobil", name: "Mobil", tariff: 5000 },
  { label: "+ Lainnya", name: "", tariff: 0 },
];

function NewEventPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [pin, setPin] = useState("");
  const [types, setTypes] = useState<VehicleType[]>([{ name: "Motor", tariff: 3000 }]);
  const [saving, setSaving] = useState(false);

  const updateType = (idx: number, patch: Partial<VehicleType>) => {
    setTypes((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const removeType = (idx: number) => {
    setTypes((prev) => prev.filter((_, i) => i !== idx));
  };

  const addType = (preset?: VehicleType) => {
    setTypes((prev) => [...prev, preset ? { ...preset } : { name: "", tariff: 0 }]);
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Nama acara wajib diisi");
      return;
    }
    if (pin.trim().length < 4) {
      toast.error("PIN keamanan event wajib diisi minimal 4 digit angka");
      return;
    }
    const clean = types.filter((t) => t.name.trim());
    if (clean.length === 0) {
      toast.error("Minimal satu jenis kendaraan");
      return;
    }
    if (clean.some((t) => !Number.isFinite(t.tariff) || t.tariff < 0)) {
      toast.error("Tarif harus berupa angka yang valid");
      return;
    }
    setSaving(true);
    try {
      const event = await createEvent({
        name,
        event_date: date || null,
        vehicle_types: clean.map((t) => ({ name: t.name.trim(), tariff: Math.round(t.tariff) })),
      });
      // Simpan PIN dan buka sesi untuk event yang baru dibuat
      setEventPin(event.id, pin.trim());
      unlockEvent(event.id, pin.trim());

      toast.success(`Event "${event.name}" berhasil dibuat`);
      void navigate({ to: "/event/$id", params: { id: event.id }, replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat event. Periksa koneksi internet Anda.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="inline-flex size-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
            aria-label="Kembali"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
          <h1 className="font-display text-lg font-bold tracking-tight">Event Baru</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-5 pb-28">
        <div className="space-y-2">
          <label htmlFor="event-name" className="text-sm font-semibold text-foreground">
            Nama Acara
          </label>
          <Input
            id="event-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Bazar Akhir Pekan 2026"
            className="h-12 text-base"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="event-date" className="text-sm font-semibold text-foreground">
            Tanggal Acara
          </label>
          <Input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <div className="flex items-center gap-1.5 text-primary">
            <Lock className="size-4" aria-hidden />
            <label htmlFor="event-pin" className="text-sm font-bold">
              PIN Keamanan Event (4-6 Digit Angka)
            </label>
          </div>
          <Input
            id="event-pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Misal: 1234"
            className="tabular h-12 text-center font-display text-xl font-bold tracking-[0.3em]"
            required
          />
          <p className="text-[11px] text-muted-foreground">
            PIN ini diperlukan operator setiap kali membuka dan mengelola event ini.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">Jenis Kendaraan & Tarif</label>
            <span className="text-xs text-muted-foreground">Tarif flat per kendaraan</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => addType({ name: p.name, tariff: p.tariff })}
                className="inline-flex h-10 items-center rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {types.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={t.name}
                  onChange={(e) => updateType(idx, { name: e.target.value })}
                  placeholder="Jenis (mis. Motor)"
                  className="h-12 flex-1 text-base"
                  aria-label={`Nama jenis kendaraan ${idx + 1}`}
                />
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={t.tariff || ""}
                    onChange={(e) => updateType(idx, { tariff: Number(e.target.value) })}
                    placeholder="3000"
                    className="tabular h-12 pl-9 text-base"
                    aria-label={`Tarif ${t.name || "jenis " + (idx + 1)}`}
                  />
                </div>
                <button
                  onClick={() => removeType(idx)}
                  disabled={types.length <= 1}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-30"
                  aria-label={`Hapus jenis ${t.name || idx + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-4 pb-safe backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={submit}
            disabled={saving}
            className="h-14 w-full text-base font-bold"
            size="lg"
          >
            {saving ? "Menyimpan…" : "Buat Event & Mulai"}
          </Button>
        </div>
      </div>
    </div>
  );
}
