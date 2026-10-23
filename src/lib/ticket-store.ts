/**
 * Offline-first ticket store.
 *
 * All tickets for an event are cached in localStorage; writes go to the local
 * cache first and are queued for sync to Lovable Cloud. Pending ops retry on
 * reconnect and on an interval, so check-in works even without signal.
 * Called only from effects / event handlers (browser APIs).
 */
import { supabase } from "@/integrations/supabase/client";
import type { ParkingEvent, Ticket } from "./types";
import { makeTicketCode, normalizePlate } from "./parking";

const LOCAL_PREFIX = "parkir:tickets:";
const QUEUE_PREFIX = "parkir:queue:";
const EVENTS_CACHE_KEY = "parkir:events";

export interface PendingOp {
  kind: "insert" | "update";
  ticket: Ticket;
}

export interface StoreState {
  tickets: Ticket[];
  pending: number;
  online: boolean;
}

function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage full/unavailable — keep working in-memory only
  }
}

export function loadLocalTickets(eventId: string): Ticket[] {
  const raw = lsGet(LOCAL_PREFIX + eventId);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Ticket[];
  } catch {
    return [];
  }
}

export function saveLocalTickets(eventId: string, tickets: Ticket[]) {
  lsSet(LOCAL_PREFIX + eventId, JSON.stringify(tickets));
}

function loadQueue(eventId: string): PendingOp[] {
  const raw = lsGet(QUEUE_PREFIX + eventId);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingOp[];
  } catch {
    return [];
  }
}

function saveQueue(eventId: string, ops: PendingOp[]) {
  lsSet(QUEUE_PREFIX + eventId, JSON.stringify(ops));
}

export async function fetchRemoteTickets(eventId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("event_id", eventId)
    .order("entry_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as unknown as Ticket[];
}

/** Push pending ops to the server, pull fresh rows, merge with local cache. */
export async function syncEventTickets(eventId: string): Promise<StoreState> {
  const local = loadLocalTickets(eventId);
  let queue = loadQueue(eventId);
  let online = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (online) {
    const failed: PendingOp[] = [];
    for (const op of queue) {
      try {
        if (op.kind === "insert") {
          const { error } = await supabase.from("tickets").insert({
            id: op.ticket.id,
            event_id: op.ticket.event_id,
            code: op.ticket.code,
            plate: op.ticket.plate,
            vehicle_type: op.ticket.vehicle_type,
            tariff: op.ticket.tariff,
            payment_status: op.ticket.payment_status,
            entry_at: op.ticket.entry_at,
            exit_at: op.ticket.exit_at,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("tickets")
            .update({
              payment_status: op.ticket.payment_status,
              exit_at: op.ticket.exit_at,
              tariff: op.ticket.tariff,
            })
            .eq("id", op.ticket.id);
          if (error) throw error;
        }
      } catch {
        failed.push(op);
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          online = false;
          break;
        }
      }
    }
    queue = failed;
    saveQueue(eventId, queue);

    try {
      const remote = await fetchRemoteTickets(eventId);
      const pendingIds = new Set(queue.map((o) => o.ticket.id));
      const byId = new Map<string, Ticket>();
      for (const r of remote) byId.set(r.id, r);
      for (const l of local) {
        if (pendingIds.has(l.id) || !byId.has(l.id)) byId.set(l.id, l);
      }
      const merged = [...byId.values()].sort((a, b) =>
        b.entry_at.localeCompare(a.entry_at),
      );
      saveLocalTickets(eventId, merged);
      return { tickets: merged, pending: queue.length, online: true };
    } catch {
      online = false;
    }
  }

  return { tickets: local, pending: queue.length, online };
}

export interface CreateTicketInput {
  plate: string;
  vehicle_type: string;
  tariff: number;
  payment_status: Ticket["payment_status"];
}

export function createTicketLocally(eventId: string, input: CreateTicketInput): Ticket {
  const now = new Date();
  const ticket: Ticket = {
    id: crypto.randomUUID(),
    event_id: eventId,
    code: makeTicketCode(),
    plate: normalizePlate(input.plate),
    vehicle_type: input.vehicle_type,
    tariff: input.tariff,
    payment_status: input.payment_status,
    entry_at: now.toISOString(),
    exit_at: null,
    created_at: now.toISOString(),
  };
  const local = loadLocalTickets(eventId);
  local.unshift(ticket);
  saveLocalTickets(eventId, local);
  const queue = loadQueue(eventId);
  queue.push({ kind: "insert", ticket });
  saveQueue(eventId, queue);
  return ticket;
}

export function updateTicketLocally(
  eventId: string,
  id: string,
  patch: Partial<Pick<Ticket, "payment_status" | "exit_at">>,
): Ticket | null {
  const local = loadLocalTickets(eventId);
  const idx = local.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const updated: Ticket = { ...local[idx], ...patch };
  local[idx] = updated;
  saveLocalTickets(eventId, local);
  const queue = loadQueue(eventId);
  queue.push({ kind: "update", ticket: updated });
  saveQueue(eventId, queue);
  return updated;
}

/* ---------- Events (list cached for offline home screen) ---------- */

export async function fetchEvents(): Promise<ParkingEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const events = (data ?? []) as unknown as ParkingEvent[];
  lsSet(EVENTS_CACHE_KEY, JSON.stringify(events));
  return events;
}

export function fetchEventsWithCache(): Promise<ParkingEvent[]> {
  return fetchEvents().catch(() => {
    const raw = lsGet(EVENTS_CACHE_KEY);
    if (!raw) throw new Error("offline");
    return JSON.parse(raw) as ParkingEvent[];
  });
}

export async function fetchEvent(id: string): Promise<ParkingEvent | null> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as ParkingEvent) ?? null;
}

export async function createEvent(input: {
  name: string;
  event_date: string | null;
  vehicle_types: Array<{ name: string; tariff: number }>;
}): Promise<ParkingEvent> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      name: input.name.trim(),
      event_date: input.event_date,
      vehicle_types: input.vehicle_types,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as ParkingEvent;
}

export async function archiveEvent(id: string): Promise<void> {
  const { error } = await supabase.from("events").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
}
