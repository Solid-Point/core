import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import Prando from "prando";
import { satisfies } from "semver";
import { ILogObject } from "tslog";
import { Bundle } from "./faces";
import { CLI } from "./utils";
import { sleep } from "./utils/helpers";
import { logger } from "./utils";
import { version } from "../package.json";
import hash from "object-hash";
import http from "http";
import url from "url";
import client, { register } from "prom-client";
import { Database } from "./utils/database";
import { Client } from "./utils/client";
import du from "du";
import { gzipSync } from "zlib";
import axios from "axios";
import sizeof from "object-sizeof";
import {
  adjectives,
  colors,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";

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
  protected commission: string;
  protected client: Client;
  protected keyfile: JWKInterface;
  protected name: string;
  protected gasMultiplier: string;
  protected runMetrics: boolean;
  protected space: number;
  protected db: Database;
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
    this.commission = options.commission;
    this.client = new Client(options.mnemonic);
    this.keyfile = JSON.parse(readFileSync(options.keyfile, "utf-8"));
    this.gasMultiplier = options.gasMultiplier;
    this.runMetrics = options.metrics;
    this.space = +options.space;
    this.name = options?.name ?? this.generateRandomName(options.mnemonic);
    this.chainVersion = "v1beta1";

    this.db = new Database(this.name);

    if (!existsSync("./logs")) {
      mkdirSync("./logs");
    }

    const logToTransport = (log: ILogObject) => {
      appendFileSync(`./logs/${this.name}.txt`, JSON.stringify(log) + "\n");
    };

    logger.setSettings({
      minLevel: options.verbose ? undefined : "info",
    });

    logger.attachTransport({
      silly: logToTransport,
      debug: logToTransport,
      trace: logToTransport,
      info: logToTransport,
      warn: logToTransport,
      error: logToTransport,
      fatal: logToTransport,
    });
  }

  async start() {
    await this.logNodeInfo();
    this.setupMetrics();

    await this.getPool();
    await this.verifyNode();

    this.cache();
    this.logger();
    this.run();
  }

  private async run() {
    try {
      const address = await this.client.getAddress();

      while (true) {
        console.log("");
        logger.info("⚡️ Starting new proposal");

        // get current pool state
        await this.getPool(false);
        // save height of bundle proposal
        const created_at = this.pool.bundle_proposal.created_at;

        // TODO: maybe move to getPool()
        if (this.pool.paused) {
          logger.info("💤  Pool is paused. Waiting ...");
          await sleep(60 * 1000);
          continue;
        }

        await this.verifyNode(false);
        await this.clearFinalizedData();

        if (this.pool.bundle_proposal.next_uploader === address) {
          logger.info("📚 Selected as UPLOADER");
        } else {
          logger.info("🧐 Selected as VALIDATOR");
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
              `${this.client.endpoints.rest}/kyve/registry/${this.chainVersion}/can_vote/${this.poolId}/${address}?bundleId=${this.pool.bundle_proposal.bundle_id}`
            );

            canVote = data;
          } catch {}

          if (canVote.possible) {
            await this.validateProposal(created_at);
            await this.getPool(false);
          } else {
            logger.debug(`Can not vote this round: Reason: ${canVote.reason}`);
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
          logger.debug("Waiting for proposal quorum ...");
        }

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
                `${this.client.endpoints.rest}/kyve/registry/${this.chainVersion}/can_propose/${this.poolId}/${address}`
              );

              canPropose = data;
            } catch {}

            if (canPropose.possible) {
              // if upload fails try again & refetch bundle_proposal
              await this.uploadBundleToArweave();
              break;
            } else {
              logger.debug(
                `Can not propose: ${canPropose.reason}. Retrying in 10s ...`
              );
              await sleep(10 * 1000);
            }
          } else {
            await this.nextBundleProposal(created_at);
            break;
          }
        }

        logger.debug(`Proposal ended`);
      }
    } catch (error) {
      logger.error(`❌ INTERNAL ERROR: Runtime error. Exiting ...`);
      logger.debug(error);
      process.exit(1);
    }
  }

  public async logger() {
    setInterval(async () => {
      let height;

      try {
        height = parseInt(await this.db.get("head"));
      } catch {
        height = parseInt(this.pool.height_archived);
      }

      logger.debug(`Cached to height = ${height}`);
    }, 60 * 1000);
  }

  public async cache() {
    while (true) {
      let height: number = 0;

      try {
        try {
          height = parseInt(await this.db.get("head"));
        } catch {
          height = parseInt(this.pool.height_archived);
        }

        const usedDiskSpace = await du(`./db/${this.name}/`);
        const usedDiskSpacePercent = parseFloat(
          ((usedDiskSpace * 100) / this.space).toFixed(2)
        );

        metricsCacheHeight.set(height);
        metricsDbSize.set(usedDiskSpace);
        metricsDbUsed.set(usedDiskSpacePercent);

        if (usedDiskSpace > this.space) {
          logger.debug(`Used disk space: ${usedDiskSpacePercent}%`);
          await sleep(60 * 1000);
          continue;
        }

        const batch: Promise<void>[] = [];
        const batchSize: number = 100;
        const targetHeight: number = height + batchSize;

        for (let h = height; h < targetHeight; h++) {
          batch.push(this.getDataItemAndSave(h));
          await sleep(500);
        }

        await Promise.all(batch);
        await this.db.put("head", targetHeight);
      } catch (error) {
        logger.error(
          `❌ INTERNAL ERROR: Failed to request data item from local DB at height = ${height}`
        );
        logger.debug(error);
        await sleep(10 * 1000);
      }
    }
  }

  public async getDataItem(height: number): Promise<any> {
    logger.error(
      `❌ INTERNAL ERROR: "getDataItem" not implemented. Exiting ...`
    );
    process.exit(1);
  }

  public async getDataItemAndSave(height: number): Promise<void> {
    try {
      const dataItem = await this.getDataItem(height);
      await this.db.put(height, dataItem);
    } catch (error) {
      logger.error(
        `❌ EXTERNAL ERROR: Failed to request data item from source ...`
      );
      logger.debug(error);
    }
  }

  public async createBundle(): Promise<Bundle> {
    const bundleDataSizeLimit = 20 * 1000 * 1000; // 20 MB
    const bundleItemSizeLimit = 10000;
    const bundle: any[] = [];

    let currentDataSize = 0;
    let h = +this.pool.bundle_proposal.to_height;

    while (true) {
      try {
        const entry = {
          key: +h,
          value: await this.db.get(h),
        };
        currentDataSize += sizeof(entry);

        if (
          currentDataSize < bundleDataSizeLimit &&
          bundle.length < bundleItemSizeLimit
        ) {
          bundle.push(entry);
          h++;
        } else {
          break;
        }
      } catch {
        if (bundle.length < +this.pool.min_bundle_size) {
          await sleep(10 * 1000);
        } else {
          break;
        }
      }
    }

    return {
      fromHeight: this.pool.bundle_proposal.to_height,
      toHeight: h,
      bundle: Buffer.from(JSON.stringify(bundle)),
    };
  }

  public async loadBundle(): Promise<Buffer> {
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

    return Buffer.from(JSON.stringify(bundle));
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
      } catch (error) {
        logger.error(
          `❌ INTERNAL ERROR: Failed deleting data item from local DB with key ${key}:`
        );
        logger.debug(error);
      }
    }

    await this.db.put("tail", parseInt(this.pool.height_archived));
  }

  private async validateProposal(created_at: string) {
    logger.info(`🔬 Validating bundle ${this.pool.bundle_proposal.bundle_id}`);
    logger.debug(`Downloading bundle from Arweave ...`);

    let uploadBundle;
    let downloadBundle;

    // try to fetch bundle
    while (true) {
      await this.getPool(false);

      // check if new proposal is available in the meantime
      if (+this.pool.bundle_proposal.created_at > +created_at) {
        break;
      }

      downloadBundle = await this.downloadBundleFromArweave();

      if (downloadBundle) {
        logger.debug(`Successfully downloaded bundle from Arweave`);
        logger.debug(
          `Loading local bundle from ${this.pool.bundle_proposal.from_height} to ${this.pool.bundle_proposal.to_height} ...`
        );

        uploadBundle = gzipSync(await this.loadBundle());

        await this.vote({
          transaction: this.pool.bundle_proposal.bundle_id,
          valid: await this.validate(
            uploadBundle,
            +this.pool.bundle_proposal.byte_size,
            downloadBundle,
            +downloadBundle.byteLength
          ),
        });
        break;
      } else {
        logger.error(
          `❌ EXTERNAL ERROR: Failed to fetch bundle from Arweave. Retrying in 30s ...`
        );
        await sleep(30 * 1000);
      }
    }
  }

  public async validate(
    uploadBundle: Buffer,
    uploadBytes: number,
    downloadBundle: Buffer,
    downloadBytes: number
  ): Promise<boolean> {
    if (uploadBytes !== downloadBytes) {
      return false;
    }

    if (hash(uploadBundle) !== hash(downloadBundle)) {
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

  private async uploadBundleToArweave(): Promise<void> {
    try {
      logger.info("📦 Creating new bundle proposal");

      logger.debug(
        `Creating bundle from height = ${this.pool.bundle_proposal.to_height} ...`
      );

      const uploadBundle = await this.createBundle();

      logger.debug("Uploading bundle to Arweave ...");

      const transaction = await this.arweave.createTransaction({
        data: gzipSync(uploadBundle.bundle),
      });

      logger.debug(
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
          logger.error("❌ EXTERNAL ERROR: Not enough funds in Arweave wallet");
          process.exit(1);
        }
      } catch {
        logger.error(
          "❌ EXTERNAL ERROR: Failed to load Arweave account balance. Skipping upload ..."
        );
        return;
      }

      await this.arweave.transactions.post(transaction);

      const tx = await this.client.sendMessage({
        typeUrl: "/kyve.registry.v1beta1.MsgSubmitBundleProposal",
        value: {
          creator: await this.client.getAddress(),
          id: this.poolId,
          bundleId: transaction.id,
          byteSize: +transaction.data_size,
          bundleSize: uploadBundle.toHeight - uploadBundle.fromHeight,
        },
      });

      logger.debug(`Arweave Transaction ${transaction.id} ...`);
      logger.debug(`Transaction = ${tx.transactionHash}`);
    } catch (error) {
      logger.error(
        "❌ EXTERNAL ERROR: Failed to upload bundle to Arweave. Skipping upload ..."
      );
      logger.debug(error);
    }
  }

  private async claimUploaderRole() {
    try {
      logger.info("🔍 Claiming uploader role ...");

      const tx = await this.client.sendMessage({
        typeUrl: "/kyve.registry.v1beta1.MsgClaimUploaderRole",
        value: {
          creator: await this.client.getAddress(),
          id: this.poolId,
        },
      });

      logger.debug(`Transaction = ${tx.transactionHash}`);
    } catch (error) {
      logger.error(
        "❌ INTERNAL ERROR: Failed to claim uploader role. Skipping ..."
      );
      logger.debug(error);
    }
  }

  private async nextBundleProposal(created_at: string): Promise<void> {
    return new Promise(async (resolve) => {
      logger.debug("Waiting for new proposal ...");

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
    logger.info(
      `🖋  Voting ${vote.valid ? "valid" : "invalid"} on bundle ${
        vote.transaction
      } ...`
    );

    try {
      const tx = await this.client.sendMessage({
        typeUrl: "/kyve.registry.v1beta1.MsgVoteProposal",
        value: {
          creator: await this.client.getAddress(),
          id: this.poolId,
          bundleId: vote.transaction,
          support: vote.valid,
        },
      });

      logger.debug(`Transaction = ${tx.transactionHash}`);
    } catch (error) {
      logger.error("❌ INTERNAL ERROR: Failed to vote. Skipping ...");
      logger.debug(error);
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

    logger.info(
      `🚀 Starting node ...\n\n\t${formatInfoLogs("Node name")} = ${
        this.name
      }\n\t${formatInfoLogs(
        "Address"
      )} = ${await this.client.getAddress()}\n\t${formatInfoLogs(
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
      logger.info(
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
      logger.debug("Attempting to fetch pool state.");
    }

    return new Promise(async (resolve) => {
      while (true) {
        try {
          const {
            data: { pool },
          } = await axios.get(
            `${this.client.endpoints.rest}/kyve/registry/${this.chainVersion}/pool/${this.poolId}`
          );
          this.pool = { ...pool };

          try {
            this.pool.config = JSON.parse(this.pool.config);
          } catch (error) {
            logger.error(
              `❌ INTERNAL ERROR: Failed to parse the pool config: ${this.pool?.config}`
            );
            logger.debug(error);
            process.exit(1);
          }

          if (this.pool.runtime === this.runtime) {
            if (logs) {
              logger.info(`💻 Running node on runtime ${this.runtime}.`);
            }
          } else {
            logger.error(
              "❌ INTERNAL ERROR: Specified pool does not match the integration runtime"
            );
            process.exit(1);
          }

          try {
            if (satisfies(this.version, this.pool.versions || this.version)) {
              if (logs) {
                logger.info("⏱  Pool version requirements met");
              }
            } else {
              logger.error(
                `❌ INTERNAL ERROR: Running an invalid version for the specified pool. Version requirements are ${this.pool.versions}`
              );
              process.exit(1);
            }
          } catch (error) {
            logger.error(
              `❌ INTERNAL ERROR: Failed to parse the node version: ${this.pool?.versions}`
            );
            logger.debug(error);
            process.exit(1);
          }

          break;
        } catch (error) {
          logger.error(
            "❌ INTERNAL ERROR: Failed to fetch pool state. Retrying in 10s ..."
          );
          await sleep(10 * 1000);
        }
      }

      if (logs) {
        logger.info("✅ Fetched pool state");
      }

      resolve();
    });
  }

  private async verifyNode(logs: boolean = true): Promise<void> {
    if (logs) {
      logger.debug("Attempting to verify node.");
    }

    return new Promise(async (resolve) => {
      while (true) {
        try {
          const address = await this.client.getAddress();
          const isStaker = this.pool.stakers.includes(address);

          if (isStaker) {
            if (logs) {
              logger.info("🔍  Node is running as a validator.");
            }

            break;
          } else {
            logger.info(`⚠️  Node is no active validator!`);
            logger.info(
              `⚠️  Stake KYVE here to join as a validator: https://app.kyve.network/pools/${this.poolId}/validators - Idling ...`
            );
            await sleep(60 * 1000);
            await this.getPool(false);
          }
        } catch (error) {
          logger.error("❌ INTERNAL ERROR: Failed to fetch validator info");
          await sleep(10 * 1000);
        }
      }

      if (logs) {
        logger.info("✅ Validated node");
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
