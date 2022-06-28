import { Cache } from "../types";
export default class JsonFileCache implements Cache {
    name: string;
    path: string;
    init(path: string): void;
    put(key: string | number, value: any): Promise<void>;
    get(key: string | number): Promise<any>;
    del(key: string | number): Promise<void>;
    drop(): Promise<void>;
    exists(key: string | number): Promise<boolean>;
}
