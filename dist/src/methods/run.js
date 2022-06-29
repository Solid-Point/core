"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const helpers_1 = require("../utils/helpers");
async function run() {
    while (true) {
        await this.syncPoolState();
        if (await this.shouldIdle()) {
            continue;
        }
        if (await this.claimUploaderRole()) {
            await this.syncPoolState();
        }
        if (this.pool.bundle_proposal.next_uploader === this.client.account.address) {
            this.logger.info(`Starting bundle proposal round ${this.pool.total_bundles} as Uploader`);
        }
        else {
            this.logger.info(`Starting bundle proposal round ${this.pool.total_bundles} as Validator`);
        }
        if (await this.canVote()) {
            // validateBundleProposal
        }
        await (0, helpers_1.sleep)(10 * 1000);
    }
}
exports.run = run;
