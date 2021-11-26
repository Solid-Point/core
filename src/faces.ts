import { Logger } from "tslog";

// Uploader types.

export type Tag = { name: string; value: string };
export type Tags = Tag[];

export type Vote = {
  transaction: string;
  valid: boolean;
};

export type BlockInstructions = {
  uploader: string;
  fromHeight: number;
  toHeight: number;
};

export type BundlerFunction<ConfigType> = (
  config: ConfigType,
  fromHeight: number,
  toHeight: number
) => Promise<any[]>;
