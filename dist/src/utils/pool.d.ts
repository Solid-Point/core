import { BigNumber, Contract, Wallet } from "ethers";
declare const Pool: (address: string, wallet: Wallet) => Contract;
export declare const decimals: BigNumber;
export declare const stake: (stake: number, pool: Contract, settings: any) => Promise<void>;
export default Pool;
