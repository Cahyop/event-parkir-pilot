import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  createTicketLocally,
  loadLocalTickets,
  loadQueue,
  saveLocalTickets,
  saveQueue,
  syncEventTickets,
  updateTicketLocally,
  type CreateTicketInput,
  type StoreState,
} from "@/lib/ticket-store";
import type { Ticket } from "@/lib/types";

/** Offline-first ticket state for one event: local cache + sync queue + realtime. */
export function useTickets(eventId: string) {
  const [state, setState] = useState<StoreState>({
    tickets: [],
    pending: 0,
    online: true,
  });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await syncEventTickets(eventId);
      setState(res);
    } catch (e) {
      console.error(e);
    } finally {
      setReady(true);
    }
  }, [eventId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setState({
      tickets: loadLocalTickets(eventId),
      pending: loadQueue(eventId).length,
      online: navigator.onLine,
    });
    setReady(false);
    void refresh();

    const onOnline = () => {
      setState((s) => ({ ...s, online: true }));
      void refresh();
    };
    const onOffline = () => setState((s) => ({ ...s, online: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const channel = supabase
      .channel(`tickets:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `event_id=eq.${eventId}` },
        () => {
          void refresh();
        },
      )
      .subscribe();

    const interval = setInterval(() => void refresh(), 20000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      void supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [eventId, refresh]);

  const createTicket = useCallback(
    async (input: CreateTicketInput): Promise<Ticket> => {
      const ticket = createTicketLocally(eventId, input);
      const local = loadLocalTickets(eventId);
      const queue = loadQueue(eventId);
      setState((s) => ({ ...s, tickets: local, pending: queue.length }));
      void refresh();
      return ticket;
    },
    [eventId, refresh],
  );

  const updateTicket = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Ticket, "payment_status" | "exit_at">>,
    ): Promise<Ticket | null> => {
      const updated = updateTicketLocally(eventId, id, patch);
      if (!updated) return null;
      const local = loadLocalTickets(eventId);
      const queue = loadQueue(eventId);
      setState((s) => ({ ...s, tickets: local, pending: queue.length }));
      void refresh();
      return updated;
    },
    [eventId, refresh],
  );

  return { ...state, ready, createTicket, updateTicket, refresh };
}
