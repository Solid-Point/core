import { Command } from "commander";
export { fetchLatestArweaveTransaction } from "./arweave";
export declare class CLI extends Command {
    runtime: string;
    packageVersion: string;
    constructor(runtime?: string, packageVersion?: string);
}
