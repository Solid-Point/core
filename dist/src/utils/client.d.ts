import { DirectSecp256k1HdWallet, OfflineDirectSigner, EncodeObject, Registry } from "@cosmjs/proto-signing";
import { SigningStargateClient, DeliverTxResponse } from "@cosmjs/stargate";
interface Endpoints {
    rpc: string;
    rest: string;
}
declare type Signer = DirectSecp256k1HdWallet | OfflineDirectSigner;
declare const _default: Registry;
export default _default;
export declare class Client {
    private readonly mnemonic;
    readonly endpoints: Endpoints;
    private signer?;
    private address?;
    private client?;
    constructor(mnemonic: string, endpoints?: Endpoints);
    getSigner(): Promise<Signer>;
    getClient(): Promise<SigningStargateClient>;
    sendMessage(msg: EncodeObject): Promise<DeliverTxResponse>;
    getAddress(): Promise<string>;
    getBalance(): Promise<string>;
}
