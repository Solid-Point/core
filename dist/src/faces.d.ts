export declare type Tag = {
    name: string;
    value: string;
};
export declare type Tags = Tag[];
export declare type Vote = {
    transaction: string;
    valid: boolean;
};
export declare type BlockInstructions = {
    uploader: string;
    fromHeight: number;
    toHeight: number;
};
export declare type BlockProposal = {
    uploader: string;
    txId: string;
    byteSize: number;
    fromHeight: number;
    toHeight: number;
    start: number;
};
export declare type BundleFunction<ConfigType> = (config: ConfigType, blockInstructions: BlockInstructions) => Promise<any[]>;
export declare type ValidateFunction = (uploadBundle: any[], uploadBytes: number, downloadBundle: any[], downloadBytes: number) => Promise<boolean>;
