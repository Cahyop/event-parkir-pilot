/**
 * ESC/POS receipt printing over Web Bluetooth for mini thermal printers
 * (58mm/80mm). Web Bluetooth works on Android Chrome/Edge — iOS is not
 * supported, so callers must keep the browser-print fallback available.
 */
import { formatRupiah } from "./parking";
import type { TicketPrintData } from "./types";
import { getTicketTemplate, type TicketTemplate } from "./ticket-settings";

interface BluetoothRemoteGATTCharacteristic {
  readonly uuid: string;
  readonly properties: {
    readonly [key: string]: boolean;
    readonly write: boolean;
    readonly writeWithoutResponse: boolean;
  };
  writeValue(value: BufferSource): Promise<ArrayBuffer>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  readonly uuid: string;
  getCharacteristics(characteristic?: string | number): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice {
  readonly name?: string;
  readonly gatt: BluetoothRemoteGATTServer | null;
}

interface Bluetooth {
  requestDevice(options?: {
    filters?: Array<{ services: Array<string | number> }>;
    optionalServices?: Array<string | number>;
    acceptAllDevices?: boolean;
  }): Promise<BluetoothDevice>;
}

declare global {
  interface Navigator {
    readonly bluetooth: Bluetooth;
  }
}

const PRINTER_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const PRINTER_CHARACTERISTIC = "00002af1-0000-1000-8000-00805f9b34fb";

const COMMON_PRINTER_SERVICES = [
  PRINTER_SERVICE,
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "0000af30-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

// Cache instance Bluetooth yang sedang aktif agar cetak berikutnya instan tanpa dialog chooser
let activeDevice: BluetoothDevice | null = null;
let activeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

export function isBluetoothPrinterConnected(): boolean {
  return !!(activeDevice?.gatt?.connected && activeCharacteristic);
}

export function getConnectedPrinterName(): string | null {
  if (isBluetoothPrinterConnected()) {
    return activeDevice?.name || "Printer Thermal";
  }
  return null;
}

export function disconnectBluetoothPrinter(): void {
  try {
    if (activeDevice?.gatt?.connected) {
      activeDevice.gatt.disconnect();
    }
  } catch {}
  activeDevice = null;
  activeCharacteristic = null;
}

export function bluetoothPrintAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator && !!navigator.bluetooth;
}

export interface TicketPrinterOptions {
  widthMm: 58 | 80;
  template?: TicketTemplate;
}

function charsPerLine(widthMm: 58 | 80): number {
  return widthMm === 58 ? 32 : 48;
}

function padLine(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

function buildTicketBytes(data: TicketPrintData, opts: TicketPrinterOptions): Uint8Array {
  const enc = new TextEncoder();
  const bytes: number[] = [];
  const push = (...b: number[]) => bytes.push(...b);
  const text = (s: string) => {
    for (const byte of enc.encode(s)) bytes.push(byte);
  };
  const width = charsPerLine(opts.widthMm);
  const line = "-".repeat(width);
  const template = opts.template || getTicketTemplate();

  // Reset printer
  push(27, 64);

  if (template === "compact") {
    // === FORMAT HEMAT KERTAS (ECO - REKOMENDASI) ===
    // Header
    push(27, 97, 49); // center
    push(27, 69, 1);  // bold
    text(data.eventName + "\n");
    push(27, 69, 0);  // normal
    text(line + "\n");

    // Nopol Besar & Tebal
    push(27, 33, 56); // double width/height + bold
    text(data.plate + "\n");
    push(27, 33, 0);  // reset normal

    // Info ringkas 2 baris padat
    push(27, 97, 48); // left
    text(padLine(`${data.vehicleType} · ${formatRupiah(data.tariff)}`, width) + "\n");
    text(padLine(`Masuk: ${data.entryAt}`, width) + "\n");
    text(padLine(`${data.code} · ${data.statusLabel}`, width) + "\n");
    text(line + "\n");

    // QR Code Ringkas (Module size 4)
    push(27, 97, 49); // center
    push(29, 40, 107, 4, 0, 49, 65, 50, 0); // model 2
    push(29, 40, 107, 3, 0, 49, 67, 4);      // module size 4 (hemat ~35%)
    push(29, 40, 107, 3, 0, 49, 69, 49);     // correction M
    const qrBytes = enc.encode(data.code);
    const len = qrBytes.length + 3;
    push(29, 40, 107, len & 0xff, (len >> 8) & 0xff, 49, 80, ...qrBytes);
    push(29, 40, 107, 3, 0, 49, 81, 48);     // print QR

    text("\nScan saat keluar\n");
    push(27, 100, 2); // feed hanya 2 baris (hemat kertas)
    push(29, 86, 66, 0); // cut
    return new Uint8Array(bytes);
  }

  if (template === "super_compact") {
    // === FORMAT SUPER HEMAT (MINI) ===
    push(27, 97, 49); // center
    text(data.eventName + "\n");
    push(27, 33, 48); // double width/height
    text(data.plate + "\n");
    push(27, 33, 0);  // normal
    text(`${data.code} | ${data.vehicleType} | ${formatRupiah(data.tariff)}\n`);
    text(`${data.entryAt} (${data.statusLabel})\n`);

    // QR Code Mini (Module size 3)
    push(29, 40, 107, 4, 0, 49, 65, 50, 0);
    push(29, 40, 107, 3, 0, 49, 67, 3);
    push(29, 40, 107, 3, 0, 49, 69, 49);
    const qrBytes = enc.encode(data.code);
    const len = qrBytes.length + 3;
    push(29, 40, 107, len & 0xff, (len >> 8) & 0xff, 49, 80, ...qrBytes);
    push(29, 40, 107, 3, 0, 49, 81, 48);

    text("\n");
    push(27, 100, 1); // feed 1 baris
    push(29, 86, 66, 0);
    return new Uint8Array(bytes);
  }

  // === FORMAT STANDAR (LENGKAP) ===
  push(27, 97, 49);
  push(27, 33, 56);
  text(data.eventName + "\n");
  push(27, 33, 0);
  text(line + "\n");

  push(27, 97, 48);
  text(padLine("Kode: " + data.code, width) + "\n");
  text(padLine("Nopol: " + data.plate, width) + "\n");
  text(padLine("Jenis: " + data.vehicleType, width) + "\n");
  text(padLine("Tarif: " + formatRupiah(data.tariff), width) + "\n");
  text(padLine("Status: " + data.statusLabel, width) + "\n");
  text(padLine("Masuk: " + data.entryAt, width) + "\n");
  text(line + "\n");

  push(27, 97, 49);
  push(29, 40, 107, 4, 0, 49, 65, 50, 0);
  push(29, 40, 107, 3, 0, 49, 67, 6);
  push(29, 40, 107, 3, 0, 49, 69, 49);
  const qrBytes = enc.encode(data.code);
  const len = qrBytes.length + 3;
  push(29, 40, 107, len & 0xff, (len >> 8) & 0xff, 49, 80, ...qrBytes);
  push(29, 40, 107, 3, 0, 49, 81, 48);

  text("\nScan QR saat keluar\n");
  push(27, 100, 4);
  push(29, 86, 66, 0);

  return new Uint8Array(bytes);
}

async function writeChunked(
  characteristic: BluetoothRemoteGATTCharacteristic,
  data: Uint8Array,
): Promise<void> {
  const CHUNK = 160;
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK);
    if (
      characteristic.writeValueWithoutResponse &&
      characteristic.properties.writeWithoutResponse &&
      !characteristic.properties.write
    ) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    await new Promise((r) => setTimeout(r, 25));
  }
}

