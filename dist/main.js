"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const methods_1 = require("./methods");
class KYVE {
    constructor(runtime, logger = console) {
        this.runtime = runtime;
        this.logger = logger;
        // register attributes
        this.key = "test";
        // register methods
        this.validate = methods_1.validate;
    }
    async run() {
        this.validate();
        const dataItem = await this.runtime.getDataItem(this.key);
        this.logger.log(dataItem.value);
        this.key = await this.runtime.getNextKey(dataItem.key);
        this.logger.log(this.key);
    }
}
class EVM {
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
const core = new KYVE(new EVM());
core.run();
exports.default = KYVE;
