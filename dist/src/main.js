"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("./core");
class ProtocolNode extends core_1.Core {
    constructor() {
        super(...arguments);
        // register attributes
        this.key = "test";
    }
    // main method wait execution thread should be very abstract and easy to understand
    async run() {
        this.validate();
        const dataItem = await this.runtime.getDataItem(this.key);
        this.logger.log(dataItem.value);
        this.key = await this.runtime.getNextKey(dataItem.key);
        this.logger.log(this.key);
        this.logger.log(this.poolId.toString());
        this.logger.log(this.name);
        this.logger.log(this.network);
        this.logger.log(this.initialStake);
    }
}
// put storage platforms in storage folder -> user can make PRs or do their on in integration
class Arweave {
    async saveBundle(bundle) {
        return "arweave tx";
    }
    async retrieveBundle(bundleId) {
        return Buffer.from("arweave tx");
    }
}
class Bundlr {
    async saveBundle(bundle) {
        return "arweave tx";
    }
    async retrieveBundle(bundleId) {
        return Buffer.from("arweave tx");
    }
}
class IPFS {
    async saveBundle(bundle) {
        return "ipfs hash";
    }
    async retrieveBundle(bundleId) {
        return Buffer.from("ipfs hash");
    }
}
// integration runtime should be implemented on the integration repo
class EVM {
    constructor() {
        this.name = "@kyve/evm";
        this.version = "1.1.0";
    }
    async getDataItem(key) {
        return {
            key,
            value: `${key}value`,
        };
    }
    async getNextKey(key) {
        return `${key}+1`;
    }
}
// inject runtime and storage provider
const node = new ProtocolNode(new EVM(), new Arweave());
node.run();
exports.default = ProtocolNode;
