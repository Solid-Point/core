import KyveCore from "../main";
import { sleep } from "../utils/helpers";

export async function run(this: KyveCore): Promise<void> {
  while (true) {
    this.logger.info(
      `Starting bundle proposal round ${this.pool.total_bundles}`
    );

    await sleep(10 * 1000);
  }
}
