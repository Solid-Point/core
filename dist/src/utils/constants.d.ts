import { DirectSecp256k1HdWalletOptions } from "@cosmjs/proto-signing";
export declare const KYVE_WALLET_OPTIONS: Partial<DirectSecp256k1HdWalletOptions>;
export declare const KYVE_DECIMALS = 9;
export declare const KYVE_DEFAULT_FEE: {
    amount: import("@cosmjs/proto-signing").Coin[];
    gas: string;
};
export declare const KYVE_ENDPOINTS: {
    rpc: string;
    rest: string;
};
