import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { BigNumber } from "bignumber.js";
import { Contract, ContractTransaction, ethers, Wallet } from "ethers";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import Prando from "prando";
import { Observable } from "rxjs";
import { satisfies } from "semver";
import { ILogObject } from "tslog";
import {
  adjectives,
  starWars,
  uniqueNamesGenerator,
} from "unique-names-generator";
import {
  Bundle,
  ListenFunctionReturn,
  UploadFunction,
  UploadFunctionReturn,
  ValidateFunction,
  ValidateFunctionReturn,
} from "./faces";
import { fromBytes, toBytes } from "./utils/arweave";
import logger from "./utils/logger";
import Pool, { stake, toBN, toHumanReadable, unstakeAll } from "./utils/pool";
import { version } from "../package.json";

class KYVE {
  private pool: Contract;
  private runtime: string;
  private version: string;
  private stake: string;
  private wallet: Wallet;
  private keyfile?: JWKInterface;
  private name: string;
  private gasMultiplier: string;

  private buffer: Bundle = [];
  private _metadata: any;
  private _settings: any;

  private client = new Arweave({
    host: "arweave.net",
    protocol: "https",
  });

  constructor(
    poolAddress: string,
    runtime: string,
    version: string,
    stakeAmount: string,
    privateKey: string,
    keyfile?: JWKInterface,
    name?: string,
    endpoint?: string,
    gasMultiplier: string = "1"
  ) {
    this.wallet = new Wallet(
      privateKey,
      new ethers.providers.StaticJsonRpcProvider(
        endpoint || "https://moonbeam-alpha.api.onfinality.io/public",
        {
          chainId: 1287,
          name: "moonbase-alphanet",
        }
      )
    );

    this.pool = Pool(poolAddress, this.wallet);
    this.runtime = runtime;
    this.version = version;
    this.stake = stakeAmount;
    this.keyfile = keyfile;
    this.gasMultiplier = gasMultiplier;

    if (name) {
      this.name = name;
    } else {
      const r = new Prando(this.wallet.address + this.pool.address);

      this.name = uniqueNamesGenerator({
        dictionaries: [adjectives, starWars],
        separator: "-",
        length: 2,
        style: "lowerCase",
        seed: r.nextInt(0, adjectives.length * starWars.length),
      }).replace(" ", "-");
    }

    if (!existsSync("./logs")) {
      mkdirSync("./logs");
    }

    const logToTransport = (log: ILogObject) => {
      appendFileSync(`./logs/${this.name}.txt`, JSON.stringify(log) + "\n");
    };

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

  async run<ConfigType>(
    uploadFunction: UploadFunction<ConfigType>,
    validateFunction: ValidateFunction<ConfigType>
  ) {
    const format = (input: string) => {
      const length = Math.max(13, this.runtime.length);
      return input.padEnd(length, " ");
    };
    logger.info(
      `🚀 Starting node ...\n\t${format("Name")} = ${this.name}\n\t${format(
        "Address"
      )} = ${this.wallet.address}\n\t${format("Pool")} = ${
        this.pool.address
      }\n\t${format("Desired Stake")} = ${this.stake} $KYVE\n\n\t${format(
        "@kyve/core"
      )} = v${version}\n\t${format(this.runtime)} = v${this.version}`
    );

    await this.sync();
    const config = await this.fetchConfig();

    if (satisfies(this.version, this._metadata.versions || this.version)) {
      logger.info("⏱  Pool version requirements met.");
    } else {
      logger.error(
        `❌ Running an invalid version for the specified pool. Version requirements are ${this._metadata.versions}.`
      );
      await unstakeAll(this.pool, this.gasMultiplier);
      process.exit(1);
    }

    if (this._metadata.runtime === this.runtime) {
      logger.info(`💻 Running node on runtime ${this.runtime}.`);
    } else {
      logger.error("❌ Specified pool does not match the integration runtime.");
      process.exit(1);
    }

    await stake(this.stake, this.pool, this._settings, this.gasMultiplier);
    const _uploader = this._settings._uploader;

    if (this.wallet.address === _uploader) {
      if (this.keyfile) {
        if (await this.pool.paused()) {
          logger.warn("⚠️  Pool is paused. Exiting ...");
          process.exit();
        } else {
          logger.info("📚 Running as an uploader ...");
          this.uploader<ConfigType>(uploadFunction, config);
        }
      } else {
        logger.error("❌ You need to specify your Arweave keyfile.");
        process.exit(1);
      }
    } else {
      logger.info("🧐 Running as an validator ...");
      this.validator<ConfigType>(validateFunction, config);
    }
  }

  private async uploader<ConfigType>(
    uploadFunction: UploadFunction<ConfigType>,
    config: ConfigType
  ) {
    const uploaderLogger = logger.getChildLogger({
      name: "Uploader",
    });

    const node = new Observable<UploadFunctionReturn>((subscriber) => {
      uploadFunction(subscriber, config, uploaderLogger);
    });

    node.subscribe(async (item) => {
      // Push item to buffer.
      const i = this.buffer.push(item);
      uploaderLogger.debug(
        `Received a new data item (${i} / ${this._metadata.bundleSize}).`
      );

      // Check buffer length.
      if (this.buffer.length >= this._metadata.bundleSize) {
        uploaderLogger.info("📦 Creating bundle ...");

        // Clear the buffer.
        const tempBuffer = this.buffer;
        this.buffer = [];

        // Upload buffer to Arweave.
        uploaderLogger.debug("Uploading bundle to Arweave.");

        const transaction = await this.client.createTransaction({
          data: JSON.stringify(tempBuffer),
        });

        transaction.addTag("Application", "KYVE - Testnet");
        transaction.addTag("Pool", this.pool.address);
        transaction.addTag("@kyve/core", version);
        transaction.addTag(this.runtime, this.version);
        transaction.addTag("Bundle-Size", this._metadata.bundleSize);
        transaction.addTag("Content-Type", "application/json");

        await this.client.transactions.sign(transaction, this.keyfile);

        const balance = await this.client.wallets.getBalance(
          await this.client.wallets.getAddress(this.keyfile)
        );
        if (+transaction.reward > +balance) {
          uploaderLogger.error(
            "❌ You do not have enough funds in your Arweave wallet."
          );
          process.exit();
        }

        await this.client.transactions.post(transaction);

        uploaderLogger.info(
          `💾 Uploaded bundle to Arweave. Transaction = ${transaction.id}`
        );

        // Create a new vote.
        uploaderLogger.debug(`Attempting to register a bundle.`);

        try {
          // manual gas limit for resources exhausted error
          const registerTransaction = (await this.pool.register(
            toBytes(transaction.id),
            +transaction.data_size,
            {
              gasLimit: 10000000,
              gasPrice: (
                await this.pool.provider.getGasPrice()
              ).mul(new BigNumber(this.gasMultiplier).toNumber()),
            }
          )) as ContractTransaction;

          uploaderLogger.info(
            `⬆️  Creating a new proposal. Transaction = ${registerTransaction.hash}`
          );
        } catch (error) {
          uploaderLogger.error(
            "❌ Received an error while trying to register a bundle:",
            error
          );
          process.exit(1);
        }
      }
    });
  }

  private async listener(): Promise<Observable<ListenFunctionReturn>> {
    const listenerLogger = logger.getChildLogger({
      name: "Listener",
    });

    return new Observable<ListenFunctionReturn>((subscriber) => {
      this.pool.on(
        "ProposalStart",
        async (
          _transactionIndexed: string,
          _transaction: string,
          _bytes: number
        ) => {
          const transaction = fromBytes(_transaction);
          listenerLogger.info(
            `⬇️  Received a new proposal. Bundle = ${transaction}`
          );

          const res = await this.client.transactions.getStatus(transaction);
          if (res.status === 200 || res.status === 202) {
            const _data = (await this.client.transactions.getData(transaction, {
              decode: true,
            })) as Uint8Array;
            const bytes = _data.byteLength;
            const bundle = JSON.parse(
              new TextDecoder("utf-8", {
                fatal: true,
              }).decode(_data)
            ) as Bundle;

            if (+_bytes === +bytes) {
              listenerLogger.debug(
                "Bytes match, forwarding bundle to the validate function."
              );

              subscriber.next({
                transaction,
                bundle,
              });
            } else {
              listenerLogger.debug(
                `Bytes don't match (${_bytes} vs ${bytes}).`
              );

              this.vote({
                transaction,
                valid: false,
              });
            }
          } else {
            listenerLogger.error("❌ Error fetching bundle from Arweave.");
          }
        }
      );
    });
  }

  private async validator<ConfigType>(
    validateFunction: ValidateFunction<ConfigType>,
    config: ConfigType
  ) {
    const validatorLogger = logger.getChildLogger({
      name: "Validator",
    });

    const listener = await this.listener();

    const node = new Observable<ValidateFunctionReturn>((subscriber) => {
      validateFunction(listener, subscriber, config, validatorLogger);
    });

    node.subscribe((item) => this.vote(item));
  }

  private async vote(input: ValidateFunctionReturn) {
    const voteLogger = logger.getChildLogger({
      name: "Vote",
    });

    voteLogger.info(
      `🗳  Voting "${input.valid ? "valid" : "invalid"}" on bundle ${
        input.transaction
      }.`
    );

    try {
      await this.pool.vote(toBytes(input.transaction), input.valid, {
        gasLimit: await this.pool.estimateGas.vote(
          toBytes(input.transaction),
          input.valid
        ),
        gasPrice: (
          await this.pool.provider.getGasPrice()
        ).mul(new BigNumber(this.gasMultiplier).toNumber()),
      });
    } catch (error) {
      voteLogger.error("❌ Received an error while trying to vote:", error);
    }
  }

  private async sync() {
    await this.fetchMetadata();
    await this.fetchSettings();

    // Listen to new contract changes.
    this.pool.on("ConfigChanged", () => {
      logger.warn("⚠️  Config changed. Exiting ...");
      process.exit();
    });
    this.pool.on("MetadataChanged", async () => {
      await this.fetchMetadata();
    });
    this.pool.on(
      "MinimumStakeChanged",
      async (_, minimum: ethers.BigNumber) => {
        const stake = (await this.pool._stakingAmounts(
          this.wallet.address
        )) as ethers.BigNumber;

        if (stake.lt(minimum)) {
          logger.error(
            `❌ Minimum stake is ${toHumanReadable(
              toBN(minimum)
            )} $KYVE. You will not be able to register / vote.`
          );
          process.exit();
        }
      }
    );
    this.pool.on("Paused", () => {
      if (this.wallet.address === this._settings._uploader) {
        logger.warn("⚠️  Pool is now paused. Exiting ...");
        process.exit();
      }
    });
    this.pool.on("UploaderChanged", (previous: string) => {
      if (this.wallet.address === previous) {
        logger.warn("⚠️  Uploader changed. Exiting ...");
        process.exit();
      }
    });

    // Listen to new payouts.
    const payoutLogger = logger.getChildLogger({
      name: "Payout",
    });

    this.pool.on(
      this.pool.filters.Payout(this.wallet.address),
      (_, __, _amount: ethers.BigNumber, _transaction: string) => {
        const transaction = fromBytes(_transaction);

        payoutLogger.info(
          `💸 Received a reward of ${toHumanReadable(
            toBN(_amount)
          )} $KYVE. Bundle = ${transaction}`
        );
      }
    );

    // Listen to new points.
    const pointsLogger = logger.getChildLogger({
      name: "Points",
    });

    this.pool.on(
      this.pool.filters.IncreasePoints(this.wallet.address),
      (_, __, _points: ethers.BigNumber, _transaction: string) => {
        const transaction = fromBytes(_transaction);

        pointsLogger.warn(
          `⚠️  Received a new slashing point (${_points.toString()} / ${
            this._settings._slashThreshold
          }). Bundle = ${transaction}`
        );
      }
    );

    // Listen to new slashes.
    const slashLogger = logger.getChildLogger({
      name: "Slash",
    });

    this.pool.on(
      this.pool.filters.Slash(this.wallet.address),
      (_, __, _amount: ethers.BigNumber, _transaction: string) => {
        const transaction = fromBytes(_transaction);

        slashLogger.warn(
          `🚫 Node has been slashed. Lost ${toHumanReadable(
            toBN(_amount)
          )} $KYVE. Bundle = ${transaction}`
        );
        process.exit();
      }
    );
  }

  private async fetchConfig(): Promise<any> {
    const configLogger = logger.getChildLogger({
      name: "Config",
    });
    configLogger.debug("Attempting to fetch the config.");

    const _config = (await this.pool._config()) as string;

    try {
      const config = JSON.parse(_config);

      configLogger.debug("Successfully fetched the config.");
      return config;
    } catch (error) {
      configLogger.error(
        "❌ Received an error while trying to fetch the config:",
        error
      );
      process.exit(1);
    }
  }

  private async fetchMetadata() {
    const metadataLogger = logger.getChildLogger({
      name: "Metadata",
    });
    metadataLogger.debug("Attempting to fetch the metadata.");

    const _metadata = (await this.pool._metadata()) as string;

    try {
      const oldMetadata = this._metadata;
      this._metadata = JSON.parse(_metadata);

      if (
        oldMetadata &&
        this._metadata.versions &&
        oldMetadata.versions !== this._metadata.versions
      ) {
        logger.warn(
          "⚠️  Version requirements changed. Unstaking and exiting ..."
        );
        logger.info(
          `⏱  New version requirements are ${this._metadata.versions}.`
        );
        await unstakeAll(this.pool, this.gasMultiplier);
        process.exit();
      }

      metadataLogger.debug("Successfully fetched the metadata.");
    } catch (error) {
      metadataLogger.error(
        "❌ Received an error while trying to fetch the metadata:",
        error
      );
      process.exit(1);
    }
  }

  private async fetchSettings() {
    const settingsLogger = logger.getChildLogger({
      name: "Settings",
    });
    settingsLogger.debug("Attempting to fetch the settings.");

    this._settings = await this.pool._settings();

    settingsLogger.debug("Successfully fetched the settings.");
  }
}

export default KYVE;
