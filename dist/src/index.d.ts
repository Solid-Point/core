/// <reference types="node" />
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Bundle } from "./faces";
import { CLI } from "./utils";
import client from "prom-client";
import { Database } from "./utils/database";
import { Client } from "./utils/client";
export * from "./utils";
export * from "./faces";
export * from "./utils/helpers";
export * from "./utils/database";
declare class KYVE {
    protected poolId: number;
    protected pool: any;
    protected runtime: string;
    protected version: string;
    protected commission: string;
    protected client: Client;
    protected keyfile: JWKInterface;
    protected name: string;
    protected gasMultiplier: string;
    protected runMetrics: boolean;
    protected space: number;
    protected db: Database;
    protected arweave: Arweave;
    static metrics: typeof client;
    constructor(cli?: CLI);
    start(): Promise<void>;
    private run;
    logger(): Promise<void>;
    cache(): Promise<void>;
    getDataItem(height: number): Promise<void>;
    createBundle(): Promise<Bundle>;
    loadBundle(): Promise<Buffer>;
    private clearFinalizedData;
    private validateProposal;
    validate(uploadBundle: Buffer, uploadBytes: number, downloadBundle: Buffer, downloadBytes: number): Promise<boolean>;
    private downloadBundleFromArweave;
    private uploadBundleToArweave;
    private claimUploaderRole;
    private nextBundleProposal;
    private vote;
    private logNodeInfo;
    private setupMetrics;
    private getPool;
    private verifyNode;
    private generateRandomName;
}
export default KYVE;
