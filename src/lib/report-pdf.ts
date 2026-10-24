import { formatDateTime, formatDuration, formatRupiah, paymentStatusLabel } from "./parking";
import type { ParkingEvent, Ticket } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ReportPdfData {
  event: ParkingEvent;
  tickets: Ticket[];
  filteredTickets: Ticket[];
  filterLabel: string;
  report: {
    totalIn: number;
    stillInside: number;
    exited: number;
    revenueTotal: number;
    revenuePrepaid: number;
    revenueAtExit: number;
  };
}

export function exportReportPdf(data: ReportPdfData): void {
  const generatedAt = formatDateTime(new Date().toISOString());
  const ticketsToPrint = data.filteredTickets;

  const rowsHtml = ticketsToPrint
    .map((t, idx) => {
      const exitStr = t.exit_at ? formatDateTime(t.exit_at) : "— (Di Dalam)";
      const durationStr = formatDuration(t.entry_at, t.exit_at ?? new Date().toISOString());
      const statusStr = t.exit_at
        ? paymentStatusLabel(t.payment_status)
        : t.payment_status === "prepaid"
          ? "Lunas di Awal"
          : "Belum Bayar";

      return `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="font-family:monospace;font-weight:bold;">${escapeHtml(t.code)}</td>
        <td style="font-weight:bold;">${escapeHtml(t.plate)}</td>
        <td>${escapeHtml(t.vehicle_type)}</td>
        <td>${escapeHtml(formatDateTime(t.entry_at))}</td>
        <td>${escapeHtml(exitStr)}</td>
        <td>${escapeHtml(durationStr)}</td>
        <td style="text-align:right;">${escapeHtml(formatRupiah(t.tariff))}</td>
        <td style="text-align:center;">${escapeHtml(statusStr)}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Laporan Parkir - ${escapeHtml(data.event.name)}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 15mm 12mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #111827;
    background: #fff;
    margin: 0;
    padding: 20px;
    font-size: 11px;
    line-height: 1.4;
  }
  .header {
    border-bottom: 2px solid #111827;
    padding-bottom: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .header h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #111827;
  }
  .header .meta {
    font-size: 11px;
    color: #4b5563;
    margin-top: 4px;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }
  .stat-card {
    border: 1px solid #e5e7eb;
    background-color: #f9fafb;
    border-radius: 8px;
    padding: 10px;
  }
  .stat-card.revenue {
    border-color: #10b981;
    background-color: #ecfdf5;
  }
  .stat-label {
    font-size: 9px;
    text-transform: uppercase;
    font-weight: 700;
    color: #6b7280;
    letter-spacing: 0.5px;
  }
  .stat-value {
    font-size: 18px;
    font-weight: 800;
    margin-top: 4px;
    color: #111827;
  }
  .stat-card.revenue .stat-value {
    color: #047857;
  }
  .stat-sub {
    font-size: 9px;
    color: #4b5563;
    margin-top: 2px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 10px;
  }
  th, td {
    border: 1px solid #d1d5db;
    padding: 6px 8px;
  }
  th {
    background-color: #f3f4f6;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.3px;
    color: #374151;
  }
  tr:nth-child(even) td {
    background-color: #f9fafb;
  }
  .footer {
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #6b7280;
    border-top: 1px solid #e5e7eb;
    padding-top: 8px;
  }
  .action-bar {
    position: fixed;
    top: 12px;
    right: 12px;
    display: flex;
    gap: 8px;
    background: #fff;
    padding: 8px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border: 1px solid #e5e7eb;
  }
  .action-bar button {
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    border: none;
  }
  .btn-print { background: #2563eb; color: #fff; }
  .btn-close { background: #f3f4f6; color: #374151; }
  @media print {
    .action-bar { display: none; }
    body { padding: 0; }
  }
</style>
</head>
<body>
  <div class="action-bar">
    <button class="btn-print" onclick="window.print()">Simpan PDF / Cetak</button>
    <button class="btn-close" onclick="window.close()">Tutup</button>
  </div>

  <div class="header">
    <div>
      <h1>LAPORAN KAS & TRANSAKSI PARKIR</h1>
      <div class="meta">
        <strong>Event:</strong> ${escapeHtml(data.event.name)} | 
        <strong>Kategori:</strong> ${escapeHtml(data.filterLabel)}
      </div>
    </div>
    <div style="text-align:right;">
      <div class="meta"><strong>Dicetak pada:</strong> ${escapeHtml(generatedAt)}</div>
      <div class="meta">Total Data: ${ticketsToPrint.length} transaksi</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Masuk</div>
      <div class="stat-value">${data.report.totalIn}</div>
      <div class="stat-sub">Semua kendaraan tercatat</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Masih di Dalam</div>
      <div class="stat-value">${data.report.stillInside}</div>
      <div class="stat-sub">Belum check-out</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Sudah Keluar</div>
      <div class="stat-value">${data.report.exited}</div>
      <div class="stat-sub">Telah selesai parkir</div>
    </div>
    <div class="stat-card revenue">
      <div class="stat-label">Total Uang Masuk</div>
      <div class="stat-value">${escapeHtml(formatRupiah(data.report.revenueTotal))}</div>
      <div class="stat-sub">Awal: ${escapeHtml(formatRupiah(data.report.revenuePrepaid))} · Keluar: ${escapeHtml(formatRupiah(data.report.revenueAtExit))}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 28px;">No</th>
        <th>Kode</th>
        <th>Nomor Polisi</th>
        <th>Jenis</th>
        <th>Jam Masuk</th>
        <th>Jam Keluar</th>
        <th>Durasi</th>
        <th style="text-align:right;">Tarif</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="9" style="text-align:center;padding:16px;color:#6b7280;">Tidak ada transaksi</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <div>Sistem Parkir Event — Dokumen Laporan Resmi</div>
    <div>Halaman 1</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Jendela popup diblokir browser. Izinkan popup untuk mengunduh/mencetak PDF.");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
