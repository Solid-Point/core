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

// Inspired by https://github.com/Bundlr-Network/arbundles/blob/f3e8e1df09e68e33f3a51af33127999566ab3e37/src/utils.ts#L41-L85.
const longTo32ByteArray = (long: number): Uint8Array => {
  const byteArray = Buffer.alloc(32, 0);

  for (let index = 0; index < byteArray.length; index++) {
    const byte = long & 0xff;
    byteArray[index] = byte;
    long = (long - byte) / 256;
  }

  return Uint8Array.from(byteArray);
};

// Inspired by https://github.com/Bundlr-Network/arbundles/blob/1976030eba3953dcd7582e65b50217f893f6248d/src/ar-data-bundle.ts#L25-L64.
export const formatBundle = (input: Buffer[]): Buffer => {
  const offsets = new Uint8Array(32 * input.length);
  input.forEach((item, index) => {
    offsets.set(longTo32ByteArray(item.byteLength), 32 * index);
  });

  return Buffer.concat([
    longTo32ByteArray(input.length),
    offsets,
    Buffer.concat(input),
  ]);
};
