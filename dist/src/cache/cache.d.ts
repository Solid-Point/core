export declare abstract class Cache {
    path: string;
    init(path: string): void;
    abstract put(key: string, value: any): Promise<void>;
    abstract get(key: string): Promise<any>;
    abstract exists(key: string): Promise<boolean>;
    abstract del(key: string): Promise<void>;
    abstract drop(): Promise<void>;
}
