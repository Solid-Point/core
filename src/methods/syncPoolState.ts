import KyveCore from "../main";
import { sleep } from "../utils/helpers";

export async function syncPoolState(this: KyveCore): Promise<void> {
  this.logger.debug(`Attempting to fetch pool state`);

  return new Promise(async (resolve) => {
    let requests = 1;

    while (true) {
      try {
        const { pool } = await this.query.kyve.registry.v1beta1.pool({
          id: this.poolId.toString(),
        });

        this.pool = pool!;

        try {
          this.poolConfig = JSON.parse(this.pool.config);
        } catch (error) {
          this.logger.debug(
            `Failed to parse the pool config: ${this.pool.config}`
          );
          this.poolConfig = {};
        }

        break;
      } catch (error) {
        this.logger.debug(
          `Failed to fetch pool state. Retrying in ${requests * 10}s ...`
        );
        await sleep(requests * 10 * 1000);

        // limit timeout to 5 mins
        if (requests < 30) {
          requests++;
        }
      }
    }

    this.logger.debug(`Successfully fetched pool state\n`);

    resolve();
  });
}
