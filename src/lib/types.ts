export interface VehicleType {
  name: string;
  tariff: number;
}

export interface ParkingEvent {
  id: string;
  name: string;
  event_date: string | null;
  vehicle_types: VehicleType[];
  status: "active" | "archived";
  created_at: string;
}

export type PaymentStatus = "unpaid" | "prepaid" | "paid_at_exit";

export interface Ticket {
  id: string;
  event_id: string;
  code: string;
  plate: string;
  vehicle_type: string;
  tariff: number;
  payment_status: PaymentStatus;
  entry_at: string;
  exit_at: string | null;
  created_at: string;
}

export interface TicketPrintData {
  eventName: string;
  code: string;
  plate: string;
  vehicleType: string;
  tariff: number;
  statusLabel: string;
  entryAt: string;
}
