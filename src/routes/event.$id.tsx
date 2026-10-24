import { createFileRoute, Link, Outlet, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { fetchEvent } from "@/lib/ticket-store";
import type { ParkingEvent } from "@/lib/types";
import { formatDateShort } from "@/lib/parking";
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4">
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
    </div>
  );
}
