import base64url from "base64url";
import { BigNumber } from "bignumber.js";
import { Contract, ethers, Wallet } from "ethers";
import PoolABI from "../abi/pool.json";
import TokenABI from "../abi/token.json";

export const getTokenContract = async (pool: Contract): Promise<Contract> => {
  return new Contract((await pool.token()) as string, TokenABI, pool.signer);
};

export const getPoolContract = (address: string, wallet: Wallet): Contract => {
  return new Contract(address, PoolABI, wallet);
};

export const toHumanReadable = (amount: BigNumber) => {
  return amount.dividedBy(new BigNumber(10).exponentiatedBy(18)).toFixed(5);
};

export const toEthersBN = (amount: BigNumber) => {
  return ethers.BigNumber.from(amount.toFixed());
};

export const toBN = (amount: ethers.BigNumber) => {
  return new BigNumber(amount.toString());
};

export const getGasPrice = async (pool: Contract, gasMultiplier: string) => {
  return toEthersBN(
    toBN(await pool.provider.getGasPrice()).multipliedBy(
      new BigNumber(gasMultiplier).toFixed(2)
    )
  );
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const toBytes = (input: string): Buffer => {
  return Buffer.from(base64url.decode(input, "hex"), "hex");
};

export const fromBytes = (input: string): string => {
  return base64url.encode(input.slice(2), "hex");
};

export const dataSizeOfString = (string: string): number => {
  return new Uint8Array(new TextEncoder().encode(string)).byteLength || 0;
};

export const dataSizeOfBinary = (binary: ArrayBuffer): number => {
  return new Uint8Array(binary).byteLength || 0;
};
