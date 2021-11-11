import { Command } from "commander";
import { Tags } from "../faces";
export declare const getTagByName: (name: string, tags?: Tags | undefined) => string | undefined;
export declare class CLI extends Command {
    constructor(runtime: string, version: string);
}
