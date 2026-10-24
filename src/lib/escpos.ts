/**
 * ESC/POS receipt printing over Web Bluetooth for mini thermal printers
 * (58mm/80mm). Web Bluetooth works on Android Chrome/Edge — iOS is not
 * supported, so callers must keep the browser-print fallback available.
 */
import { formatRupiah } from "./parking";
import type { TicketPrintData } from "./types";

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
  connect(): Promise<BluetoothRemoteGATTServer>;
  getPrimaryServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice {
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

export function bluetoothPrintAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator && !!navigator.bluetooth;
}

export interface TicketPrinterOptions {
  widthMm: 58 | 80;
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

  // init
  push(27, 64);
  // center
  push(27, 97, 49);
  // event name: double width/height + bold
  push(27, 33, 56);
  text(data.eventName + "\n");
  // normal
  push(27, 33, 0);
  text(line + "\n");

  // left align
  push(27, 97, 48);
  text(padLine("Kode: " + data.code, width) + "\n");
  text(padLine("Nopol: " + data.plate, width) + "\n");
  text(padLine("Jenis: " + data.vehicleType, width) + "\n");
  text(padLine("Tarif: " + formatRupiah(data.tariff), width) + "\n");
  text(padLine("Status: " + data.statusLabel, width) + "\n");
  text(padLine("Masuk: " + data.entryAt, width) + "\n");
  text(line + "\n");

  // QR code (center again)
  push(27, 97, 49);
  // GS ( k Function 165: model 2
  push(29, 40, 107, 4, 0, 49, 65, 50, 0);
  // Function 167: module size 6
  push(29, 40, 107, 3, 0, 49, 67, 6);
  // Function 169: error correction M
  push(29, 40, 107, 3, 0, 49, 69, 49);
  // Function 180: store data
  const qrBytes = enc.encode(data.code);
  const len = qrBytes.length + 3;
  push(29, 40, 107, len & 0xff, (len >> 8) & 0xff, 49, 80, ...qrBytes);
  // Function 181: print
  push(29, 40, 107, 3, 0, 49, 81, 48);

  push(27, 97, 49);
  text("\n" + "Scan QR saat keluar\n");
  // feed
  push(27, 100, 4);
  // partial cut
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

/** Opens the Bluetooth device picker and prints the ticket. Throws on failure. */
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

  let device: BluetoothDevice;
  try {
    onProgress?.("selecting");
    // Gunakan acceptAllDevices: true agar dialog pencarian Bluetooth Chrome memunculkan semua printer di sekitar,
    // karena printer kasir umumnya tidak menyertakan service UUID di paket advertising awal.
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: COMMON_PRINTER_SERVICES,
    });
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      // Hanya anggap batal jika benar-benar user yang menekan "Cancel / Batal" di chooser
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
    throw new Error(
      "Karakteristik pencetakan tidak ditemukan pada perangkat ini. Pastikan Anda memilih printer thermal ESC/POS yang sesuai.",
    );
  }

  onProgress?.("sending");
  await withTimeout(
    writeChunked(characteristic, buildTicketBytes(data, opts)),
    12000,
    "Waktu pengiriman data ke printer habis (timeout). Periksa baterai atau koneksi printer.",
  );
}
