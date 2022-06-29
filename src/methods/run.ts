import KyveCore from "../main";
import { sleep } from "../utils/helpers";

export async function run(this: KyveCore): Promise<void> {
  while (true) {
    await this.syncPoolState();

    if (await this.shouldIdle()) {
      continue;
    }

    if (await this.claimUploaderRole()) {
      await this.syncPoolState();
    }

    if (
      this.pool.bundle_proposal!.next_uploader === this.client.account.address
    ) {
      this.logger.info(
        `Starting bundle proposal round ${this.pool.total_bundles} as Uploader`
      );
    } else {
      this.logger.info(
        `Starting bundle proposal round ${this.pool.total_bundles} as Validator`
      );
    }

    if (await this.canVote()) {
      // validateBundleProposal
    }

    await sleep(10 * 1000);
  }
}
