/// <reference types="node" />
export interface Operation {
    type: "put" | "del";
    key: string;
    value?: Buffer;
}
export declare class Database {
    path: string;
    constructor(path: string);
    put(key: string | number, value: Buffer): Promise<void>;
    get(key: string | number): Promise<Buffer>;
    del(key: string | number): Promise<void>;
}
