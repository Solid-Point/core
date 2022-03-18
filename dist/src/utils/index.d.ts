import { Command } from "commander";
export declare class CLI extends Command {
    runtime: string;
    packageVersion: string;
    constructor(runtime?: string, packageVersion?: string);
}
