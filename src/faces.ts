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

export type BlockProposal = {
  uploader: string;
  txId: string;
  byteSize: number;
  fromHeight: number;
  toHeight: number;
  start: number;
};

export type BundleFunction<ConfigType> = (
  config: ConfigType,
  fromHeight: number,
  toHeight: number
) => Promise<any[]>;

export type ValidateFunction = (
  uploadBundle: any[],
  uploadBytes: number,
  downloadBundle: any[],
  downloadBytes: number
) => Promise<boolean>;
