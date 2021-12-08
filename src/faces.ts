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
