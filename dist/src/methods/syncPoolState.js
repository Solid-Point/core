"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPoolState = void 0;
const helpers_1 = require("../utils/helpers");
async function syncPoolState() {
    this.logger.debug(`Attempting to fetch pool state`);
    await (0, helpers_1.callWithBackoffStrategy)(async () => {
        var _a;
        const { pool } = await this.query.kyve.registry.v1beta1.pool({
            id: this.poolId.toString(),
        });
        this.pool = pool;
        try {
            this.poolConfig = JSON.parse(this.pool.config);
        }
        catch (error) {
            this.logger.debug(`Failed to parse the pool config: ${(_a = this.pool) === null || _a === void 0 ? void 0 : _a.config}`);
            this.poolConfig = {};
        }
    }, { limitTimeout: "5m", increaseBy: "10s" }, (_, ctx) => {
        this.logger.debug(`Failed to fetch pool state. Retrying in ${ctx.nextTimeoutInMs / 1000}s ...`);
    });
    this.logger.debug(`Successfully fetched pool state`);
}
exports.syncPoolState = syncPoolState;