export type PrintProgressStage = "selecting" | "connecting" | "sending";
export type PrintProgressCallback = (stage: PrintProgressStage) => void;

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** Menghubungkan printer Bluetooth secara manual & menyimpan koneksinya */
export async function connectBluetoothPrinter(): Promise<string> {
  if (typeof window !== "undefined" && window.self !== window.top) {
    throw new Error(
      "Akses Bluetooth diblokir di dalam frame/preview editor. Silakan buka aplikasi langsung di tab baru browser Google Chrome di HP Anda.",
    );
  }

  if (!bluetoothPrintAvailable()) {
    throw new Error(
      "Web Bluetooth tidak didukung browser ini. Gunakan Google Chrome di HP Android dengan koneksi HTTPS.",
    );
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: COMMON_PRINTER_SERVICES,
  });

  if (!device.gatt) {
    throw new Error("Perangkat Bluetooth yang dipilih tidak mendukung GATT connection.");
  }

  const server = await withTimeout(
    device.gatt.connect(),
    12000,
    "Waktu koneksi habis (timeout 12 detik). Pastikan printer dalam keadaan ON, jarak dekat, dan tidak sedang terkoneksi ke perangkat lain.",
  );

  const services = await withTimeout(
    server.getPrimaryServices(),
    8000,
    "Gagal membaca service printer (timeout). Coba matikan dan hidupkan kembali printer thermal Anda.",
  );

  let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  for (const service of services) {
    const chars = await service.getCharacteristics();
    const match = chars.find(
      (c) =>
        c.uuid === PRINTER_CHARACTERISTIC ||
        (c.properties && (c.properties.write || c.properties.writeWithoutResponse)),
    );
    if (match) {
      characteristic = match;
      break;
    }
  }

  if (!characteristic) {
    throw new Error("Karakteristik pencetakan tidak ditemukan pada perangkat ini.");
  }

  activeDevice = device;
  activeCharacteristic = characteristic;
  return device.name || "Printer Thermal";
}

