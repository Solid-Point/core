"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const arweave_1 = __importDefault(require("arweave"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ethers_1 = require("ethers");
const fs_1 = require("fs");
const prando_1 = __importDefault(require("prando"));
const semver_1 = require("semver");
const unique_names_generator_1 = require("unique-names-generator");
const utils_1 = require("./utils");
const arweave_2 = require("./utils/arweave");
const logger_1 = __importDefault(require("./utils/logger"));
const helpers_1 = require("./utils/helpers");
const node_json_1 = __importDefault(require("./abi/node.json"));
const package_json_1 = require("../package.json");
const object_hash_1 = __importDefault(require("object-hash"));
__exportStar(require("./utils"), exports);
class KYVE {
    constructor(poolAddress, runtime, version, stakeAmount, privateKey, keyfile, name, endpoint, gasMultiplier = "1") {
        this.client = new arweave_1.default({
            host: "arweave.net",
            protocol: "https",
        });
        const provider = new ethers_1.ethers.providers.StaticJsonRpcProvider(endpoint || "https://rpc.testnet.moonbeam.network", {
            chainId: 1287,
            name: "moonbase-alphanet",
        });
        this.wallet = new ethers_1.Wallet(privateKey, provider);
        this.pool = (0, helpers_1.Pool)(poolAddress, this.wallet);
        this.node = null;
        this.runtime = runtime;
        this.version = version;
        this.stake = stakeAmount;
        this.keyfile = keyfile;
        this.gasMultiplier = gasMultiplier;
        if (name) {
            this.name = name;
        }
        else {
            const r = new prando_1.default(this.wallet.address + this.pool.address);
            this.name = (0, unique_names_generator_1.uniqueNamesGenerator)({
                dictionaries: [unique_names_generator_1.adjectives, unique_names_generator_1.starWars],
                separator: "-",
                length: 2,
                style: "lowerCase",
                seed: r.nextInt(0, unique_names_generator_1.adjectives.length * unique_names_generator_1.starWars.length),
            }).replace(" ", "-");
        }
        if (!(0, fs_1.existsSync)("./logs")) {
            (0, fs_1.mkdirSync)("./logs");
        }
        const logToTransport = (log) => {
            (0, fs_1.appendFileSync)(`./logs/${this.name}.txt`, JSON.stringify(log) + "\n");
        };
        logger_1.default.attachTransport({
            silly: logToTransport,
            debug: logToTransport,
            trace: logToTransport,
            info: logToTransport,
            warn: logToTransport,
            error: logToTransport,
            fatal: logToTransport,
        });
    }
    static async generate(cli) {
        if (!cli) {
            cli = new utils_1.CLI(process.env.KYVE_RUNTIME, process.env.KYVE_VERSION);
        }
        await cli.parseAsync();
        const options = cli.opts();
        const node = new KYVE(options.pool, cli.runtime, cli.packageVersion, options.stake, options.privateKey, 
        // if there is a keyfile flag defined, we load it from disk.
        options.keyfile && JSON.parse((0, fs_1.readFileSync)(options.keyfile, "utf-8")), options.name, options.endpoint, options.gasMultiplier);
        return {
            node,
            options,
        };
    }
    async start(createBundle) {
        this.logNodeInfo();
        await this.fetchPoolState();
        await this.checkVersionRequirements();
        await this.checkRuntimeRequirements();
        await this.setupNodeContract();
        await this.setupListeners();
        await this.run(createBundle);
        logger_1.default.info("💤 Exiting node ...");
    }
    async run(createBundle) {
        let proposal = null;
        let instructions = null;
        const runner = async () => {
            var _a, _b, _c;
            while (true) {
                logger_1.default.debug(`Running as ${(_a = this.node) === null || _a === void 0 ? void 0 : _a.address}`);
                proposal = await this.getBlockProposal();
                console.log(proposal);
                // TODO: check if already voted
                if (proposal.uploader !== ethers_1.ethers.constants.AddressZero &&
                    proposal.uploader !== ((_b = this.node) === null || _b === void 0 ? void 0 : _b.address)) {
                    logger_1.default.debug(`Creating bundle for vote (${proposal.fromHeight} - ${proposal.toHeight})`);
                    const downloadBundle = await createBundle(this.config, proposal.fromHeight, proposal.toHeight);
                    await this.validateCurrentBlockProposal(downloadBundle);
                }
                instructions = await this.getBlockInstructions();
                console.log(instructions);
                if (instructions.uploader === ethers_1.ethers.constants.AddressZero ||
                    instructions.uploader === ((_c = this.node) === null || _c === void 0 ? void 0 : _c.address)) {
                    logger_1.default.debug(`Creating bundle for submit (${instructions.fromHeight} - ${instructions.toHeight})`);
                    const uploadBundle = await createBundle(this.config, instructions.fromHeight, instructions.toHeight);
                    const transaction = await this.uploadBundleToArweave(uploadBundle, instructions);
                    await this.submitBlockProposal(transaction);
                }
                logger_1.default.debug("Waiting for next block instructions");
                await this.waitForNextBlockInstructions();
            }
        };
        runner();
    }
    async getBlockProposal() {
        const proposal = {
            ...(await this.pool.blockProposal()),
        };
        return {
            uploader: proposal.uploader,
            txId: (0, arweave_2.fromBytes)(proposal.txId),
            byteSize: proposal.byteSize.toNumber(),
            fromHeight: proposal.fromHeight.toNumber(),
            toHeight: proposal.toHeight.toNumber(),
            start: proposal.start.toNumber(),
            validLength: proposal.validLength.toNumber(),
            invalidLength: proposal.invalidLength.toNumber(),
        };
    }
    async getBlockInstructions() {
        const instructions = {
            ...(await this.pool.blockInstructions()),
        };
        return {
            uploader: instructions.uploader,
            fromHeight: instructions.fromHeight.toNumber(),
            toHeight: instructions.toHeight.toNumber(),
        };
    }
    async uploadBundleToArweave(bundle, instructions) {
        try {
            logger_1.default.info("💾 Uploading bundle to Arweave ...");
            const transaction = await this.client.createTransaction({
                data: JSON.stringify(bundle),
            });
            transaction.addTag("Application", "KYVE - Testnet");
            transaction.addTag("Pool", this.pool.address);
            transaction.addTag("@kyve/core", package_json_1.version);
            transaction.addTag(this.runtime, this.version);
            transaction.addTag("Uploader", instructions.uploader);
            transaction.addTag("FromHeight", instructions.fromHeight.toString());
            transaction.addTag("ToHeight", instructions.toHeight.toString());
            transaction.addTag("Content-Type", "application/json");
            await this.client.transactions.sign(transaction, this.keyfile);
            const balance = await this.client.wallets.getBalance(await this.client.wallets.getAddress(this.keyfile));
            if (+transaction.reward > +balance) {
                logger_1.default.error("❌ You do not have enough funds in your Arweave wallet.");
                process.exit(1);
            }
            await this.client.transactions.post(transaction);
            logger_1.default.debug(`Arweave bundle = ${transaction.id}`);
            return transaction;
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to create a block proposal:", error);
            process.exit(1);
        }
    }
    async submitBlockProposal(transaction) {
        try {
            // manual gas limit for resources exhausted error
            const tx = await this.pool.submitBlockProposal((0, arweave_2.toBytes)(transaction.id), +transaction.data_size, {
                gasLimit: 10000000,
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            logger_1.default.info("Submitting new block proposal.");
            logger_1.default.debug(`Transaction = ${tx.hash}`);
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while submitting block proposal:", error);
            process.exit(1);
        }
    }
    async waitForNextBlockInstructions() {
        return new Promise((resolve) => {
            this.pool.on("NextBlockInstructions", (uploader, fromHeight, toHeight) => {
                resolve({
                    uploader,
                    fromHeight: fromHeight.toNumber(),
                    toHeight: toHeight.toNumber(),
                });
            });
        });
    }
    async validateCurrentBlockProposal(uploadBundle) {
        const proposal = await this.getBlockProposal();
        try {
            const { status } = await this.client.transactions.getStatus(proposal.txId);
            if (status === 200 || status === 202) {
                const _data = (await this.client.transactions.getData(proposal.txId, {
                    decode: true,
                }));
                const downloadBytes = _data.byteLength;
                const downloadBundle = JSON.parse(new TextDecoder("utf-8", {
                    fatal: true,
                }).decode(_data));
                console.log(+proposal.byteSize, +downloadBytes);
                if (+proposal.byteSize === +downloadBytes) {
                    const uploadBundleHash = (0, object_hash_1.default)(JSON.parse(JSON.stringify(uploadBundle)));
                    const downloadBundleHash = (0, object_hash_1.default)(JSON.parse(JSON.stringify(downloadBundle)));
                    console.log(uploadBundleHash, downloadBundleHash);
                    this.vote({
                        transaction: proposal.txId,
                        valid: uploadBundleHash === downloadBundleHash,
                    });
                }
                else {
                    logger_1.default.debug(`Bytes don't match. Uploaded data size = ${proposal.byteSize} Downloaded data size = ${downloadBytes}`);
                    this.vote({
                        transaction: proposal.txId,
                        valid: false,
                    });
                }
            }
        }
        catch (err) {
            logger_1.default.error(`❌ Error fetching bundle from Arweave: ${err}`);
        }
    }
    async vote(vote) {
        logger_1.default.info(`🖋 Voting "${vote.valid ? "valid" : "invalid"}" on bundle ${vote.transaction} ...`);
        try {
            await this.pool.vote((0, arweave_2.toBytes)(vote.transaction), vote.valid, {
                gasLimit: await this.pool.estimateGas.vote((0, arweave_2.toBytes)(vote.transaction), vote.valid),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to vote:", error);
        }
    }
    logNodeInfo() {
        const formatInfoLogs = (input) => {
            const length = Math.max(13, this.runtime.length);
            return input.padEnd(length, " ");
        };
        logger_1.default.info(`🚀 Starting node ...\n\t${formatInfoLogs("Name")} = ${this.name}\n\t${formatInfoLogs("Address")} = ${this.wallet.address}\n\t${formatInfoLogs("Pool")} = ${this.pool.address}\n\t${formatInfoLogs("Desired Stake")} = ${this.stake} $KYVE\n\n\t${formatInfoLogs("@kyve/core")} = v${package_json_1.version}\n\t${formatInfoLogs(this.runtime)} = v${this.version}`);
    }
    async setupListeners() {
        // // Listen to new contract changes.
        // this.pool.on("ConfigChanged", () => {
        //   logger.warn("⚠️  Config changed. Exiting ...");
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
    async fetchPoolState() {
        const stateLogger = logger_1.default.getChildLogger({
            name: "PoolState",
        });
        stateLogger.debug("Attempting to fetch pool state.");
        let _poolState;
        try {
            _poolState = await this.pool.poolState();
        }
        catch (error) {
            stateLogger.error("❌ Received an error while trying to fetch the pool state:", error);
            process.exit(1);
        }
        try {
            this.config = JSON.parse(_poolState.config);
        }
        catch (error) {
            stateLogger.error("❌ Received an error while trying to parse the config:", error);
            process.exit(1);
        }
        try {
            const oldMetadata = this.metadata;
            this.metadata = JSON.parse(_poolState.metadata);
            if (oldMetadata &&
                this.metadata.versions &&
                oldMetadata.versions !== this.metadata.versions) {
                logger_1.default.warn("⚠️  Version requirements changed. Exiting ...");
                logger_1.default.info(`⏱  New version requirements are ${this.metadata.versions}.`);
                process.exit();
            }
        }
        catch (error) {
            stateLogger.error("❌ Received an error while trying to parse the metadata:", error);
            process.exit(1);
        }
        this.settings = _poolState;
        stateLogger.debug("Successfully fetched pool state.");
    }
    async checkVersionRequirements() {
        if ((0, semver_1.satisfies)(this.version, this.metadata.versions || this.version)) {
            logger_1.default.info("⏱  Pool version requirements met.");
        }
        else {
            logger_1.default.error(`❌ Running an invalid version for the specified pool. Version requirements are ${this.metadata.versions}.`);
            process.exit(1);
        }
    }
    async checkRuntimeRequirements() {
        if (this.metadata.runtime === this.runtime) {
            logger_1.default.info(`💻 Running node on runtime ${this.runtime}.`);
        }
        else {
            logger_1.default.error("❌ Specified pool does not match the integration runtime.");
            process.exit(1);
        }
    }
    async setupNodeContract() {
        var _a;
        let nodeAddress = await this.pool.nodeOwners(this.wallet.address);
        let parsedStake;
        let tx;
        logger_1.default.info("🌐 Joining KYVE Network ...");
        if (ethers_1.constants.AddressZero === nodeAddress) {
            try {
                tx = await this.pool.createNode(10, {
                    gasLimit: await this.pool.estimateGas.createNode(10),
                    gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
                });
                logger_1.default.debug(`Creating new contract. Transaction = ${tx.hash}`);
                await tx.wait();
                nodeAddress = await this.pool.nodeOwners(this.wallet.address);
            }
            catch (error) {
                logger_1.default.error("❌ Could not create node contract:", error);
                process.exit(1);
            }
        }
        this.node = new ethers_1.Contract(nodeAddress, node_json_1.default, this.wallet);
        logger_1.default.info(`✅ Connected to node ${nodeAddress}`);
        let nodeStake = await ((_a = this.node) === null || _a === void 0 ? void 0 : _a.delegationAmount(this.wallet.address));
        try {
            parsedStake = new bignumber_js_1.default(this.stake).multipliedBy(new bignumber_js_1.default(10).exponentiatedBy(18));
            if (parsedStake.isZero()) {
                logger_1.default.error("❌ Desired stake can't be zero.");
                process.exit(1);
            }
        }
        catch (error) {
            logger_1.default.error("❌ Provided invalid staking amount:", error);
            process.exit(1);
        }
        if (nodeStake.isZero()) {
            await this.selfDelegate(parsedStake);
        }
        else if (!(0, helpers_1.toEthersBN)(parsedStake).eq(nodeStake)) {
            await this.selfUndelegate();
            await this.selfDelegate(parsedStake);
        }
        else {
            logger_1.default.info("👌 Already staked with the correct amount.");
        }
    }
    async selfDelegate(amount) {
        var _a, _b;
        const token = await (0, helpers_1.Token)(this.pool);
        let tx;
        const balance = (0, helpers_1.toBN)((await token.balanceOf(this.wallet.address)));
        if (balance.lt(amount)) {
            logger_1.default.error("❌ Supplied wallet does not have enough $KYVE to stake.");
            process.exit(1);
        }
        try {
            tx = await token.approve(this.pool.address, (0, helpers_1.toEthersBN)(amount), {
                gasLimit: await token.estimateGas.approve(this.pool.address, (0, helpers_1.toEthersBN)(amount)),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            logger_1.default.debug(`Approving ${(0, helpers_1.toHumanReadable)(amount)} $KYVE to be spent. Transaction = ${tx.hash}`);
            await tx.wait();
            logger_1.default.info("👍 Successfully approved.");
            tx = await this.pool.delegate((_a = this.node) === null || _a === void 0 ? void 0 : _a.address, (0, helpers_1.toEthersBN)(amount), {
                gasLimit: await this.pool.estimateGas.delegate((_b = this.node) === null || _b === void 0 ? void 0 : _b.address, (0, helpers_1.toEthersBN)(amount)),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            logger_1.default.debug(`Staking ${(0, helpers_1.toHumanReadable)(amount)} $KYVE. Transaction = ${tx.hash}`);
            await tx.wait();
            logger_1.default.info("📈 Successfully staked.");
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to stake:", error);
            process.exit(1);
        }
    }
    async selfUndelegate() {
        var _a, _b;
        let tx;
        try {
            tx = await this.pool.undelegate((_a = this.node) === null || _a === void 0 ? void 0 : _a.address, {
                gasLimit: await this.pool.estimateGas.undelegate((_b = this.node) === null || _b === void 0 ? void 0 : _b.address),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            logger_1.default.debug(`Unstaking. Transaction = ${tx.hash}`);
            await tx.wait();
            logger_1.default.info("📉 Successfully unstaked.");
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to unstake:", error);
            process.exit(1);
        }
    }
}
exports.default = KYVE;
