"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI = exports.getTagByName = void 0;
const commander_1 = require("commander");
const getTagByName = (name, tags) => {
    if (tags) {
        const tag = tags.find((tag) => tag.name === name);
        if (tag) {
            return tag.value;
        }
    }
    return undefined;
};
exports.getTagByName = getTagByName;
class CLI extends commander_1.Command {
    constructor(runtime = process.env.KYVE_RUNTIME, packageVersion = process.env.KYVE_VERSION) {
        super(runtime);
        this.runtime = runtime;
        this.packageVersion = packageVersion;
        this.requiredOption("-p, --pool <string>", "The address of the pool you want to run on.");
        this.requiredOption("-s, --stake <number>", "The amount of tokens you want to stake.");
        this.requiredOption("-pk, --private-key <string>", "Your Ethereum private key that holds $KYVE.");
        this.option("-k, --keyfile <string>", "The path to your Arweave keyfile. [optional]");
        this.option("-n, --name <string>", "The identifier name of the node. [optional, default = random]");
        this.option("-e, --endpoint <string>", "A custom Moonbase Alpha endpoint. [optional]");
        this.option("-g, --gas-multiplier <string>", "The amount that you want to multiply the default gas price by. [optional]");
        this.option("-st, --send-statistics <boolean>", "Send statistics. [optional, default = true]", true);
        this.option("--verbose", "[optional, default = false]", false);
        this.version(packageVersion, "-v, --version");
    }
}
exports.CLI = CLI;
