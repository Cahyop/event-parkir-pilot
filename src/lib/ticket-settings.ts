/**
 * User preferences for receipt templates and direct printing.
 */

export type TicketTemplate = "compact" | "super_compact" | "standard" | "formal";

export interface TemplateInfo {
  id: TicketTemplate;
  name: string;
  badge: string;
  desc: string;
  savings: string;
}

export const TICKET_TEMPLATES: TemplateInfo[] = [
  {
    id: "compact",
    name: "Hemat Kertas (Eco)",
    badge: "Rekomendasi",
    desc: "Nopol besar di tengah, rincian padat 2 baris, QR sedang. Hemat panjang kertas ~40%.",
    savings: "Hemat ~40%",
  },
  {
    id: "super_compact",
    name: "Super Hemat (Mini)",
    badge: "Antrean Padat",
    desc: "Format satu baris sangat ringkas, QR mini. Terbaik untuk event sangat ramai & hemat ~60%.",
    savings: "Hemat ~60%",
  },
  {
    id: "standard",
    name: "Standar (Lengkap)",
    badge: "Klasik",
    desc: "Format karcis klasik dengan tiap atribut di baris tersendiri dan QR code besar.",
    savings: "Standar",
  },
  {
    id: "formal",
    name: "Struk Kasir (Resmi)",
    badge: "Format Kasir",
    desc: "Desain struk resmi bergaris rapi ala loket parkir profesional dengan label bukti bayar.",
    savings: "Format Resmi",
  },
];

const TEMPLATE_KEY = "parkir:ticket_template";
const DIRECT_PRINT_KEY = "parkir:direct_print";

export function getTicketTemplate(): TicketTemplate {
  try {
    const val = window.localStorage.getItem(TEMPLATE_KEY) as TicketTemplate | null;
    if (val === "compact" || val === "standard" || val === "super_compact" || val === "formal") {
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
    return val !== "false";
  } catch {
    return true;
  }
}

export function setDirectPrintEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(DIRECT_PRINT_KEY, enabled ? "true" : "false");
  } catch {}
}
