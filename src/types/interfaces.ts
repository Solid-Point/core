import { DataItem } from ".";

export interface Runtime {
  name: string;
  version: string;

  getDataItem(key: string): Promise<DataItem>;
  getNextKey(key: string): Promise<string>;
}

export interface StorageProvider {
  name: string;

  init(wallet: string): void;
  saveBundle(bundle: Buffer, tags: [string, string][]): Promise<string>;
  retrieveBundle(bundleId: string): Promise<Buffer>;
}

export interface Cache {
  name: string;
  path: string;

  init(path: string): void;
  put(key: string, value: any): Promise<void>;
  get(key: string): Promise<any>;
  exists(key: string): Promise<boolean>;
  del(key: string): Promise<void>;
  drop(): Promise<void>;
}
