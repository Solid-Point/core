"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI = void 0;
const commander_1 = require("commander");
class CLI extends commander_1.Command {
    constructor(runtime = process.env.KYVE_RUNTIME, packageVersion = process.env.KYVE_VERSION) {
        super(runtime);
        this.runtime = runtime;
        this.packageVersion = packageVersion;
        this.option("-n, --name <string>", "The identifier name of the node. [optional, default = auto generated]");
        this.requiredOption("-p, --poolId <number>", "The id of the pool you want to run on.");
        // this.requiredOption(
        //   "-c, --commission <number>",
        //   "The commission rate of your node."
        // );
        this.requiredOption("-mn, --mnemonic <string>", "Your mnemonic of your account.");
        this.requiredOption("-k, --keyfile <string>", "The path to your Arweave keyfile.");
        this.option("-n, --network <string>", "The chain id of the network. [optional, default = alpha]", "alpha");
        this.option("-sp, --space <number>", "The size of disk space in bytes the node is allowed to use. [optional, default = 1000000000 (1 GB)]", "1000000000");
        this.option("-m, --metrics", "Run Prometheus metrics server. [optional, default = false]", false);
        this.option("-v, --verbose", "Run node in verbose mode. [optional, default = false]", false);
        this.version(packageVersion, "--version");
    }
}
exports.CLI = CLI;
