/// <reference types="node" />
export interface Operation {
    type: "put" | "del";
    key: string;
    value?: Buffer;
}
export declare class Database {
    path: string;
    constructor(path: string);
    put(key: string, value: Buffer): Promise<void>;
    get(key: string): Promise<Buffer>;
    del(key: string): Promise<void>;
}
