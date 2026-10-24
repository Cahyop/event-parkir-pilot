import { createFileRoute, Link, Outlet, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { fetchEvent } from "@/lib/ticket-store";
import { hasEventPin, isEventUnlocked, lockEvent, setEventPin, unlockEvent } from "@/lib/event-pin";
import type { ParkingEvent } from "@/lib/types";
import { formatDateShort } from "@/lib/parking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckInIcon, CheckOutIcon, ReportIcon } from "@/components/parking/tab-icons";

export const eventQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      const event = await fetchEvent(id);
      if (!event) throw notFound();
      return event;
    },
  });

export const Route = createFileRoute("/event/$id")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(eventQueryOptions(params.id)),
  component: EventLayout,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData ? `${loaderData.name} — Parkir Event` : "Event — Parkir Event",
      },
      {
        name: "description",
        content: "Check-in kendaraan, scan karcis saat keluar, dan laporan kas event.",
      },
    ],
  }),
});

function EventLayout() {
  const { id } = Route.useParams();
  const { data: event } = useSuspenseQuery(eventQueryOptions(id));
  const navigate = useNavigate();

  const [hasPin, setHasPin] = useState(() => hasEventPin(id));
  const [unlocked, setUnlocked] = useState(() => isEventUnlocked(id));
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const handleUnlock = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (unlockEvent(id, pinInput)) {
      setUnlocked(true);
      setPinInput("");
      toast.success("Akses event berhasil dibuka");
    } else {
      toast.error("PIN salah. Silakan coba lagi.");
    }
  };

  const handleCreatePin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pinInput.trim().length < 4) {
      toast.error("PIN minimal 4 digit angka");
      return;
    }
    if (pinInput !== pinConfirm) {
      toast.error("Konfirmasi PIN tidak cocok");
      return;
    }
    setEventPin(id, pinInput.trim());
    unlockEvent(id, pinInput.trim());
    setHasPin(true);
    setUnlocked(true);
    setPinInput("");
    setPinConfirm("");
    toast.success("PIN event berhasil dibuat dan disimpan");
  };

  const handleLock = () => {
    lockEvent(id);
    setUnlocked(false);
    toast.info("Sesi event telah dikunci");
  };

  const tabs = [
    { to: "/event/$id", label: "Masuk", icon: CheckInIcon, exact: true },
    { to: "/event/$id/checkout", label: "Keluar", icon: CheckOutIcon, exact: false },
    { to: "/event/$id/report", label: "Laporan", icon: ReportIcon, exact: false },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <button
            onClick={() => navigate({ to: "/", replace: true })}
            className="inline-flex size-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
            aria-label="Kembali ke daftar event"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold tracking-tight text-foreground">
              {event.name}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {event.event_date ? formatDateShort(event.event_date) : "Tanpa tanggal"} ·{" "}
              {event.vehicle_types.map((v) => v.name).join(", ")}
            </p>
          </div>
          {unlocked && (
            <button
              onClick={handleLock}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Kunci sesi event"
              aria-label="Kunci event"
            >
              <Lock className="size-4" />
            </button>
          )}
        </div>
      </header>

      {/* Screen 1: Event Existing belum punya PIN -> Buat PIN */}
      {!hasPin && (
        <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-8">
          <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Buat PIN Keamanan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Event ini belum memiliki PIN. Masukkan 4-6 digit angka untuk mengamankan akses event{" "}
                <strong>{event.name}</strong>.
              </p>
            </div>
            <form onSubmit={handleCreatePin} className="space-y-3 pt-2 text-left">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  PIN Baru (4-6 Angka)
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="Misal: 1234"
                  className="tabular mt-1 h-12 text-center font-display text-xl font-bold tracking-[0.3em]"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Ulangi Konfirmasi PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                  placeholder="Misal: 1234"
                  className="tabular mt-1 h-12 text-center font-display text-xl font-bold tracking-[0.3em]"
                  required
                />
              </div>
              <Button type="submit" className="mt-2 h-12 w-full text-base font-bold shadow-md">
                <ShieldCheck className="size-5" />
                Simpan PIN & Buka Event
              </Button>
            </form>
          </div>
        </main>
      )}

      {/* Screen 2: Event memiliki PIN dan terkunci -> Masukkan PIN */}
      {hasPin && !unlocked && (
        <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
          <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="size-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Event Dilindungi PIN</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Masukkan PIN keamanan untuk mengakses kasir dan data event{" "}
                <strong>{event.name}</strong>.
              </p>
            </div>
            <form onSubmit={handleUnlock} className="space-y-4 pt-2">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="tabular h-14 text-center font-display text-3xl font-extrabold tracking-[0.4em]"
                autoFocus
                required
              />
              <Button type="submit" className="h-12 w-full text-base font-bold shadow-md">
                Buka Akses Event
              </Button>
            </form>
          </div>
        </main>
      )}

      {/* Screen 3: Sesi Terbuka -> Tampilkan Halaman & Navigasi */}
      {hasPin && unlocked && (
        <>
          <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-3">
            <Outlet />
          </main>

          <nav
            className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur"
            aria-label="Menu event"
          >
            <div className="mx-auto grid max-w-2xl grid-cols-3">
              {tabs.map((tab) => (
                <Link
                  key={tab.to}
                  to={tab.to}
                  params={{ id }}
                  activeOptions={{ exact: tab.exact }}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors",
                    "text-muted-foreground hover:text-foreground data-[status=active]:text-primary",
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <tab.icon className="size-5" active={isActive} />
                      {tab.label}
                    </>
                  )}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
