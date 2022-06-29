"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Arweave_1 = __importDefault(require("./storage/Arweave"));
const JsonFileCache_1 = __importDefault(require("./cache/JsonFileCache"));
const package_json_1 = require("../package.json");
const methods_1 = require("./methods");
const commander_1 = __importDefault(require("./commander"));
const sdk_1 = __importDefault(require("@kyve/sdk"));
class Node {
    constructor() {
        // register core methods
        this.setupLogger = methods_1.setupLogger;
        this.setupName = methods_1.setupName;
        this.logNodeInfo = methods_1.logNodeInfo;
        this.syncPoolState = methods_1.syncPoolState;
        // define program
        const options = commander_1.default
            .name("@kyve/core")
            .description(`KYVE Protocol Node`)
            .version(package_json_1.version)
            .parse()
            .opts();
        // assign program options
        this.poolId = options.poolId;
        this.mnemonic = options.mnemonic;
        this.keyfile = options.keyfile;
        this.initialStake = options.initialStake;
        this.network = options.network;
        this.verbose = options.verbose;
        // assign main attributes
        this.sdk = new sdk_1.default(this.network);
        this.query = this.sdk.createLCDClient();
        this.coreVersion = package_json_1.version;
        this.name = this.setupName();
        this.logger = this.setupLogger();
    }
    addRuntime(runtime) {
        this.runtime = runtime;
        return this;
    }
    addStorageProvider(storageProvider) {
        this.storageProvider = storageProvider;
        this.storageProvider.init(this.keyfile);
        return this;
    }
    addCache(cache) {
        this.cache = cache;
        this.cache.init(`./cache/${this.name}`);
        return this;
    }
    // main method wait execution thread should be very abstract and easy to understand
    async run() {
        this.client = await this.sdk.fromMnemonic(this.mnemonic);
        this.logNodeInfo();
        await this.syncPoolState();
        // console.log(this.pool);
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
new Node()
    .addRuntime(new EVM())
    .addStorageProvider(new Arweave_1.default())
    .addCache(new JsonFileCache_1.default())
    .run();
exports.default = Node;
