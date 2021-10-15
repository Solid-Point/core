import { JWKInterface } from "arweave/node/lib/wallet";
import { UploadFunction, ValidateFunction } from "./faces";
declare class KYVE {
    private pool;
    private stake;
    private wallet;
    private keyfile?;
    private name;
    private buffer;
    private votes;
    private _bundleSize?;
    private _settings;
    private client;
    constructor(poolAddress: string, stakeAmount: number, privateKey: string, keyfile?: JWKInterface, name?: string);
    run<ConfigType>(uploadFunction: UploadFunction<ConfigType>, validateFunction: ValidateFunction<ConfigType>): Promise<void>;
    private uploader;
    private listener;
    private validator;
    private vote;
    private sync;
    private fetchBundleSize;
    private fetchConfig;
    private fetchSettings;
}
export default KYVE;
