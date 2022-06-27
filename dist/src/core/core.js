"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Core = void 0;
const helpers_1 = require("../utils/helpers");
const JsonFileCache_1 = __importDefault(require("../cache/JsonFileCache"));
const package_json_1 = require("../../package.json");
const methods_1 = require("../methods");
const commander_1 = __importDefault(require("../commander"));
class Core {
    constructor(runtime, storage, cache = new JsonFileCache_1.default(), logger = console) {
        this.runtime = runtime;
        this.storage = storage;
        this.cache = cache;
        this.logger = logger;
        // register core methods
        this.validate = methods_1.validate;
        // define program
        const options = commander_1.default
            .name(this.runtime.name)
            .description(`KYVE Protocol Node [@kyve/core=${package_json_1.version}]`)
            .version(this.runtime.version)
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
        this.coreVersion = package_json_1.version;
        this.name = (0, helpers_1.generateName)(options.poolId, options.mnemonic, options.coreVersion);
        // init cache
        this.cache.init(`./cache/${this.name}`);
    }
}
exports.Core = Core;