/** Opens the Bluetooth device picker (jika belum konek) and prints the ticket. Throws on failure. */
export async function printTicketBluetooth(
  data: TicketPrintData,
  opts: TicketPrinterOptions = { widthMm: 58 },
  onProgress?: PrintProgressCallback,
): Promise<void> {
  if (typeof window !== "undefined" && window.self !== window.top) {
    throw new Error(
      "Akses Bluetooth diblokir di dalam frame/preview editor. Silakan buka aplikasi langsung di tab baru browser Google Chrome di HP Anda.",
    );
  }

  if (!bluetoothPrintAvailable()) {
    throw new Error(
      "Web Bluetooth tidak didukung browser ini. Gunakan Google Chrome di HP Android dengan koneksi HTTPS.",
    );
  }

  // Gunakan koneksi yang sudah ada jika masih aktif
  let characteristic = activeCharacteristic;
  if (!characteristic || !activeDevice?.gatt?.connected) {
    let device: BluetoothDevice;
    try {
      onProgress?.("selecting");
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: COMMON_PRINTER_SERVICES,
      });
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes("user cancelled") || msg.includes("chooser was cancelled")) {
          const cancelErr = new Error("Pemilihan printer dibatalkan");
          cancelErr.name = "UserCancelledError";
          throw cancelErr;
        }
        if (msg.includes("adapter not available") || msg.includes("turned off")) {
          throw new Error(
            "Bluetooth di HP Anda sedang MATI. Silakan aktifkan Bluetooth di Pengaturan / Quick Settings HP Anda lalu coba lagi.",
          );
        }
        if (msg.includes("permissions policy") || msg.includes("disallowed")) {
          throw new Error(
            "Akses Bluetooth diblokir oleh frame/iframe. Silakan buka aplikasi langsung di tab baru browser Chrome HP Anda.",
          );
        }
        if (msg.includes("no devices found") || msg.includes("no bluetooth devices")) {
          throw new Error(
            "Tidak ada printer Bluetooth yang ditemukan. Pastikan printer thermal dalam kondisi ON, baterai cukup, dan berjarak dekat.",
          );
        }
        if (err.name === "NotFoundError") {
          throw new Error(
            "Dialog pencarian Bluetooth tidak dapat dibuka. Pastikan Bluetooth HP aktif dan izin 'Perangkat di sekitar' (Nearby devices) diizinkan untuk Chrome.",
          );
        }
      }
      throw err;
    }

    if (!device.gatt) {
      throw new Error("Perangkat Bluetooth yang dipilih tidak mendukung GATT connection.");
    }

    onProgress?.("connecting");
    const server = await withTimeout(
      device.gatt.connect(),
      12000,
      "Waktu koneksi habis (timeout 12 detik). Pastikan printer dalam keadaan ON, jarak dekat, dan tidak sedang terkoneksi ke perangkat lain.",
    );

    const services = await withTimeout(
      server.getPrimaryServices(),
      8000,
      "Gagal membaca service printer (timeout). Coba matikan dan hidupkan kembali printer thermal Anda.",
    );

    characteristic = null;
    for (const service of services) {
      const chars = await service.getCharacteristics();
      const match = chars.find(
        (c) =>
          c.uuid === PRINTER_CHARACTERISTIC ||
          (c.properties && (c.properties.write || c.properties.writeWithoutResponse)),
      );
      if (match) {
        characteristic = match;
        break;
      }
    }

    if (!characteristic) {
      throw new Error(
        "Karakteristik pencetakan tidak ditemukan pada perangkat ini. Pastikan Anda memilih printer thermal ESC/POS yang sesuai.",
      );
    }

    activeDevice = device;
    activeCharacteristic = characteristic;
  }

  onProgress?.("sending");
  await withTimeout(
    writeChunked(characteristic, buildTicketBytes(data, opts)),
    12000,
    "Waktu pengiriman data ke printer habis (timeout). Periksa baterai atau koneksi printer.",
  );
}

