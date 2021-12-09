"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI = exports.getTagByName = exports.fetchLatestArweaveTransaction = void 0;
const commander_1 = require("commander");
var arweave_1 = require("./arweave");
Object.defineProperty(exports, "fetchLatestArweaveTransaction", { enumerable: true, get: function () { return arweave_1.fetchLatestArweaveTransaction; } });
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
        this.requiredOption("-c, --commission <number>", "The commission rate of your node.");
        this.requiredOption("-pk, --private-key <string>", "Your Ethereum private key that holds $KYVE.");
        this.option("-k, --keyfile <string>", "The path to your Arweave keyfile. [optional]");
        this.option("-n, --name <string>", "The identifier name of the node. [optional, default = random]");
        this.option("-e, --endpoint <string>", "A custom Moonbase Alpha endpoint. [optional]");
        this.option("-g, --gas-multiplier <string>", "The amount that you want to multiply the default gas price by. [optional]");
        this.option("-st, --send-statistics", "Send statistics.");
        this.option("-m, --metrics", "Run Prometheus metrics server.");
        this.option("-v, --verbose", "Include if you want logs to be verbose.", false);
        this.version(packageVersion, "--version");
    }
}
exports.CLI = CLI;
