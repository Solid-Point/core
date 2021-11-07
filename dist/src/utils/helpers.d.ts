import { BigNumber } from "bignumber.js";
import { Contract, ethers, Wallet } from "ethers";
export declare const Token: (pool: Contract) => Promise<Contract>;
export declare const Pool: (address: string, wallet: Wallet) => Contract;
export declare const toHumanReadable: (amount: BigNumber) => string;
export declare const toEthersBN: (amount: BigNumber) => ethers.BigNumber;
export declare const toBN: (amount: ethers.BigNumber) => BigNumber;
export declare const getGasPrice: (pool: Contract, gasMultiplier: string) => Promise<ethers.BigNumber>;
