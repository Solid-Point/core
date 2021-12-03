import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import BigNumber from "bignumber.js";
import { OptionValues } from "commander";
import { Contract, ContractTransaction, ethers, Wallet } from "ethers";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import Prando from "prando";
import { satisfies } from "semver";
import { ILogObject } from "tslog";
import {
  adjectives,
  starWars,
  uniqueNamesGenerator,
} from "unique-names-generator";
import {
  BlockInstructions,
  BlockProposal,
  BundlerFunction,
  Vote,
} from "./faces";
import { CLI } from "./utils";
import { fromBytes, toBytes } from "./utils/arweave";
import logger from "./utils/logger";
import {
  getGasPrice,
  toBN,
  toEthersBN,
  toHumanReadable,
  Pool,
  Token,
  sleep,
} from "./utils/helpers";
import { version } from "../package.json";
import Transaction from "arweave/node/lib/transaction";
import hash from "object-hash";

export * from "./utils";

class KYVE {
  private pool: Contract;
  private runtime: string;
  private version: string;
  private stake: string;
  private commission: string;
  private wallet: Wallet;
  private keyfile?: JWKInterface;
  private name: string;
  private gasMultiplier: string;

  private metadata: any;
  private settings: any;
  private config: any;

  private client = new Arweave({
    host: "arweave.net",
    protocol: "https",
  });

