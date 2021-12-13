/// <reference types="node" />
import { BigNumber } from "bignumber.js";
import { Contract, ethers, Wallet } from "ethers";
export declare const getTokenContract: (pool: Contract) => Promise<Contract>;
export declare const getPoolContract: (address: string, wallet: Wallet) => Contract;
export declare const toHumanReadable: (amount: BigNumber) => string;
export declare const toEthersBN: (amount: BigNumber) => ethers.BigNumber;
export declare const toBN: (amount: ethers.BigNumber) => BigNumber;
export declare const getGasPrice: (pool: Contract, gasMultiplier: string) => Promise<ethers.BigNumber>;
export declare const sleep: (ms: number) => Promise<unknown>;
export declare const toBytes: (input: string) => Buffer;
export declare const fromBytes: (input: string) => string;
export declare const dataSizeOfString: (string: string) => number;
export declare const dataSizeOfBinary: (binary: ArrayBuffer) => number;
export declare const formatBundle: (input: Buffer[]) => Buffer;
