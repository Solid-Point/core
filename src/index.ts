import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import Prando from "prando";
import { satisfies } from "semver";
import { ILogObject, Logger } from "tslog";
import { Bundle } from "./faces";
import { CLI } from "./utils";
import { sleep } from "./utils/helpers";
import { version } from "../package.json";
import hash from "object-hash";
import http from "http";
import url from "url";
import client, { register } from "prom-client";
import { Database } from "./utils/database";
import du from "du";
import { gzipSync, gunzipSync } from "zlib";
import axios from "axios";
import sizeof from "object-sizeof";
import {
  adjectives,
  colors,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { KyveSDK, KyveWallet } from "@kyve/sdk-test";
import Transaction from "arweave/node/lib/transaction";

export * from "./utils";
export * from "./faces";
export * from "./utils/helpers";
export * from "./utils/database";

client.collectDefaultMetrics({
  labels: { app: "kyve-core" },
});

const metricsCacheHeight = new client.Gauge({
  name: "current_cache_height",
  help: "The current height the cache has indexed to.",
});

const metricsDbSize = new client.Gauge({
  name: "current_db_size",
  help: "The size of the local database.",
});

const metricsDbUsed = new client.Gauge({
  name: "current_db_used",
  help: "The database usage in percent.",
});

class KYVE {
  protected poolId: number;
  protected pool: any;
  protected runtime: string;
  protected version: string;
  protected chainVersion: string;
  protected wallet: KyveWallet;
  protected sdk: KyveSDK;
  protected keyfile: JWKInterface;
  protected name: string;
  protected network: string;
  protected batchSize: number;
  protected runMetrics: boolean;
  protected space: number;
  protected db: Database;
  protected logger: Logger;
  protected arweave = new Arweave({
    host: "arweave.net",
    protocol: "https",
  });

  public static metrics = client;

  constructor(cli?: CLI) {
    if (!cli) {
      cli = new CLI(process.env.KYVE_RUNTIME!, process.env.KYVE_VERSION!);
    }

    cli.parse();
    const options = cli.opts();

    this.poolId = options.poolId;
    this.runtime = cli.runtime;
    this.version = cli.packageVersion;
    this.keyfile = JSON.parse(readFileSync(options.keyfile, "utf-8"));
    this.runMetrics = options.metrics;
    this.name = options?.name ?? this.generateRandomName(options.mnemonic);
    this.chainVersion = "v1beta1";

    this.wallet = new KyveWallet(options.network, options.mnemonic);
    this.sdk = new KyveSDK(this.wallet);
    this.db = new Database(this.name);

    if (!existsSync("./logs")) {
      mkdirSync("./logs");
    }

    const logToTransport = (log: ILogObject) => {
      appendFileSync(`./logs/${this.name}.txt`, JSON.stringify(log) + "\n");
    };

    this.logger = new Logger({
      displayFilePath: "hidden",
      displayFunctionName: false,
    });

    this.logger.setSettings({
      minLevel: options.verbose ? undefined : "info",
    });

    this.logger.attachTransport({
      silly: logToTransport,
      debug: logToTransport,
      trace: logToTransport,
      info: logToTransport,
      warn: logToTransport,
      error: logToTransport,
      fatal: logToTransport,
    });

    // check if disk space is greater than 0
    if (+options.batchSize > 0) {
      this.space = +options.space;
    } else {
      this.logger.error(
        `❌ INTERNAL ERROR: Disk space has to be greater than 0 bytes. Exiting ...`
      );
      process.exit(1);
    }

    // check if batch size is greater than 0
    if (+options.batchSize > 0) {
      this.batchSize = +options.batchSize;
    } else {
      this.logger.error(
        `❌ INTERNAL ERROR: Batch size has to be greater than 0. Exiting ...`
      );
      process.exit(1);
    }

    // check if network is valid
    if (options.network === "alpha" || options.network === "beta") {
      this.network = options.network;
    } else {
      this.logger.error(
        `❌ INTERNAL ERROR: Unknown network "${options.network}". Exiting ...`
      );
      process.exit(1);
    }
  }

  async start() {
    await this.logNodeInfo();
    this.setupMetrics();

    await this.getPool();
    await this.verifyNode();

    this.cache();
    this.logCacheHeight();
    this.run();
  }

  private async run() {
    try {
      const address = await this.wallet.getAddress();

      while (true) {
        console.log("");
        this.logger.info("⚡️ Starting new proposal");

        // get current pool state
        await this.getPool(false);
        // save height of bundle proposal
        const created_at = this.pool.bundle_proposal.created_at;

        // check if pool is paused
        if (this.pool.paused) {
          this.logger.info("💤  Pool is paused. Idling ...");
          await sleep(60 * 1000);
          continue;
        }

        // check if node is the only one
        if (this.pool.stakers?.length < 2) {
          this.logger.warn(
            "⚠️  Your node is the only one in this pool. Waiting for at least one other node to join ..."
          );
          await sleep(60 * 1000);
          continue;
        }

        await this.verifyNode(false);
        await this.clearFinalizedData();

        if (this.pool.bundle_proposal.next_uploader === address) {
          this.logger.info("📚 Selected as UPLOADER");
        } else {
          this.logger.info("🧐 Selected as VALIDATOR");
        }

        if (
          this.pool.bundle_proposal.uploader &&
          this.pool.bundle_proposal.uploader !== address
        ) {
          let canVote = {
            possible: false,
            reason: "Failed to execute canVote query",
          };

          try {
            const { data } = await axios.get(
              `${this.wallet.getRestEndpoint()}/kyve/registry/${
                this.chainVersion
              }/can_vote/${this.poolId}/${address}?bundleId=${
                this.pool.bundle_proposal.bundle_id
              }`
            );

            canVote = data;
          } catch {}

          if (canVote.possible) {
            await this.validateProposal(created_at);
            await this.getPool(false);
          } else {
            this.logger.debug(
              `Can not vote this round: Reason: ${canVote.reason}`
            );
          }
        }

        // check if new proposal is available in the meantime
        if (+this.pool.bundle_proposal.created_at > +created_at) {
          continue;
        }

        if (!this.pool.bundle_proposal.next_uploader) {
          await this.claimUploaderRole();
          await this.getPool(false);
        }

        if (this.pool.bundle_proposal.next_uploader === address) {
          this.logger.debug("Waiting for proposal quorum ...");
        }

        let transaction: Transaction | null = null;

        while (true) {
          await this.getPool(false);

          // check if new proposal is available in the meantime
          if (+this.pool.bundle_proposal.created_at > +created_at) {
            break;
          }

          if (this.pool.bundle_proposal.next_uploader === address) {
            let canPropose = {
              possible: false,
              reason: "Failed to execute canPropose query",
            };

            try {
              const { data } = await axios.get(
                `${this.wallet.getRestEndpoint()}/kyve/registry/${
                  this.chainVersion
                }/can_propose/${this.poolId}/${address}`
              );

              canPropose = data;
            } catch {}

            if (canPropose.possible) {
              this.logger.info("📦 Creating new bundle proposal");

              // create bundle for upload
              const uploadBundle = await this.createBundle();
              // upload bundle to arweave if not yet done
              if (!transaction) {
                transaction = await this.uploadBundleToArweave(uploadBundle);
              }
              // submit bundle proposal
              if (transaction) {
                await this.submitBundleProposal(transaction, uploadBundle);
                break;
              }
            } else {
              this.logger.debug(
                `Can not propose: ${canPropose.reason}. Retrying in 10s ...`
              );
              await sleep(10 * 1000);
            }
          } else {
            await this.nextBundleProposal(created_at);
            break;
          }
        }

        this.logger.debug(`Proposal ended`);
      }
    } catch (error) {
      this.logger.error(`❌ INTERNAL ERROR: Runtime error. Exiting ...`);
      this.logger.debug(error);
      process.exit(1);
    }
  }

  private async logCacheHeight() {
    setInterval(async () => {
      let height: number = 0;
      let head: number = 0;
      let tail: number = 0;

      try {
        height = parseInt(this.pool.height_archived);
        head = parseInt(await this.db.get("head"));
        tail = parseInt(await this.db.get("tail"));

        // reset cache and continue with pool height
        if (height < tail) {
          this.logger.debug(`Resetting cache ...`);
          await this.db.drop();
        }

        // continue from current cache height
        if (height < head) {
          height = head;
        }
      } catch {}

      this.logger.debug(`Cached to height = ${height}`);
    }, 60 * 1000);
  }

  private async cache() {
    while (true) {
      let height: number = 0;
      let head: number = 0;
      let tail: number = 0;

      try {
        height = parseInt(this.pool.height_archived);
        head = parseInt(await this.db.get("head"));
        tail = parseInt(await this.db.get("tail"));

        // reset cache and continue with pool height
        if (height < tail) {
          this.logger.debug(`Resetting cache ...`);
          await this.db.drop();
        }

        // continue from current cache height
        if (height < head) {
          height = head;
        }
      } catch {}

      const targetHeight: number = height + this.batchSize;

      try {
        const usedDiskSpace = await du(`./db/${this.name}/`);
        const usedDiskSpacePercent = parseFloat(
          ((usedDiskSpace * 100) / this.space).toFixed(2)
        );

        metricsCacheHeight.set(height);
        metricsDbSize.set(usedDiskSpace);
        metricsDbUsed.set(usedDiskSpacePercent);

        if (usedDiskSpace > this.space) {
          this.logger.debug(`Used disk space: ${usedDiskSpacePercent}%`);
          await sleep(60 * 1000);
          continue;
        }

        const batch: Promise<void>[] = [];

        for (let h = height; h < targetHeight; h++) {
          batch.push(this.getDataItemAndSave(h));
          await sleep(10);
        }

        await Promise.all(batch);
        await this.db.put("head", targetHeight);
      } catch (error) {
        this.logger.error(
          `❌ INTERNAL ERROR: Failed to write data items from height = ${height} to ${targetHeight} to local DB`
        );
        this.logger.debug(error);
        await sleep(10 * 1000);
      }
    }
  }

  public async getDataItem(key: number): Promise<{ key: number; value: any }> {
    this.logger.error(
      `❌ INTERNAL ERROR: mandatory "getDataItem" method not implemented. Exiting ...`
    );
    process.exit(1);
  }

  private async getDataItemAndSave(height: number): Promise<void> {
    while (true) {
      try {
        const { key, value } = await this.getDataItem(height);
        await this.db.put(key, value);
        break;
      } catch {
        await sleep(1000);
      }
    }
  }

  private async createBundle(): Promise<Bundle> {
    const bundleDataSizeLimit = 20 * 1000 * 1000; // 20 MB
    const bundleItemSizeLimit = 10000;
    const bundle: any[] = [];

    let currentDataSize = 0;
    let h = +this.pool.bundle_proposal.to_height;

    this.logger.debug(
      `Creating bundle from height = ${this.pool.bundle_proposal.to_height} ...`
    );

    while (true) {
      try {
        const entry = {
          key: +h,
          value: await this.db.get(h),
        };

        currentDataSize += sizeof(entry);

        // break if min_bundle_size is reached and is over data size limit
        if (
          bundle.length >= +this.pool.min_bundle_size &&
          currentDataSize > bundleDataSizeLimit
        ) {
          break;
        }

        // break if bundle item size limit is reached
        if (bundle.length >= bundleItemSizeLimit + this.pool.min_bundle_size) {
          break;
        }

        bundle.push(entry);
        h++;
      } catch {
        if (bundle.length < +this.pool.min_bundle_size) {
          await sleep(10 * 1000);
        } else {
          break;
        }
      }
    }

    return {
      fromHeight: +this.pool.bundle_proposal.to_height,
      toHeight: +this.pool.bundle_proposal.to_height + bundle.length,
      bundle: Buffer.from(JSON.stringify(bundle)),
    };
  }

  private async loadBundle(): Promise<any[]> {
    const bundle: any[] = [];
    let h: number = +this.pool.bundle_proposal.from_height;

    while (h < +this.pool.bundle_proposal.to_height) {
      try {
        const entry = {
          key: +h,
          value: await this.db.get(h),
        };

        bundle.push(entry);
        h++;
      } catch {
        await sleep(10 * 1000);
      }
    }

    return bundle;
  }

  private async clearFinalizedData() {
    let tail: number;

    try {
      tail = parseInt(await this.db.get("tail"));
    } catch {
      tail = parseInt(this.pool.height_archived);
    }

    for (let key = tail; key < parseInt(this.pool.height_archived); key++) {
      try {
        await this.db.del(key);
      } catch {}
    }

    await this.db.put("tail", parseInt(this.pool.height_archived));
  }

  private async validateProposal(created_at: string) {
    this.logger.info(
      `🔬 Validating bundle ${this.pool.bundle_proposal.bundle_id}`
    );
    this.logger.debug(`Downloading bundle from Arweave ...`);

    // try to fetch bundle
    while (true) {
      await this.getPool(false);

      // check if new proposal is available in the meantime
      if (+this.pool.bundle_proposal.created_at > +created_at) {
        break;
      }

      const arweaveBundle = await this.downloadBundleFromArweave();

      if (arweaveBundle) {
        this.logger.debug(`Successfully downloaded bundle from Arweave`);
        this.logger.debug(
          `Loading local bundle from ${this.pool.bundle_proposal.from_height} to ${this.pool.bundle_proposal.to_height} ...`
        );

        const localBundle = await this.loadBundle();

        try {
          const uploadBundle = JSON.parse(gunzipSync(arweaveBundle).toString());

          await this.vote({
            transaction: this.pool.bundle_proposal.bundle_id,
            valid: await this.validate(
              localBundle,
              +this.pool.bundle_proposal.byte_size,
              uploadBundle,
              +arweaveBundle.byteLength
            ),
          });
        } catch {
          this.logger.warn(`⚠️  Could not gunzip bundle ...`);
          await this.vote({
            transaction: this.pool.bundle_proposal.bundle_id,
            valid: false,
          });
        } finally {
          break;
        }
      } else {
        this.logger.warn(
          `⚠️  EXTERNAL ERROR: Failed to fetch bundle from Arweave. Retrying in 30s ...`
        );
        await sleep(30 * 1000);
      }
    }
  }

  public async validate(
    localBundle: any[],
    localBytes: number,
    uploadBundle: any[],
    uploadBytes: number
  ): Promise<boolean> {
    if (localBytes !== uploadBytes) {
      return false;
    }

    if (hash(localBundle) !== hash(uploadBundle)) {
      return false;
    }

    return true;
  }

  private async downloadBundleFromArweave(): Promise<any> {
    try {
      const { status } = await this.arweave.transactions.getStatus(
        this.pool.bundle_proposal.bundle_id
      );

      if (status === 200 || status === 202) {
        const { data: downloadBundle } = await axios.get(
          `https://arweave.net/${this.pool.bundle_proposal.bundle_id}`,
          { responseType: "arraybuffer" }
        );

        return downloadBundle;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async uploadBundleToArweave(
    uploadBundle: Bundle
  ): Promise<Transaction | null> {
    try {
      this.logger.debug("Uploading bundle to Arweave ...");

      const transaction = await this.arweave.createTransaction({
        data: gzipSync(uploadBundle.bundle),
      });

      this.logger.debug(
        `Bundle details = bytes: ${transaction.data_size}, items: ${
          uploadBundle.toHeight - uploadBundle.fromHeight
        }`
      );

      transaction.addTag("Application", "KYVE - Testnet");
      transaction.addTag("Pool", this.poolId.toString());
      transaction.addTag("@kyve/core", version);
      transaction.addTag(this.runtime, this.version);
      transaction.addTag("Uploader", this.pool.bundle_proposal.next_uploader);
      transaction.addTag("FromHeight", uploadBundle.fromHeight.toString());
      transaction.addTag("ToHeight", uploadBundle.toHeight.toString());
      transaction.addTag("Content-Type", "application/gzip");

      await this.arweave.transactions.sign(transaction, this.keyfile);

      try {
        const balance = await this.arweave.wallets.getBalance(
          await this.arweave.wallets.getAddress(this.keyfile)
        );

        if (+transaction.reward > +balance) {
          this.logger.warn(
            "⚠️  EXTERNAL ERROR: Not enough funds in Arweave wallet"
          );
          process.exit(1);
        }
      } catch {
        this.logger.warn(
          "⚠️  EXTERNAL ERROR: Failed to load Arweave account balance. Skipping upload ..."
        );
        return null;
      }

      await this.arweave.transactions.post(transaction);

      this.logger.debug(`Uploaded bundle with tx id: ${transaction.id}`);

      return transaction;
    } catch {
      this.logger.warn(
        "⚠️  EXTERNAL ERROR: Failed to upload bundle to Arweave. Retrying in 30s ..."
      );
      await sleep(30 * 1000);
      return null;
    }
  }

  private async submitBundleProposal(
    transaction: Transaction,
    uploadBundle: Bundle
  ) {
    try {
      this.logger.debug(`Submitting bundle proposal ...`);

      const { transactionHash, transactionBroadcast } =
        await this.sdk.submitBundleProposal(
          this.poolId,
          transaction.id,
          +transaction.data_size,
          uploadBundle.toHeight - uploadBundle.fromHeight
        );

      this.logger.debug(`Transaction = ${transactionHash}`);

      const res = await transactionBroadcast;

      if (res.code === 0) {
        this.logger.info(
          `📤 Successfully submitted bundle proposal ${transaction.id}`
        );
      } else {
        this.logger.warn(`⚠️  Could not submit bundle proposal. Skipping ...`);
      }
    } catch {
      this.logger.error(
        "❌ INTERNAL ERROR: Failed to submit bundle proposal. Retrying in 30s ..."
      );
      await sleep(30 * 1000);
    }
  }

  private async claimUploaderRole() {
    try {
      this.logger.debug("Claiming uploader role ...");

      const { transactionHash, transactionBroadcast } =
        await this.sdk.claimUploaderRole(this.poolId);

      this.logger.debug(`Transaction = ${transactionHash}`);

      const res = await transactionBroadcast;

      if (res.code === 0) {
        this.logger.info(`🔍 Successfully claimed uploader role`);
      } else {
        this.logger.warn(`⚠️  Could not claim uploader role. Skipping ...`);
      }
    } catch (error) {
      this.logger.error(
        "❌ INTERNAL ERROR: Failed to claim uploader role. Skipping ..."
      );
      this.logger.debug(error);
    }
  }

  private async nextBundleProposal(created_at: string): Promise<void> {
    return new Promise(async (resolve) => {
      this.logger.debug("Waiting for new proposal ...");

      while (true) {
        await this.getPool(false);

        if (+this.pool.bundle_proposal.created_at > +created_at) {
          break;
        } else {
          await sleep(2 * 1000); // sleep 2 secs
        }
      }

      resolve();
    });
  }

  private async vote(vote: { transaction: string; valid: boolean }) {
    try {
      this.logger.debug(
        `Voting ${vote.valid ? "valid" : "invalid"} on bundle ${
          vote.transaction
        } ...`
      );

      const { transactionHash, transactionBroadcast } =
        await this.sdk.voteProposal(this.poolId, vote.transaction, vote.valid);

      this.logger.debug(`Transaction = ${transactionHash}`);

      const res = await transactionBroadcast;

      if (res.code === 0) {
        this.logger.info(
          `🖋  Voted ${vote.valid ? "valid" : "invalid"} on bundle ${
            vote.transaction
          }`
        );
      } else {
        this.logger.warn(`⚠️  Could not vote on proposal. Skipping ...`);
      }
    } catch (error) {
      this.logger.error("❌ INTERNAL ERROR: Failed to vote. Skipping ...");
      this.logger.debug(error);
    }
  }

  private async logNodeInfo() {
    const formatInfoLogs = (input: string) => {
      const length = Math.max(13, this.runtime.length);
      return input.padEnd(length, " ");
    };

    let height: number;

    try {
      height = parseInt(await this.db.get("head"));
    } catch {
      height = 0;
    }

    this.logger.info(
      `🚀 Starting node ...\n\n\t${formatInfoLogs("Node name")} = ${
        this.name
      }\n\t${formatInfoLogs(
        "Address"
      )} = ${await this.wallet.getAddress()}\n\t${formatInfoLogs(
        "Pool Id"
      )} = ${this.poolId}\n\t${formatInfoLogs(
        "Cache height"
      )} = ${height}\n\t${formatInfoLogs(
        "@kyve/core"
      )} = v${version}\n\t${formatInfoLogs(this.runtime)} = v${this.version}\n`
    );
  }

  private setupMetrics() {
    if (this.runMetrics) {
      this.logger.info(
        "🔬 Starting metric server on: http://localhost:8080/metrics"
      );

      // HTTP server which exposes the metrics on http://localhost:8080/metrics
      http
        .createServer(async (req: any, res: any) => {
          // Retrieve route from request object
          const route = url.parse(req.url).pathname;

          if (route === "/metrics") {
            // Return all metrics the Prometheus exposition format
            res.setHeader("Content-Type", register.contentType);
            const defaultMetrics = await register.metrics();
            const other = await KYVE.metrics.register.metrics();
            res.end(defaultMetrics + "\n" + other);
          }
        })
        .listen(8080);
    }
  }

  private async getPool(logs: boolean = true): Promise<void> {
    if (logs) {
      this.logger.debug("Attempting to fetch pool state.");
    }

    return new Promise(async (resolve) => {
      while (true) {
        try {
          const {
            data: { pool },
          } = await axios.get(
            `${this.wallet.getRestEndpoint()}/kyve/registry/${
              this.chainVersion
            }/pool/${this.poolId}`
          );
          this.pool = { ...pool };

          try {
            this.pool.config = JSON.parse(this.pool.config);
          } catch (error) {
            this.logger.error(
              `❌ INTERNAL ERROR: Failed to parse the pool config: ${this.pool?.config}`
            );
            this.logger.debug(error);
            process.exit(1);
          }

          if (this.pool.runtime === this.runtime) {
            if (logs) {
              this.logger.info(`💻 Running node on runtime ${this.runtime}.`);
            }
          } else {
            this.logger.error(
              "❌ INTERNAL ERROR: Specified pool does not match the integration runtime"
            );
            process.exit(1);
          }

          try {
            if (satisfies(this.version, this.pool.versions || this.version)) {
              if (logs) {
                this.logger.info("⏱  Pool version requirements met");
              }
            } else {
              this.logger.error(
                `❌ INTERNAL ERROR: Running an invalid version for the specified pool. Version requirements are ${this.pool.versions}`
              );
              process.exit(1);
            }
          } catch (error) {
            this.logger.error(
              `❌ INTERNAL ERROR: Failed to parse the node version: ${this.pool?.versions}`
            );
            this.logger.debug(error);
            process.exit(1);
          }

          break;
        } catch (error) {
          this.logger.warn(
            "⚠️  EXTERNAL ERROR: Failed to fetch pool state. Retrying in 10s ..."
          );
          await sleep(10 * 1000);
        }
      }

      if (logs) {
        this.logger.info("✅ Fetched pool state");
      }

      resolve();
    });
  }

  private async verifyNode(logs: boolean = true): Promise<void> {
    if (logs) {
      this.logger.debug("Attempting to verify node.");
    }

    return new Promise(async (resolve) => {
      while (true) {
        try {
          const address = await this.wallet.getAddress();
          const isStaker = this.pool.stakers.includes(address);

          if (isStaker) {
            if (logs) {
              this.logger.info("🔍  Node is running as a validator.");
            }

            break;
          } else {
            this.logger.warn(`⚠️  Node is not an active validator!`);
            this.logger.warn(
              `⚠️  Stake $KYVE here to join as a validator: https://app.${this.network}.kyve.network/#/pools/${this.poolId}/validators - Idling ...`
            );
            await sleep(60 * 1000);
            await this.getPool(false);
          }
        } catch (error) {
          this.logger.error(
            "❌ INTERNAL ERROR: Failed to fetch validator info"
          );
          await sleep(10 * 1000);
        }
      }

      resolve();
    });
  }

  private generateRandomName(mnemonic: string) {
    const r = new Prando(mnemonic + this.poolId);

    return uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: "-",
      length: 3,
      style: "lowerCase",
      seed: r.nextInt(0, adjectives.length * colors.length * animals.length),
    }).replace(" ", "-");
  }
}

export default KYVE;
