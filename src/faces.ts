export type BlockInstructions = {
  uploader: string;
  fromHeight: number;
};

export type BlockProposal = {
  uploader: string;
  txId: string;
  byteSize: number;
  fromHeight: number;
  toHeight: number;
  start: number;
};
