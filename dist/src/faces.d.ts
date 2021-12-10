export declare type BlockInstructions = {
    uploader: string;
    fromHeight: number;
};
export declare type BlockProposal = {
    uploader: string;
    txId: string;
    byteSize: number;
    fromHeight: number;
    toHeight: number;
    start: number;
};
