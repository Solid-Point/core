/// <reference types="node" />
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Contract, Wallet } from "ethers";
import { Bundle, BundleInstructions, BundleProposal } from "./faces";
import { CLI } from "./utils";
import client from "prom-client";
import { Database } from "./utils/database";
export * from "./utils";
export * from "./faces";
export * from "./utils/helpers";
export * from "./utils/database";
export * from "./utils/progress";
declare class KYVE {
    protected pool: Contract;
    protected runtime: string;
    protected version: string;
    protected stake: string;
    protected commission: string;
    protected wallet: Wallet;
    protected keyfile: JWKInterface;
    protected name: string;
    protected gasMultiplier: string;
    protected poolState: any;
    protected runMetrics: boolean;
    protected space: number;
    protected db: Database;
    protected arweave: Arweave;
    static metrics: typeof client;
    constructor(cli?: CLI);
    start(): Promise<void>;
    private run;
    worker(): Promise<void>;
    requestWorkerBatch(workerHeight: number): Promise<any[]>;
    createBundle(bundleInstructions: BundleInstructions): Promise<Bundle>;
    loadBundle(bundleProposal: BundleProposal): Promise<any[]>;
    private clearFinalizedData;
    private validateProposal;
    validate(uploadBundle: Buffer, uploadBytes: number, downloadBundle: Buffer, downloadBytes: number): Promise<boolean>;
    private getBundleProposal;
    private getBundleInstructions;
    private uploadBundleToArweave;
    private submitBundleProposal;
    private nextBundleInstructions;
    private vote;
    private logNodeInfo;
    private setupMetrics;
    private fetchPoolState;
    private checkIfNodeIsValidator;
    private setupNodeStake;
    private selfStake;
    private selfUnstake;
    private setupNodeCommission;
    private generateRandomName;
}
export default KYVE;
