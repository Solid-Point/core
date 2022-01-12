/// <reference types="node" />
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
export declare type Bundle = {
    fromHeight: number;
    toHeight: number;
    bundle: Buffer;
};
