import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import {
  BigNumber,
  Contract,
  ContractTransaction,
  ethers,
  Wallet,
} from "ethers";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import Prando from "prando";
import { Observable } from "rxjs";
import { ILogObject, Logger } from "tslog";
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
import Pool, { decimals, stake } from "./utils/pool";
import sleep from "./utils/sleep";
import { version } from "../package.json";

class KYVE {
  private pool: Contract;
  private runtime: string;
  private stake: number;
  private wallet: Wallet;
  private keyfile?: JWKInterface;
  private name: string;

  private buffer: Bundle = [];
  private votes: {
    transaction: string;
    valid: boolean;
  }[] = [];
  private _metadata: any;
  private _settings: any;

  private client = new Arweave({
    host: "arweave.net",
    protocol: "https",
  });

  constructor(
    poolAddress: string,
    runtime: string,
    stakeAmount: number,
    privateKey: string,
    keyfile?: JWKInterface,
    name?: string
  ) {
    this.wallet = new Wallet(
      privateKey,
      new ethers.providers.StaticJsonRpcProvider(
        "https://moonbeam-alpha.api.onfinality.io/public",
        {
          chainId: 1287,
          name: "moonbase-alphanet",
        }
      )
    );

    this.pool = Pool(poolAddress, this.wallet);
    this.runtime = runtime;
    this.stake = stakeAmount;
    this.keyfile = keyfile;

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
    logger.info(
      `🚀 Starting node ...\n\tName          = ${this.name}\n\tAddress       = ${this.wallet.address}\n\tPool          = ${this.pool.address}\n\tDesired Stake = ${this.stake} $KYVE\n\tVersion       = v${version}`
    );

    await this.sync();
    const config = await this.fetchConfig();

    if (this._metadata.runtime === this.runtime) {
      logger.info(`💻 Running node on runtime ${this.runtime}.`);
    } else {
      logger.error("❌ Specified pool does not match the integration runtime.");
      process.exit(1);
    }

    await stake(this.stake, this.pool, this._settings);
    const _uploader = this._settings._uploader;

    if (this.wallet.address === _uploader) {
      if (this.keyfile) {
        if (await this.pool.paused()) {
          logger.warn("⚠️  Pool is paused. Exiting ...");
          process.exit();
        } else {
          this.uploader<ConfigType>(uploadFunction, config);
        }
      } else {
        logger.error("❌ You need to specify your Arweave keyfile.");
        process.exit(1);
      }
    } else {
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
        transaction.addTag("Version", version);
        transaction.addTag("Pool", this.pool.address);
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

              this.votes.push({
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

    this.vote(validatorLogger);
    const listener = await this.listener();

    const node = new Observable<ValidateFunctionReturn>((subscriber) => {
      validateFunction(listener, subscriber, config, validatorLogger);
    });

    node.subscribe((item) => this.votes.push(item));
  }

  private async vote(logger: Logger) {
    while (true) {
      if (this.votes.length) {
        const vote = this.votes.shift()!;

        logger.info(
          `🗳  Voting "${vote.valid ? "valid" : "invalid"}" on bundle ${
            vote.transaction
          }.`
        );

        try {
          await this.pool.vote(toBytes(vote.transaction), vote.valid, {
            gasLimit: await this.pool.estimateGas.vote(
              toBytes(vote.transaction),
              vote.valid
            ),
          });
        } catch (error) {
          // TODO: Add back when new contracts are deployed.
          // logger.error("❌ Received an error while trying to vote:", error);
          // process.exit(1);
        }
      } else {
        await sleep(10 * 1000);
      }
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
    this.pool.on("UploaderChanged", (previous: string) => {
      if (this.wallet.address === previous) {
        logger.warn("⚠️  Uploader changed. Exiting ...");
        process.exit();
      }
    });
    this.pool.on("Paused", () => {
      if (this.wallet.address === this._settings._uploader) {
        logger.warn("⚠️  Pool is now paused. Exiting ...");
        process.exit();
      }
    });

    // Listen to new payouts.
    const payoutLogger = logger.getChildLogger({
      name: "Payout",
    });

    this.pool.on(
      this.pool.filters.Payout(this.wallet.address),
      (_, __, _amount: BigNumber, _transaction: string) => {
        const amount = _amount.mul(1000000).div(decimals).toNumber() / 1000000;
        const transaction = fromBytes(_transaction);

        payoutLogger.info(
          `💸 Received a reward of ${amount} $KYVE. Bundle = ${transaction}`
        );
      }
    );

    // Listen to new points.
    const pointsLogger = logger.getChildLogger({
      name: "Points",
    });

    this.pool.on(
      this.pool.filters.IncreasePoints(this.wallet.address),
      (_, __, _points: BigNumber, _transaction: string) => {
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
      (_, __, _amount: BigNumber, _transaction: string) => {
        const transaction = fromBytes(_transaction);

        slashLogger.warn(
          `🚫 Node has been slashed. Lost ${_amount
            .div(decimals)
            .toString()} $KYVE. Bundle = ${transaction}`
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
      this._metadata = JSON.parse(_metadata);

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
