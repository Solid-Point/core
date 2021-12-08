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
const package_json_1 = require("../package.json");
const object_hash_1 = __importDefault(require("object-hash"));
__exportStar(require("./utils"), exports);
class KYVE {
    constructor(cli) {
        this.client = new arweave_1.default({
            host: "arweave.net",
            protocol: "https",
        });
        if (!cli) {
            cli = new utils_1.CLI(process.env.KYVE_RUNTIME, process.env.KYVE_VERSION);
        }
        cli.parse();
        const options = cli.opts();
        console.log(options);
        const provider = new ethers_1.ethers.providers.StaticJsonRpcProvider(options.endpoint || "https://rpc.testnet.moonbeam.network", {
            chainId: 1287,
            name: "moonbase-alphanet",
        });
        this.wallet = new ethers_1.Wallet(options.privateKey, provider);
        this.pool = (0, helpers_1.Pool)(options.pool, this.wallet);
        this.runtime = cli.runtime;
        this.version = cli.packageVersion;
        this.stake = options.stake;
        this.commission = options.commission;
        this.keyfile =
            options.keyfile && JSON.parse((0, fs_1.readFileSync)(options.keyfile, "utf-8"));
        this.gasMultiplier = options.gasMultiplier;
        if (options.name) {
            this.name = options.name;
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
        logger_1.default.setSettings({
            minLevel: options.verbose ? undefined : "info",
        });
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
    async start() {
        this.logNodeInfo();
        await this.fetchPoolState();
        await this.setupNodeStake();
        await this.setupNodeCommission();
        await this.checkIfNodeIsValidator();
        await this.run();
    }
    async run() {
        try {
            while (true) {
                await this.fetchPoolState();
                if (this.poolState.paused) {
                    logger_1.default.info("💤  Pool is paused. Waiting ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                await this.checkIfNodeIsValidator();
                const blockInstructions = await this.getBlockInstructions();
                console.log(blockInstructions);
                if (blockInstructions.uploader === ethers_1.ethers.constants.AddressZero ||
                    blockInstructions.uploader === this.wallet.address) {
                    const waitingTime = this.calculateUploaderWaitingTime();
                    logger_1.default.debug(`Selected as uploader, waiting ${Math.ceil(waitingTime / 1000)}s for nodes to vote ...`);
                    await (0, helpers_1.sleep)(waitingTime);
                }
                logger_1.default.debug(`Creating bundle (${blockInstructions.fromHeight} - ${blockInstructions.toHeight}) ...`);
                // TODO: save last instructions and bundle
                const uploadBundle = await this.createBundle(this.poolState.config, blockInstructions);
                if (blockInstructions.uploader === ethers_1.ethers.constants.AddressZero ||
                    blockInstructions.uploader === this.wallet.address) {
                    const transaction = await this.uploadBundleToArweave(uploadBundle, blockInstructions);
                    if (transaction) {
                        await this.submitBlockProposal(transaction);
                    }
                }
                await this.waitForNextBlockInstructions(blockInstructions);
                const blockProposal = await this.getBlockProposal();
                console.log(blockProposal);
                if (blockProposal.uploader !== ethers_1.ethers.constants.AddressZero &&
                    blockProposal.uploader !== this.wallet.address) {
                    logger_1.default.debug(`Validating bundle ${blockProposal.txId} ...`);
                    try {
                        const { status } = await this.client.transactions.getStatus(blockProposal.txId);
                        if (status === 200 || status === 202) {
                            const _data = (await this.client.transactions.getData(blockProposal.txId, {
                                decode: true,
                            }));
                            const downloadBytes = _data.byteLength;
                            const downloadBundle = JSON.parse(new TextDecoder("utf-8", {
                                fatal: true,
                            }).decode(_data));
                            await this.vote({
                                transaction: blockProposal.txId,
                                valid: await this.validate(JSON.parse(JSON.stringify(uploadBundle)), +blockProposal.byteSize, JSON.parse(JSON.stringify(downloadBundle)), +downloadBytes),
                            });
                        }
                    }
                    catch (error) {
                        logger_1.default.error(`❌ Error fetching bundle from Arweave. Skipping vote ...`);
                        logger_1.default.debug(error);
                    }
                }
            }
        }
        catch (error) {
            logger_1.default.error(`❌ Runtime error. Exiting ...`);
            logger_1.default.debug(error);
        }
    }
    async createBundle(config, blockInstructions) {
        logger_1.default.error(`❌ CreateBundle not implemented. Exiting ...`);
        process.exit(1);
    }
    async validate(uploadBundle, uploadBytes, downloadBundle, downloadBytes) {
        if (uploadBytes !== downloadBytes) {
            return false;
        }
        if ((0, object_hash_1.default)(uploadBundle) !== (0, object_hash_1.default)(downloadBundle)) {
            return false;
        }
        return true;
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
            return transaction;
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to upload bundle to Arweave. Skipping upload ...");
            logger_1.default.debug(error);
            return null;
        }
    }
    async submitBlockProposal(transaction) {
        try {
            const tx = await this.pool.submitBlockProposal((0, arweave_2.toBytes)(transaction.id), +transaction.data_size, {
                gasLimit: ethers_1.ethers.BigNumber.from(1000000),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            logger_1.default.debug(`Submitting block proposal ${transaction.id} ...`);
            logger_1.default.debug(`Transaction = ${tx.hash}`);
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while submitting block proposal. Skipping submit ...");
            logger_1.default.debug(error);
        }
    }
    async waitForNextBlockInstructions(blockInstructions) {
        logger_1.default.debug("Waiting for next block instructions ...");
        const uploadTimeout = setTimeout(async () => {
            try {
                if ((blockInstructions === null || blockInstructions === void 0 ? void 0 : blockInstructions.uploader) !== this.wallet.address) {
                    logger_1.default.debug("Reached upload timeout. Claiming uploader role ...");
                    const tx = await this.pool.claimUploaderRole({
                        gasLimit: await this.pool.estimateGas.claimUploaderRole(),
                        gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
                    });
                    logger_1.default.debug(`Transaction = ${tx.hash}`);
                }
            }
            catch (error) {
                logger_1.default.error("❌ Received an error while claiming uploader slot. Skipping claim ...");
                logger_1.default.debug(error);
            }
        }, this.poolState.uploadTimeout.toNumber() * 1000);
        return new Promise((resolve) => {
            this.pool.on("NextBlockInstructions", () => {
                clearTimeout(uploadTimeout);
                resolve();
            });
        });
    }
    async vote(vote) {
        logger_1.default.info(`🖋  Voting ${vote.valid ? "valid" : "invalid"} on bundle ${vote.transaction} ...`);
        const canVote = await this.pool.canVote(this.wallet.address);
        if (!canVote) {
            logger_1.default.info("⚠️  Node has no voting power because it has no delegators. Skipping vote ...");
            return;
        }
        try {
            const tx = await this.pool.vote((0, arweave_2.toBytes)(vote.transaction), vote.valid, {
                gasLimit: await this.pool.estimateGas.vote((0, arweave_2.toBytes)(vote.transaction), vote.valid),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            logger_1.default.debug(`Transaction = ${tx.hash}`);
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to vote. Skipping vote ...");
            logger_1.default.debug(error);
        }
    }
    logNodeInfo() {
        const formatInfoLogs = (input) => {
            const length = Math.max(13, this.runtime.length);
            return input.padEnd(length, " ");
        };
        logger_1.default.info(`🚀 Starting node ...\n\t${formatInfoLogs("Name")} = ${this.name}\n\t${formatInfoLogs("Address")} = ${this.wallet.address}\n\t${formatInfoLogs("Pool")} = ${this.pool.address}\n\t${formatInfoLogs("Desired Stake")} = ${this.stake} $KYVE\n\n\t${formatInfoLogs("@kyve/core")} = v${package_json_1.version}\n\t${formatInfoLogs(this.runtime)} = v${this.version}`);
    }
    async fetchPoolState() {
        var _a, _b;
        logger_1.default.debug("Attempting to fetch pool state.");
        try {
            this.poolState = { ...(await this.pool.pool()) };
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to fetch the pool state:", error);
            process.exit(1);
        }
        try {
            this.poolState.config = JSON.parse(this.poolState.config);
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to parse the config:", error);
            process.exit(1);
        }
        try {
            this.poolState.metadata = JSON.parse(this.poolState.metadata);
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to parse the metadata:", error);
            process.exit(1);
        }
        try {
            if ((0, semver_1.satisfies)(this.version, ((_a = this.poolState.metadata) === null || _a === void 0 ? void 0 : _a.versions) || this.version)) {
                logger_1.default.info("⏱  Pool version requirements met.");
            }
            else {
                logger_1.default.error(`❌ Running an invalid version for the specified pool. Version requirements are ${this.poolState.metadata.versions}.`);
                process.exit(1);
            }
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying parse versions");
            logger_1.default.debug(error);
            process.exit(1);
        }
        if (((_b = this.poolState.metadata) === null || _b === void 0 ? void 0 : _b.runtime) === this.runtime) {
            logger_1.default.info(`💻 Running node on runtime ${this.runtime}.`);
        }
        else {
            logger_1.default.error("❌ Specified pool does not match the integration runtime.");
            process.exit(1);
        }
        logger_1.default.info("ℹ Fetched pool state.");
    }
    async checkIfNodeIsValidator() {
        try {
            const isValidator = await this.pool.isValidator(this.wallet.address);
            if (isValidator) {
                logger_1.default.info("🔍  Node is running as a validator.");
            }
            else {
                logger_1.default.error("❌ Node is no active validator. Exiting ...");
                process.exit(1);
            }
        }
        catch (error) {
            logger_1.default.error("❌ Received an error while trying to fetch validator info");
            logger_1.default.debug(error);
            process.exit(1);
        }
    }
    async setupNodeStake() {
        let parsedStake;
        logger_1.default.info("🌐 Joining KYVE Network ...");
        let nodeStake = (0, helpers_1.toBN)((await this.pool.nodeState(this.wallet.address)).personalStake);
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
        if (parsedStake.lt((0, helpers_1.toBN)(this.poolState.minStake))) {
            logger_1.default.error(`❌ Desired stake is lower than the minimum stake. Desired Stake = ${(0, helpers_1.toHumanReadable)(parsedStake)}, Minimum Stake = ${(0, helpers_1.toHumanReadable)((0, helpers_1.toBN)(this.poolState.minStake))}`);
            process.exit();
        }
        if (parsedStake.gt(nodeStake)) {
            // Stake the difference.
            const diff = parsedStake.minus(nodeStake);
            await this.selfStake(diff);
        }
        else if (parsedStake.lt(nodeStake)) {
            // Unstake the difference.
            const diff = nodeStake.minus(parsedStake);
            await this.selfUnstake(diff);
        }
        else {
            logger_1.default.info("👌 Already staked with the correct amount.");
        }
    }
    async selfStake(amount) {
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
            tx = await this.pool.stake((0, helpers_1.toEthersBN)(amount), {
                gasLimit: await this.pool.estimateGas.stake((0, helpers_1.toEthersBN)(amount)),
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
    async selfUnstake(amount) {
        let tx;
        try {
            tx = await this.pool.unstake((0, helpers_1.toEthersBN)(amount), {
                gasLimit: await this.pool.estimateGas.unstake((0, helpers_1.toEthersBN)(amount)),
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
    async setupNodeCommission() {
        let parsedCommission;
        logger_1.default.info("👥 Setting node commission ...");
        let nodeCommission = (0, helpers_1.toBN)((await this.pool.nodeState(this.wallet.address)).commission);
        try {
            parsedCommission = new bignumber_js_1.default(this.commission).multipliedBy(new bignumber_js_1.default(10).exponentiatedBy(18));
            if (parsedCommission.lt(0) && parsedCommission.gt(100)) {
                logger_1.default.error("❌ Desired commission must be between 0 and 100.");
                process.exit(1);
            }
        }
        catch (error) {
            logger_1.default.error("❌ Provided invalid commission amount:", error);
            process.exit(1);
        }
        if (!parsedCommission.eq(nodeCommission)) {
            try {
                const tx = await this.pool.updateCommission((0, helpers_1.toEthersBN)(parsedCommission), {
                    gasLimit: await this.pool.estimateGas.updateCommission((0, helpers_1.toEthersBN)(parsedCommission)),
                    gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
                });
                logger_1.default.debug(`Updating commission. Transaction = ${tx.hash}`);
                await tx.wait();
                logger_1.default.info("💼 Successfully updated commission.");
            }
            catch (error) {
                logger_1.default.error("❌ Received an error while trying to update commission:", error);
                process.exit(1);
            }
        }
        else {
            logger_1.default.info("👌 Already set correct commission.");
        }
    }
    calculateUploaderWaitingTime() {
        const waitingTime = Math.log2(this.poolState.bundleSize) * 5;
        if (waitingTime > 30)
            return waitingTime * 1000;
        return 30 * 1000;
    }
}
exports.default = KYVE;
