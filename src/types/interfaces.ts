import { DataItem } from ".";

export interface Runtime {
  name: string;
  version: string;

  getDataItem(key: string): Promise<DataItem>;
  getNextKey(key: string): Promise<string>;
}

export interface StorageProvider {
  saveBundle(bundle: Buffer): Promise<string>;
  retrieveBundle(bundleId: string): Promise<Buffer>;
}

export interface Logger {
  log(message: string): void;
}
