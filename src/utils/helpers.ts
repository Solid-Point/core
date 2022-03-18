import base64url from "base64url";
import { BigNumber } from "bignumber.js";

export const toBN = (amount: string) => {
  return new BigNumber(amount);
};

export const toHumanReadable = (amount: BigNumber) => {
  return amount.dividedBy(new BigNumber(10).exponentiatedBy(9)).toFixed(4);
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

export const callWithExponentialBackoff = async (
  fn: Function,
  depth = 0
): Promise<any> => {
  try {
    return await fn();
  } catch {
    await sleep(2 ** depth * 10);
    return depth > 12
      ? callWithExponentialBackoff(fn, depth)
      : callWithExponentialBackoff(fn, depth + 1);
  }
};

export const callWithLinearBackoff = async (
  fn: Function,
  duration = 1000
): Promise<any> => {
  try {
    return await fn();
  } catch {
    await sleep(duration);
    return callWithLinearBackoff(fn, duration);
  }
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

// Inspired by https://github.com/Bundlr-Network/arbundles/blob/f3e8e1df09e68e33f3a51af33127999566ab3e37/src/utils.ts#L87-L93.
const byteArrayToLong = (byteArray: Uint8Array): number => {
  let value = 0;
  for (let i = byteArray.length - 1; i >= 0; i--) {
    value = value * 256 + byteArray[i];
  }
  return value;
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

// Inspired by https://github.com/Bundlr-Network/arbundles/blob/8a1509bc9596467d2f05003039da7e4de4d02ce3/src/Bundle.ts#L174-L199.
export const parseBundle = (input: Buffer): Buffer[] => {
  const count = byteArrayToLong(input.slice(0, 32));
  const itemStart = 32 + 32 * count;
  let offset = 0;

  const result: Buffer[] = [];
  for (let i = 32; i < itemStart; i += 32) {
    const _offset = byteArrayToLong(input.slice(i, i + 32));
    result.push(input.slice(itemStart + offset, itemStart + offset + _offset));

    offset += _offset;
  }

  return result;
};
