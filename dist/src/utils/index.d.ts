import { Command } from "commander";
import { Logger } from "tslog";
export declare const logger: Logger;
export declare class CLI extends Command {
    runtime: string;
    packageVersion: string;
    constructor(runtime?: string, packageVersion?: string);
}