  constructor(
    poolAddress: string,
    runtime: string,
    version: string,
    stakeAmount: string,
    commissionAmount: string,
    privateKey: string,
    keyfile?: JWKInterface,
    name?: string,
    endpoint?: string,
    gasMultiplier: string = "1",
    verbose: boolean = false
  ) {
    const provider = new ethers.providers.StaticJsonRpcProvider(
      endpoint || "https://rpc.testnet.moonbeam.network",
      {
        chainId: 1287,
        name: "moonbase-alphanet",
      }
    );

    this.wallet = new Wallet(privateKey, provider);

    this.pool = Pool(poolAddress, this.wallet);
    this.runtime = runtime;
    this.version = version;
    this.stake = stakeAmount;
    this.commission = commissionAmount;
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

    logger.setSettings({
      minLevel: verbose ? undefined : "info",
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

  static async generate(
    cli?: CLI
  ): Promise<{ node: KYVE; options: OptionValues }> {
    if (!cli) {
      cli = new CLI(process.env.KYVE_RUNTIME!, process.env.KYVE_VERSION!);
    }
    await cli.parseAsync();
    const options = cli.opts();

    const node = new KYVE(
      options.pool,
      cli.runtime,
      cli.packageVersion,
      options.stake,
      options.commission,
      options.privateKey,
      // if there is a keyfile flag defined, we load it from disk.
      options.keyfile && JSON.parse(readFileSync(options.keyfile, "utf-8")),
      options.name,
      options.endpoint,
      options.gasMultiplier,
      options.verbose
    );

    return {
      node,
      options,
    };
  }

  async start<ConfigType>(createBundle: BundlerFunction<ConfigType>) {
    this.logNodeInfo();

    await this.fetchPoolState();

    await this.checkVersionRequirements();
    await this.checkRuntimeRequirements();

    await this.setupNodeStake();
    await this.setupNodeCommission();
    await this.setupListeners();

    await this.run(createBundle);

    logger.info("💤 Exiting node ...");
  }

  private async run<ConfigType>(createBundle: BundlerFunction<ConfigType>) {
    let blockProposal: BlockProposal | null = null;
    let blockInstructions: BlockInstructions | null = null;
    let uploadTimeout: NodeJS.Timeout;

    while (true) {
      console.log(`Running as ${this.wallet.address}`);
      blockInstructions = await this.getBlockInstructions();
      console.log(blockInstructions);

      if (
        blockInstructions.uploader === ethers.constants.AddressZero ||
        blockInstructions.uploader === this.wallet.address
      ) {
        const waitingTime = this.calculateUploaderWaitingTime();
        logger.debug(
          `Selected as uploader, waiting ${Math.ceil(
            waitingTime / 1000
          )}s for nodes to vote ...`
        );
        await sleep(waitingTime);
      }

      logger.debug(
        `Creating bundle (${blockInstructions.fromHeight} - ${blockInstructions.toHeight}) ...`
      );

      // TODO: save last instructions and bundle

      const bundle = await createBundle(
        this.config,
        blockInstructions.fromHeight,
        blockInstructions.toHeight
      );

      if (
        blockInstructions.uploader === ethers.constants.AddressZero ||
        blockInstructions.uploader === this.wallet.address
      ) {
        const transaction = await this.uploadBundleToArweave(
          bundle,
          blockInstructions
        );
        await this.submitBlockProposal(transaction);
      }

      uploadTimeout = setTimeout(async () => {
        if (blockInstructions?.uploader !== this.wallet.address) {
          logger.debug("Reached upload timeout. Claiming uploader role ...");
          const tx = await this.pool.claimUploaderRole({
            gasLimit: await this.pool.estimateGas.claimUploaderRole(),
            gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
          });
          logger.debug(`Transaction = ${tx.hash}`);
        }
      }, this.settings.uploadTimeout.toNumber() * 1000);

      logger.debug("Waiting for next block instructions ...");
      await this.waitForNextBlockInstructions();

      clearTimeout(uploadTimeout);

      blockProposal = await this.getBlockProposal();
      console.log(blockProposal);

      if (
        blockProposal.uploader !== ethers.constants.AddressZero &&
        blockProposal.uploader !== this.wallet.address
      ) {
        await this.validateCurrentBlockProposal(bundle, blockProposal);
      }
    }
  }

  private async getBlockProposal(): Promise<BlockProposal> {
    const proposal = {
      ...(await this.pool.blockProposal()),
    };

    return {
      uploader: proposal.uploader,
      txId: fromBytes(proposal.txId),
      byteSize: proposal.byteSize.toNumber(),
      fromHeight: proposal.fromHeight.toNumber(),
      toHeight: proposal.toHeight.toNumber(),
      start: proposal.start.toNumber(),
    };
  }

  private async getBlockInstructions(): Promise<BlockInstructions> {
    const instructions = {
      ...(await this.pool.blockInstructions()),
    };

    return {
      uploader: instructions.uploader,
      fromHeight: instructions.fromHeight.toNumber(),
      toHeight: instructions.toHeight.toNumber(),
    };
  }

  private async uploadBundleToArweave(
    bundle: any[],
    instructions: BlockInstructions
  ): Promise<Transaction> {
    try {
      logger.info("💾 Uploading bundle to Arweave ...");

      const transaction = await this.client.createTransaction({
        data: JSON.stringify(bundle),
      });

      transaction.addTag("Application", "KYVE - Testnet");
      transaction.addTag("Pool", this.pool.address);
      transaction.addTag("@kyve/core", version);
      transaction.addTag(this.runtime, this.version);
      transaction.addTag("Uploader", instructions.uploader);
      transaction.addTag("FromHeight", instructions.fromHeight.toString());
      transaction.addTag("ToHeight", instructions.toHeight.toString());
      transaction.addTag("Content-Type", "application/json");

      await this.client.transactions.sign(transaction, this.keyfile);

      const balance = await this.client.wallets.getBalance(
        await this.client.wallets.getAddress(this.keyfile)
      );

      if (+transaction.reward > +balance) {
        logger.error("❌ You do not have enough funds in your Arweave wallet.");
        process.exit(1);
      }

      await this.client.transactions.post(transaction);

      return transaction;
    } catch (error) {
      logger.error(
        "❌ Received an error while trying to create a block proposal:",
        error
      );
      process.exit(1);
    }
  }

  private async submitBlockProposal(transaction: Transaction) {
    try {
      // manual gas limit for resources exhausted error
      const tx = await this.pool.submitBlockProposal(
        toBytes(transaction.id),
        +transaction.data_size,
        {
          gasLimit: 10000000,
          gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
        }
      );

      logger.debug(`Submitting block proposal ${transaction.id} ...`);
      logger.debug(`Transaction = ${tx.hash}`);
    } catch (error) {
      logger.error(
        "❌ Received an error while submitting block proposal:",
        error
      );
      process.exit(1);
    }
  }

  private async waitForNextBlockInstructions(): Promise<BlockInstructions> {
    return new Promise((resolve) => {
      this.pool.on(
        "NextBlockInstructions",
        (
          uploader: string,
          fromHeight: ethers.BigNumber,
          toHeight: ethers.BigNumber
        ) => {
          resolve({
            uploader,
            fromHeight: fromHeight.toNumber(),
            toHeight: toHeight.toNumber(),
          });
        }
      );
    });
  }

  private async validateCurrentBlockProposal(
    uploadBundle: any[],
    proposal: BlockProposal
  ) {
    logger.debug(`Validating bundle ${proposal.txId} ...`);

    try {
      const { status } = await this.client.transactions.getStatus(
        proposal.txId
      );

      if (status === 200 || status === 202) {
        const _data = (await this.client.transactions.getData(proposal.txId, {
          decode: true,
        })) as Uint8Array;
        const downloadBytes = _data.byteLength;
        const downloadBundle = JSON.parse(
          new TextDecoder("utf-8", {
            fatal: true,
          }).decode(_data)
        );

        if (+proposal.byteSize === +downloadBytes) {
          const uploadBundleHash = hash(
            JSON.parse(JSON.stringify(uploadBundle))
          );
          const downloadBundleHash = hash(
            JSON.parse(JSON.stringify(downloadBundle))
          );

          await this.vote({
            transaction: proposal.txId,
            valid: uploadBundleHash === downloadBundleHash,
          });
        } else {
          logger.debug(
            `Bytes don't match. Uploaded bytes = ${proposal.byteSize} - downloaded bytes = ${downloadBytes}`
          );

          await this.vote({
            transaction: proposal.txId,
            valid: false,
          });
        }
      }
    } catch (err) {
      logger.error(`❌ Error fetching bundle from Arweave: ${err}`);
    }
  }

  private async vote(vote: Vote) {
    logger.info(
      `🖋  Voting ${vote.valid ? "valid" : "invalid"} on bundle ${
        vote.transaction
      } ...`
    );

    const canVote: boolean = await this.pool.canVote(this.wallet.address);
    if (!canVote) {
      logger.info(
        "⚠️  Node has no voting power because it has no delegators. Skipping vote ..."
      );
      return;
    }

    try {
      const tx = await this.pool.vote(toBytes(vote.transaction), vote.valid, {
        gasLimit: await this.pool.estimateGas.vote(
          toBytes(vote.transaction),
          vote.valid
        ),
        gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
      });
      logger.debug(`Transaction = ${tx.hash}`);
    } catch (error) {
      logger.error("❌ Received an error while trying to vote:", error);
    }
  }

  private logNodeInfo() {
    const formatInfoLogs = (input: string) => {
      const length = Math.max(13, this.runtime.length);
      return input.padEnd(length, " ");
    };

    logger.info(
      `🚀 Starting node ...\n\t${formatInfoLogs("Name")} = ${
        this.name
      }\n\t${formatInfoLogs("Address")} = ${
        this.wallet.address
      }\n\t${formatInfoLogs("Pool")} = ${this.pool.address}\n\t${formatInfoLogs(
        "Desired Stake"
      )} = ${this.stake} $KYVE\n\n\t${formatInfoLogs(
        "@kyve/core"
      )} = v${version}\n\t${formatInfoLogs(this.runtime)} = v${this.version}`
    );
  }

  private async setupListeners() {
    // // Listen to new contract changes.
    // this.pool.on("ConfigChanged", () => {
    // logger.warn("⚠️  Config changed. Exiting ...");
    //   process.exit();
    // });
    // this.pool.on("MetadataChanged", async () => {
    //   await this.fetchPoolState();
    // });
    // this.pool.on("Paused", () => {
    //   if (this.node?.address === this.settings.uploader) {
    //     logger.warn("⚠️  Pool is now paused. Exiting ...");
    //     process.exit();
    //   }
    // });
    // this.pool.on("UploaderChanged", (previous: string) => {
    //   if (this.node?.address === previous) {
    //     logger.warn("⚠️  Uploader changed. Exiting ...");
    //     process.exit();
    //   }
    // });
    // // Listen to new payouts.
    // const payoutLogger = logger.getChildLogger({
    //   name: "Payout",
    // });
    // this.pool.on(
    //   this.pool.filters.PayedOut(this.node?.address),
    //   (_, _amount: ethers.BigNumber, _transaction: string) => {
    //     const transaction = fromBytes(_transaction);
    //     payoutLogger.info(
    //       `💸 Received a reward of ${toHumanReadable(
    //         toBN(_amount)
    //       )} $KYVE. Bundle = ${transaction}`
    //     );
    //   }
    // );
    // // Listen to new points.
    // const pointsLogger = logger.getChildLogger({
    //   name: "Points",
    // });
    // this.pool.on(
    //   this.pool.filters.PointsIncreased(this.node?.address),
    //   (_, _points: ethers.BigNumber, _transaction: string) => {
    //     const transaction = fromBytes(_transaction);
    //     pointsLogger.warn(
    //       `⚠️  Received a new slashing point (${_points.toString()} / ${
    //         this.settings.slashThreshold
    //       }). Bundle = ${transaction}`
    //     );
    //   }
    // );
    // // Listen to new slashes.
    // const slashLogger = logger.getChildLogger({
    //   name: "Slash",
    // });
    // this.pool.on(
    //   this.pool.filters.Slashed(this.node?.address),
    //   (_, _amount: ethers.BigNumber, _transaction: string) => {
    //     const transaction = fromBytes(_transaction);
    //     slashLogger.warn(
    //       `🚫 Node has been slashed. Lost ${toHumanReadable(
    //         toBN(_amount)
    //       )} $KYVE. Bundle = ${transaction}`
    //     );
    //     process.exit();
    //   }
    // );
  }

  private async fetchPoolState() {
    const stateLogger = logger.getChildLogger({
      name: "PoolState",
    });

    stateLogger.debug("Attempting to fetch pool state.");

    let _poolState;

    try {
      _poolState = await this.pool.pool();
    } catch (error) {
      stateLogger.error(
        "❌ Received an error while trying to fetch the pool state:",
        error
      );
      process.exit(1);
    }

    try {
      this.config = JSON.parse(_poolState.config);
    } catch (error) {
      stateLogger.error(
        "❌ Received an error while trying to parse the config:",
        error
      );
      process.exit(1);
    }

    try {
      const oldMetadata = this.metadata;
      this.metadata = JSON.parse(_poolState.metadata);

      if (
        oldMetadata &&
        this.metadata.versions &&
        oldMetadata.versions !== this.metadata.versions
      ) {
        logger.warn("⚠️  Version requirements changed. Exiting ...");
        logger.info(
          `⏱  New version requirements are ${this.metadata.versions}.`
        );
        process.exit();
      }
    } catch (error) {
      stateLogger.error(
        "❌ Received an error while trying to parse the metadata:",
        error
      );
      process.exit(1);
    }

    this.settings = _poolState;

    console.log(this.settings);

    stateLogger.debug("Successfully fetched pool state.");
  }

  private async checkVersionRequirements() {
    if (satisfies(this.version, this.metadata.versions || this.version)) {
      logger.info("⏱  Pool version requirements met.");
    } else {
      logger.error(
        `❌ Running an invalid version for the specified pool. Version requirements are ${this.metadata.versions}.`
      );
      process.exit(1);
    }
  }

  private async checkRuntimeRequirements() {
    if (this.metadata.runtime === this.runtime) {
      logger.info(`💻 Running node on runtime ${this.runtime}.`);
    } else {
      logger.error("❌ Specified pool does not match the integration runtime.");
      process.exit(1);
    }
  }

  private async setupNodeStake() {
    let parsedStake;

    logger.info("🌐 Joining KYVE Network ...");

    let nodeStake = toBN(
      (await this.pool.nodeState(this.wallet.address)).personalStake
    );

    try {
      parsedStake = new BigNumber(this.stake).multipliedBy(
        new BigNumber(10).exponentiatedBy(18)
      );

      if (parsedStake.isZero()) {
        logger.error("❌ Desired stake can't be zero.");
        process.exit(1);
      }
    } catch (error) {
      logger.error("❌ Provided invalid staking amount:", error);
      process.exit(1);
    }

    if (parsedStake.lt(toBN(this.settings.minStake))) {
      logger.error(
        `❌ Desired stake is lower than the minimum stake. Desired Stake = ${toHumanReadable(
          parsedStake
        )}, Minimum Stake = ${toHumanReadable(toBN(this.settings.minStake))}`
      );
      process.exit();
    }

    if (parsedStake.gt(nodeStake)) {
      // Stake the difference.
      const diff = parsedStake.minus(nodeStake);
      await this.selfStake(diff);
    } else if (parsedStake.lt(nodeStake)) {
      // Unstake the difference.
      const diff = nodeStake.minus(parsedStake);
      await this.selfUnstake(diff);
    } else {
      logger.info("👌 Already staked with the correct amount.");
    }
  }

  private async selfStake(amount: BigNumber) {
    const token = await Token(this.pool);
    let tx: ContractTransaction;

    const balance = toBN(
      (await token.balanceOf(this.wallet.address)) as ethers.BigNumber
    );

    if (balance.lt(amount)) {
      logger.error("❌ Supplied wallet does not have enough $KYVE to stake.");
      process.exit(1);
    }

    try {
      tx = await token.approve(this.pool.address, toEthersBN(amount), {
        gasLimit: await token.estimateGas.approve(
          this.pool.address,
          toEthersBN(amount)
        ),
        gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
      });
      logger.debug(
        `Approving ${toHumanReadable(
          amount
        )} $KYVE to be spent. Transaction = ${tx.hash}`
      );

      await tx.wait();
      logger.info("👍 Successfully approved.");

      tx = await this.pool.stake(toEthersBN(amount), {
        gasLimit: await this.pool.estimateGas.stake(toEthersBN(amount)),
        gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
      });
      logger.debug(
        `Staking ${toHumanReadable(amount)} $KYVE. Transaction = ${tx.hash}`
      );

      await tx.wait();
      logger.info("📈 Successfully staked.");
    } catch (error) {
      logger.error("❌ Received an error while trying to stake:", error);
      process.exit(1);
    }
  }

  private async selfUnstake(amount: BigNumber) {
    let tx: ContractTransaction;

    try {
      tx = await this.pool.unstake(toEthersBN(amount), {
        gasLimit: await this.pool.estimateGas.unstake(toEthersBN(amount)),
        gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
      });
      logger.debug(`Unstaking. Transaction = ${tx.hash}`);

      await tx.wait();
      logger.info("📉 Successfully unstaked.");
    } catch (error) {
      logger.error("❌ Received an error while trying to unstake:", error);
      process.exit(1);
    }
  }

  private async setupNodeCommission() {
    let parsedCommission;

    logger.info("👥 Setting node commission ...");

    let nodeCommission = toBN(
      (await this.pool.nodeState(this.wallet.address)).commission
    );

    try {
      parsedCommission = new BigNumber(this.commission).multipliedBy(
        new BigNumber(10).exponentiatedBy(18)
      );

      if (parsedCommission.lt(0) && parsedCommission.gt(100)) {
        logger.error("❌ Desired commission must be between 0 and 100.");
        process.exit(1);
      }
    } catch (error) {
      logger.error("❌ Provided invalid commission amount:", error);
      process.exit(1);
    }

    if (!parsedCommission.eq(nodeCommission)) {
      try {
        const tx = await this.pool.updateCommission(
          toEthersBN(parsedCommission),
          {
            gasLimit: await this.pool.estimateGas.updateCommission(
              toEthersBN(parsedCommission)
            ),
            gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
          }
        );
        logger.debug(`Updating commission. Transaction = ${tx.hash}`);

        await tx.wait();
        logger.info("💼 Successfully updated commission.");
      } catch (error) {
        logger.error(
          "❌ Received an error while trying to update commission:",
          error
        );
        process.exit(1);
      }
    } else {
      logger.info("👌 Already staked with the correct commission.");
    }
  }

  private calculateUploaderWaitingTime() {
    const waitingTime = Math.log2(this.settings.bundleSize) * 5;
    if (waitingTime > 30) return waitingTime * 1000;
    return 30 * 1000;
  }
}

export default KYVE;
