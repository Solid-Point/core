"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI = exports.logger = void 0;
const commander_1 = require("commander");
const tslog_1 = require("tslog");
exports.logger = new tslog_1.Logger({
    displayFilePath: "hidden",
    displayFunctionName: false,
});
class CLI extends commander_1.Command {
    constructor(runtime = process.env.KYVE_RUNTIME, packageVersion = process.env.KYVE_VERSION) {
        super(runtime);
        this.runtime = runtime;
        this.packageVersion = packageVersion;
        this.requiredOption("-p, --poolId <number>", "The id of the pool you want to run on.");
        this.requiredOption("-c, --commission <number>", "The commission rate of your node.");
        this.requiredOption("-mn, --mnemonic <string>", "Your mnemonic of your account.");
        this.option("-k, --keyfile <string>", "The path to your Arweave keyfile. [optional]");
        this.option("-n, --name <string>", "The identifier name of the node. [optional, default = random]");
        this.option("-e, --endpoint <string>", "A custom Moonbase Alpha endpoint. [optional]");
        this.option("-sp, --space <number>", "The size of disk space in bytes the node is allowed to use. [optional, default = 1000000000 (1 GB)]", "1000000000");
        this.option("-g, --gas-multiplier <string>", "The amount that you want to multiply the default gas price by. [optional]", "1");
        this.option("-st, --send-statistics", "Send statistics.");
        this.option("-m, --metrics", "Run Prometheus metrics server.");
        this.option("-v, --verbose", "Include if you want logs to be verbose.", false);
        this.version(packageVersion, "--version");
    }
}
exports.CLI = CLI;
