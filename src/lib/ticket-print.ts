/**
 * Browser-print fallback: renders the ticket in a popup window and calls
 * window.print(). Works everywhere Web Bluetooth does not (including iOS).
 */
import QRCode from "qrcode";
import { formatRupiah } from "./parking";
import type { TicketPrintData } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function printTicketBrowser(data: TicketPrintData): Promise<void> {
  const qrDataUrl = await QRCode.toDataURL(data.code, {
    margin: 1,
    width: 220,
    errorCorrectionLevel: "M",
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Karcis ${escapeHtml(data.code)}</title>
<style>
  @page { margin: 0; size: 58mm auto; }
  body { font-family: "Courier New", monospace; margin: 0; padding: 8px; width: 58mm; color: #000; background: #fff; }
  .center { text-align: center; }
  .name { font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .row { font-size: 12px; line-height: 1.55; white-space: pre-wrap; }
  .qr { margin: 8px auto 2px; width: 46mm; height: 46mm; }
  .hint { font-size: 11px; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
  <div class="center name">${escapeHtml(data.eventName)}</div>
  <div class="line"></div>
  <div class="row">Kode  : ${escapeHtml(data.code)}
Nopol : ${escapeHtml(data.plate)}
Jenis : ${escapeHtml(data.vehicleType)}
Tarif : ${escapeHtml(formatRupiah(data.tariff))}
Status: ${escapeHtml(data.statusLabel)}
Masuk : ${escapeHtml(data.entryAt)}</div>
  <div class="line"></div>
  <div class="center"><img class="qr" src="${qrDataUrl}" alt="QR"></div>
  <div class="center hint">Scan QR saat keluar</div>
  <div class="noprint center" style="margin-top:12px">
    <button onclick="window.print()" style="padding:8px 16px;font-size:14px">Cetak</button>
    <button onclick="window.close()" style="padding:8px 16px;font-size:14px">Tutup</button>
  </div>
  <script>window.print()</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=420,height=680");
  if (!win) throw new Error("Popup diblokir browser. Izinkan popup untuk mencetak.");
  win.document.open();
  win.document.write(html);
  win.document.close();
}
