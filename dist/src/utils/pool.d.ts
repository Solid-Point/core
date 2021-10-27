import { BigNumber } from "bignumber.js";
import { Contract, ethers, Wallet } from "ethers";
declare const Pool: (address: string, wallet: Wallet) => Contract;
export declare const toHumanReadable: (amount: BigNumber) => string;
export declare const toEthersBN: (amount: BigNumber) => ethers.BigNumber;
export declare const toBN: (amount: ethers.BigNumber) => BigNumber;
export declare const stake: (stake: string, pool: Contract, settings: any, gasMultiplier: string) => Promise<void>;
export declare const unstakeAll: (pool: Contract, gasMultiplier: string) => Promise<void>;
export default Pool;
