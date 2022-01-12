export type BundleInstructions = {
  uploader: string;
  fromHeight: number;
};

export type BundleProposal = {
  uploader: string;
  txId: string;
  parentTxId: string;
  byteSize: number;
  fromHeight: number;
  toHeight: number;
  start: number;
};

export type Bundle = {
  fromHeight: number;
  toHeight: number;
  bundle: Buffer;
};
