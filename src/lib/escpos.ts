/**
 * ESC/POS receipt printing over Web Bluetooth for mini thermal printers
 * (58mm/80mm). Web Bluetooth works on Android Chrome/Edge — iOS is not
 * supported, so callers must keep the browser-print fallback available.
 */
import { formatRupiah } from "./parking";
import type { TicketPrintData } from "./types";

const PRINTER_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const PRINTER_CHARACTERISTIC = "00002af1-0000-1000-8000-00805f9b34fb";

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
    await characteristic.writeValue(data.slice(i, i + CHUNK));
    await new Promise((r) => setTimeout(r, 25));
  }
}

/** Opens the Bluetooth device picker and prints the ticket. Throws on failure. */
export async function printTicketBluetooth(
  data: TicketPrintData,
  opts: TicketPrinterOptions = { widthMm: 58 },
): Promise<void> {
  if (!bluetoothPrintAvailable()) {
    throw new Error("Web Bluetooth tidak tersedia di browser ini");
  }
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [PRINTER_SERVICE] }, { services: [0xff00] }],
    optionalServices: [PRINTER_SERVICE, 0xff00],
  });
  const server = await device.gatt!.connect();
  let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  const services = await server.getPrimaryServices();
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
  if (!characteristic) throw new Error("Karakteristik printer tidak ditemukan");
  await writeChunked(characteristic, buildTicketBytes(data, opts));
}
