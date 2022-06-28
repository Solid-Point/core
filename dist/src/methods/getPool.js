"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = void 0;
const helpers_1 = require("../utils/helpers");
async function getPool() {
    this.logger.debug(`Attempting to fetch pool state`);
    return new Promise(async (resolve) => {
        var _a;
        let requests = 1;
        while (true) {
            try {
                const { pool } = await this.query.kyve.registry.v1beta1.pool({
                    id: this.poolId.toString(),
                });
                this.pool = { ...pool };
                try {
                    this.pool.config = JSON.parse(this.pool.config);
                }
                catch (error) {
                    this.logger.debug(`Failed to parse the pool config: ${(_a = this.pool) === null || _a === void 0 ? void 0 : _a.config}`);
                    this.pool.config = {};
                }
                // Validate runtime
                if (this.pool.runtime !== this.runtime.name) {
                    this.logger.error(`Specified pool does not match the integration runtime! Exiting ...`);
                    this.logger.error(`Found = ${this.runtime.name} required = ${this.pool.runtime}`);
                    process.exit(1);
                }
                // Validate version
                if (this.pool.protocol.version !== this.runtime.version) {
                    this.logger.error(`Running an invalid runtime version! Exiting ...`);
                    this.logger.error(`Found = ${this.runtime.version} required = ${this.pool.protocol.version}`);
                    process.exit(1);
                }
                break;
            }
            catch (error) {
                this.logger.debug(`Failed to fetch pool state. Retrying in ${requests * 10}s ...`);
                await (0, helpers_1.sleep)(requests * 10 * 1000);
                // limit timeout to 5 mins
                if (requests < 30) {
                    requests++;
                }
            }
        }
        this.logger.debug(`Successfully fetched pool state`);
        resolve();
    });
}
exports.getPool = getPool;
