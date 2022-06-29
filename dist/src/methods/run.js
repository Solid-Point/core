"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const helpers_1 = require("../utils/helpers");
async function run() {
    while (true) {
        this.logger.info(`Starting bundle proposal round ${this.pool.total_bundles}`);
        await (0, helpers_1.sleep)(10 * 1000);
    }
}
exports.run = run;
