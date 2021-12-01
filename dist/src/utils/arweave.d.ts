/// <reference types="node" />
export declare const toBytes: (input: string) => Buffer;
export declare const fromBytes: (input: string) => string;
export declare const fetchLatestArweaveTransaction: (pool: string) => Promise<string | undefined>;
