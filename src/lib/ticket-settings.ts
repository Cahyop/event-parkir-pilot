/**
 * User preferences for receipt templates and direct printing.
 */

export type TicketTemplate = "compact" | "standard" | "super_compact";

export interface TemplateInfo {
  id: TicketTemplate;
  name: string;
  desc: string;
  savings: string;
}

export const TICKET_TEMPLATES: TemplateInfo[] = [
  {
    id: "compact",
    name: "Hemat Kertas (Eco)",
    desc: "Desain efisien, nopol besar, hemat panjang kertas ~40%",
    savings: "Hemat ~40%",
  },
  {
    id: "standard",
    name: "Standar (Lengkap)",
    desc: "Rincian penuh tiap baris dengan QR code besar",
    savings: "Standar",
  },
  {
    id: "super_compact",
    name: "Super Hemat (Mini)",
    desc: "Sangat ringkas untuk antrean padat, hemat kertas ~60%",
    savings: "Hemat ~60%",
  },
];

const TEMPLATE_KEY = "parkir:ticket_template";
const DIRECT_PRINT_KEY = "parkir:direct_print";

export function getTicketTemplate(): TicketTemplate {
  try {
    const val = window.localStorage.getItem(TEMPLATE_KEY) as TicketTemplate | null;
    if (val === "compact" || val === "standard" || val === "super_compact") {
      return val;
    }
  } catch {}
  return "compact";
}

export function setTicketTemplate(template: TicketTemplate): void {
  try {
    window.localStorage.setItem(TEMPLATE_KEY, template);
  } catch {}
}

export function isDirectPrintEnabled(): boolean {
  try {
    const val = window.localStorage.getItem(DIRECT_PRINT_KEY);
    return val !== "false"; // Default true for speed
  } catch {
    return true;
  }
}

export function setDirectPrintEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(DIRECT_PRINT_KEY, enabled ? "true" : "false");
  } catch {}
}
