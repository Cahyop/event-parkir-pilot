/**
 * Browser-print fallback: renders the ticket in a popup window and calls
 * window.print(). Works everywhere Web Bluetooth does not (including iOS).
 */
import QRCode from "qrcode";
import { formatRupiah } from "./parking";
import type { TicketPrintData } from "./types";
import { getTicketTemplate, type TicketTemplate } from "./ticket-settings";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function printTicketBrowser(
  data: TicketPrintData,
  opts?: { template?: TicketTemplate },
): Promise<void> {
  const template = opts?.template || getTicketTemplate();
  const qrWidth = template === "super_compact" ? 130 : template === "compact" ? 160 : 220;

  const qrDataUrl = await QRCode.toDataURL(data.code, {
    margin: 1,
    width: qrWidth,
    errorCorrectionLevel: "M",
  });

  let bodyContent = "";

  if (template === "compact") {
    bodyContent = `
      <div class="center name">${escapeHtml(data.eventName)}</div>
      <div class="line"></div>
      <div class="center plate">${escapeHtml(data.plate)}</div>
      <div class="line"></div>
      <div class="row">${escapeHtml(data.vehicleType)} · ${escapeHtml(formatRupiah(data.tariff))}</div>
      <div class="row">Masuk: ${escapeHtml(data.entryAt)}</div>
      <div class="row">${escapeHtml(data.code)} · ${escapeHtml(data.statusLabel)}</div>
      <div class="center"><img class="qr" src="${qrDataUrl}" alt="QR"></div>
      <div class="center hint">Scan saat keluar</div>
    `;
  } else if (template === "super_compact") {
    bodyContent = `
      <div class="center name" style="font-size:12px">${escapeHtml(data.eventName)}</div>
      <div class="center plate" style="font-size:16px">${escapeHtml(data.plate)}</div>
      <div class="row" style="text-align:center">${escapeHtml(data.code)} | ${escapeHtml(data.vehicleType)} | ${escapeHtml(formatRupiah(data.tariff))}</div>
      <div class="row" style="text-align:center">${escapeHtml(data.entryAt)} (${escapeHtml(data.statusLabel)})</div>
      <div class="center"><img class="qr" style="width:34mm;height:34mm" src="${qrDataUrl}" alt="QR"></div>
    `;
  } else if (template === "formal") {
    bodyContent = `
      <div class="center" style="font-size:11px;font-weight:bold;letter-spacing:1px">=== STRUK RESMI PARKIR ===</div>
      <div class="center name">${escapeHtml(data.eventName)}</div>
      <div class="line" style="border-top:2px double #000"></div>
      <div class="center plate">${escapeHtml(data.plate)}</div>
      <div class="line"></div>
      <table style="width:100%;font-size:11px;line-height:1.4">
        <tr><td>Kode Tiket</td><td style="text-align:right;font-weight:bold">${escapeHtml(data.code)}</td></tr>
        <tr><td>Kendaraan</td><td style="text-align:right">${escapeHtml(data.vehicleType)}</td></tr>
        <tr><td>Biaya</td><td style="text-align:right;font-weight:bold">${escapeHtml(formatRupiah(data.tariff))}</td></tr>
        <tr><td>Status</td><td style="text-align:right">${escapeHtml(data.statusLabel)}</td></tr>
        <tr><td>Waktu Masuk</td><td style="text-align:right">${escapeHtml(data.entryAt)}</td></tr>
      </table>
      <div class="line" style="border-top:2px double #000"></div>
      <div class="center"><img class="qr" src="${qrDataUrl}" alt="QR"></div>
      <div class="center hint">Simpan struk sebagai bukti resmi</div>
    `;
  } else {
    bodyContent = `
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
    `;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Karcis ${escapeHtml(data.code)}</title>
<style>
  @page { margin: 0; size: 58mm auto; }
  body { font-family: "Courier New", monospace; margin: 0; padding: 6px; width: 58mm; color: #000; background: #fff; }
  .center { text-align: center; }
  .name { font-size: 14px; font-weight: 700; }
  .plate { font-size: 19px; font-weight: 900; letter-spacing: 1px; margin: 2px 0; }
  .line { border-top: 1px dashed #000; margin: 4px 0; }
  .row { font-size: 11px; line-height: 1.4; white-space: pre-wrap; }
  .qr { margin: 6px auto 2px; width: 42mm; height: 42mm; display: block; }
  .hint { font-size: 10px; margin-top: 2px; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
  ${bodyContent}
  <div class="noprint center" style="margin-top:10px">
    <button onclick="window.print()" style="padding:6px 14px;font-size:13px;font-weight:bold">Cetak</button>
    <button onclick="window.close()" style="padding:6px 14px;font-size:13px">Tutup</button>
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
