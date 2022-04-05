import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { Logger } from "tslog";
import { CLI } from "./utils";
import client from "prom-client";
import { Database } from "./utils/database";
import { KyveSDK, KyveWallet } from "@kyve/sdk-test";
export * from "./utils";
export * from "./faces";
export * from "./utils/helpers";
export * from "./utils/database";
declare class KYVE {
    protected poolId: number;
    protected pool: any;
    protected runtime: string;
    protected version: string;
    protected chainVersion: string;
    protected wallet: KyveWallet;
    protected sdk: KyveSDK;
    protected keyfile: JWKInterface;
    protected name: string;
    protected network: string;
    protected batchSize: number;
    protected runMetrics: boolean;
    protected space: number;
    protected db: Database;
    protected logger: Logger;
    protected arweave: Arweave;
    static metrics: typeof client;
    constructor(cli?: CLI);
    start(): Promise<void>;
    private run;
    private logCacheHeight;
    private cache;
    getDataItem(key: number): Promise<{
        key: number;
        value: any;
    }>;
    private getDataItemAndSave;
    private createBundle;
    private loadBundle;
    private clearFinalizedData;
    private validateProposal;
    validate(localBundle: any[], localBytes: number, uploadBundle: any[], uploadBytes: number): Promise<boolean>;
    private downloadBundleFromArweave;
    private uploadBundleToArweave;
    private submitBundleProposal;
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
