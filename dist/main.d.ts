import { validate } from "./methods";
interface Logger {
    log(message: string): void;
}
interface DataItem {
    key: string;
    value: any;
}
interface Runtime {
    getDataItem(key: string): Promise<DataItem>;
    getNextKey(key: string): Promise<string>;
}
declare class KYVE {
    protected runtime: Runtime;
    protected logger: Logger;
    key: string;
    validate: typeof validate;
    constructor(runtime: Runtime, logger?: Logger);
    run(): Promise<void>;
}
export default KYVE;
