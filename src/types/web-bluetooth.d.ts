/**
 * Minimal Web Bluetooth type declarations for the ESC/POS printer code.
 * lib.dom does not ship these; only what escpos.ts uses is declared.
 */

interface BluetoothRemoteGATTCharacteristic {
  readonly uuid: string;
  readonly properties: {
    readonly [key: string]: boolean;
    readonly write: boolean;
    readonly writeWithoutResponse: boolean;
  };
  writeValue(value: BufferSource): Promise<ArrayBuffer>;
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
  }): Promise<BluetoothDevice>;
}

interface Navigator {
  readonly bluetooth: Bluetooth;
}
