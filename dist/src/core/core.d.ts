import { Runtime, StorageProvider, Logger } from "../types";
import { Cache } from "../cache";
import { validate } from "../methods";
export declare abstract class Core {
    protected runtime: Runtime;
    protected storage: StorageProvider;
    protected cache: Cache;
    protected logger: Logger;
    protected coreVersion: string;
    protected pool: any;
    protected name: string;
    protected poolId: number;
    protected mnemonic: string;
    protected keyfile: string;
    protected initialStake: string;
    protected network: string;
    protected verbose: boolean;
    validate: typeof validate;
    constructor(runtime: Runtime, storage: StorageProvider, cache?: Cache, logger?: Logger);
    abstract run(): Promise<void>;
}
