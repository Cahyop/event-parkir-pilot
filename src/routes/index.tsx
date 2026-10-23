import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CalendarDays, ChevronRight, Plus } from "lucide-react";

import { fetchEventsWithCache } from "@/lib/ticket-store";
import { supabase } from "@/integrations/supabase/client";
import type { ParkingEvent } from "@/lib/types";
import { formatDateShort } from "@/lib/parking";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Parkir Event — Daftar Acara" },
      {
        name: "description",
        content: "Daftar event parkir yang sedang berjalan dan riwayatnya.",
      },
    ],
  }),
});

function Index() {
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEventsWithCache,
  });

  useEffect(() => {
    const channel = supabase
      .channel("events-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["events"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const active = (events ?? []).filter((e) => e.status === "active");
  const archived = (events ?? []).filter((e) => e.status !== "active");

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              Parkir Event
            </h1>
            <p className="text-xs text-muted-foreground">Kasir & tiket parkir acara</p>
          </div>
          <Link
            to="/events/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden />
            Event Baru
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-5">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Sedang Berjalan
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-20 animate-pulse rounded-xl bg-muted" />
              <div className="h-20 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : active.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-foreground">Belum ada event aktif</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Buat event baru untuk mulai melayani check-in kendaraan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>

        {archived.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Riwayat
            </h2>
            <div className="space-y-3">
              {archived.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function EventCard({ event }: { event: ParkingEvent }) {
  return (
    <Link
      to="/event/$id"
      params={{ id: event.id }}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors active:bg-accent"
    >
      <div className="min-w-0">
        <p className="truncate font-display text-base font-semibold text-foreground">
          {event.name}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          {event.event_date ? formatDateShort(event.event_date) : "Tanpa tanggal"}
          {event.status === "active" ? (
            <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Aktif
            </span>
          ) : (
            <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Selesai
            </span>
          )}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
