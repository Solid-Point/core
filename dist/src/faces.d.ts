export declare type BundleInstructions = {
    uploader: string;
    fromHeight: number;
};
export declare type BundleProposal = {
    uploader: string;
    txId: string;
    parentTxId: string;
    byteSize: number;
    fromHeight: number;
    toHeight: number;
    start: number;
};
