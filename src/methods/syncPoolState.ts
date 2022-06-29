import KyveCore from "../main";
import { retryer } from "../utils/helpers";

export async function syncPoolState(this: KyveCore): Promise<void> {
  const retryOptions = { limitTimeout: "5m", increaseBy: "10s" };
  this.logger.debug(`Attempting to fetch pool state`);
  await retryer(
    async () => {
      const { pool } = await this.query.kyve.registry.v1beta1.pool({
        id: this.poolId.toString(),
      });
      this.pool = { ...pool };

      try {
        this.pool.config = JSON.parse(this.pool.config);
      } catch (error) {
        this.logger.debug(
          `Failed to parse the pool config: ${this.pool?.config}`
        );
        this.pool.config = {};
      }

      // Validate runtime
      if (this.pool.runtime !== this.runtime.name) {
        this.logger.error(
          `Specified pool does not match the integration runtime! Exiting ...`
        );
        this.logger.error(
          `Found = ${this.runtime.name} required = ${this.pool.runtime}`
        );
        process.exit(1);
      }

      // Validate version
      if (this.pool.protocol.version !== this.runtime.version) {
        this.logger.error(`Running an invalid runtime version! Exiting ...`);
        this.logger.error(
          `Found = ${this.runtime.version} required = ${this.pool.protocol.version}`
        );
        process.exit(1);
      }
    },
    retryOptions,
    (_, ctx) => {
      this.logger.debug(
        `Failed to fetch pool state. Retrying in ${
          ctx.nextTimeoutInMs / 1000
        }s ...`
      );
    }
  );
  this.logger.debug(`Successfully fetched pool state`);
}
