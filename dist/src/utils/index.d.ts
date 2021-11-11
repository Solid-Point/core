import { Command } from "commander";
import { Tags } from "../faces";
export declare const getTagByName: (name: string, tags?: Tags | undefined) => string | undefined;
export declare class CLI extends Command {
    runtime: string;
    packageVersion: string;
    constructor(runtime?: string, packageVersion?: string);
}
