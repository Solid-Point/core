/// <reference types="node" />
import { StorageProvider } from "../types";
export default class Arweave implements StorageProvider {
    name: string;
    private wallet;
    private arweaveClient;
    init(wallet: string): void;
    saveBundle(bundle: Buffer, tags: [string, string][]): Promise<string>;
    retrieveBundle(bundleId: string): Promise<any>;
}
