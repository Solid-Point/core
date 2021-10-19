import { JWKInterface } from "arweave/node/lib/wallet";
import { UploadFunction, ValidateFunction } from "./faces";
declare class KYVE {
    private pool;
    private runtime;
    private stake;
    private wallet;
    private keyfile?;
    private name;
    private buffer;
    private votes;
    private _metadata;
    private _settings;
    private client;
    constructor(poolAddress: string, runtime: string, stakeAmount: number, privateKey: string, keyfile?: JWKInterface, name?: string);
    run<ConfigType>(uploadFunction: UploadFunction<ConfigType>, validateFunction: ValidateFunction<ConfigType>): Promise<void>;
    private uploader;
    private listener;
    private validator;
    private vote;
    private sync;
    private fetchConfig;
    private fetchMetadata;
    private fetchSettings;
}
export default KYVE;
