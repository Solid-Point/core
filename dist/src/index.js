"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const helpers_1 = require("./utils/helpers");
const utils_2 = require("./utils");
const package_json_1 = require("../package.json");
const object_hash_1 = __importDefault(require("object-hash"));
const http_1 = __importDefault(require("http"));
const url_1 = __importDefault(require("url"));
const prom_client_1 = __importStar(require("prom-client"));
const level_1 = __importDefault(require("level"));
const du_1 = __importDefault(require("du"));
const zlib_1 = require("zlib");
__exportStar(require("./utils"), exports);
__exportStar(require("./faces"), exports);
__exportStar(require("./utils/helpers"), exports);
prom_client_1.default.collectDefaultMetrics({
    labels: { app: "kyve-core" },
});
const metricsWorkerHeight = new prom_client_1.default.Gauge({
    name: "current_worker_height",
    help: "The current height the worker has indexed to.",
});
const metricsDbSize = new prom_client_1.default.Gauge({
    name: "current_db_size",
    help: "The size of the local database.",
});
const metricsDbUsed = new prom_client_1.default.Gauge({
    name: "current_db_used",
    help: "The database usage in percent.",
});
class KYVE {
    constructor(cli) {
        var _a;
        this.arweave = new arweave_1.default({
            host: "arweave.net",
            protocol: "https",
        });
        if (!cli) {
            cli = new utils_1.CLI(process.env.KYVE_RUNTIME, process.env.KYVE_VERSION);
        }
        cli.parse();
        const options = cli.opts();
        const provider = new ethers_1.ethers.providers.StaticJsonRpcProvider(options.endpoint || "https://rpc.testnet.moonbeam.network", {
            chainId: 1287,
            name: "moonbase-alphanet",
        });
        this.wallet = new ethers_1.Wallet(options.privateKey, provider);
        this.pool = (0, helpers_1.getPoolContract)(options.pool, this.wallet);
        this.runtime = cli.runtime;
        this.version = cli.packageVersion;
        this.stake = options.stake;
        this.commission = options.commission;
        this.keyfile =
            options.keyfile && JSON.parse((0, fs_1.readFileSync)(options.keyfile, "utf-8"));
        this.gasMultiplier = options.gasMultiplier;
        this.runMetrics = options.metrics;
        this.diskSpace = +options.space;
        this.name = (_a = options === null || options === void 0 ? void 0 : options.name) !== null && _a !== void 0 ? _a : this.generateRandomName();
        if (!(0, fs_1.existsSync)("./logs")) {
            (0, fs_1.mkdirSync)("./logs");
        }
        const logToTransport = (log) => {
            (0, fs_1.appendFileSync)(`./logs/${this.name}.txt`, JSON.stringify(log) + "\n");
        };
        utils_2.logger.setSettings({
            minLevel: options.verbose ? undefined : "info",
        });
        utils_2.logger.attachTransport({
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
        this.setupMetrics();
        await this.fetchPoolState();
        await this.setupDB();
        await this.setupNodeStake();
        await this.setupNodeCommission();
        await this.checkIfNodeIsValidator();
        this.worker();
        this.run();
    }
    async run() {
        try {
            let bundleInstructions = null;
            let bundleProposal = null;
            while (true) {
                try {
                    console.log(`Starting new round. worker = ${(await this.db.get(-1)).toString()} tail = ${(await this.db.get(-2)).toString()}`);
                }
                catch {
                    console.log(`Starting new round`);
                }
                await this.fetchPoolState(false);
                if (this.poolState.paused) {
                    utils_2.logger.info("💤  Pool is paused. Waiting ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                await this.checkIfNodeIsValidator(false);
                let tail;
                try {
                    tail = parseInt((await this.db.get(-2)).toString());
                }
                catch {
                    tail = this.poolState.height.toNumber();
                }
                for (let key = tail; key < this.poolState.height.toNumber(); key++) {
                    await this.db.del(key);
                }
                await this.db.put(-2, Buffer.from(this.poolState.height.toString()));
                bundleInstructions = await this.getBundleInstructions();
                console.log(bundleInstructions);
                const uploadBundle = await this.createBundle(bundleInstructions);
                bundleProposal = await this.getBundleProposal();
                console.log(bundleProposal);
                if (bundleProposal.uploader !== ethers_1.ethers.constants.AddressZero &&
                    bundleProposal.uploader !== this.wallet.address) {
                    if (bundleInstructions.fromHeight === bundleProposal.fromHeight) {
                        await this.validateProposal(bundleProposal, uploadBundle);
                        continue;
                    }
                }
                bundleInstructions = await this.getBundleInstructions();
                console.log(bundleInstructions);
                if (bundleInstructions.uploader === ethers_1.ethers.constants.AddressZero ||
                    bundleInstructions.uploader === this.wallet.address) {
                    utils_2.logger.debug("Selected as uploader. Waiting 60s ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    const transaction = await this.uploadBundleToArweave(uploadBundle, bundleInstructions);
                    if (transaction) {
                        await this.submitBundleProposal(transaction, uploadBundle.length);
                    }
                }
                await this.waitForNextBundleInstructions(bundleInstructions);
                bundleProposal = await this.getBundleProposal();
                console.log(bundleProposal);
                if (bundleProposal.uploader !== ethers_1.ethers.constants.AddressZero &&
                    bundleProposal.uploader !== this.wallet.address) {
                    await this.validateProposal(bundleProposal, uploadBundle);
                }
            }
        }
        catch (error) {
            utils_2.logger.error(`❌ Runtime error. Exiting ...`);
            utils_2.logger.debug(error);
        }
    }
    async worker() {
        while (true) {
            try {
                const usedDiskSpace = await (0, du_1.default)(`./db/${this.name}/`);
                const usedDiskSpacePercent = parseFloat(((usedDiskSpace * 100) / this.diskSpace).toFixed(2));
                if (usedDiskSpace > this.diskSpace) {
                    utils_2.logger.debug(`Used disk space: ${usedDiskSpacePercent}%`);
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                let workerHeight;
                try {
                    workerHeight = parseInt((await this.db.get(-1)).toString());
                }
                catch {
                    workerHeight = this.poolState.height.toNumber();
                }
                metricsWorkerHeight.set(workerHeight);
                metricsDbSize.set(usedDiskSpace);
                metricsDbUsed.set(usedDiskSpacePercent);
                const ops = await this.requestWorkerBatch(workerHeight);
                await this.db.batch([
                    ...ops,
                    {
                        type: "put",
                        key: -1,
                        value: Buffer.from((workerHeight + ops.length).toString()),
                    },
                ]);
            }
            catch (error) {
                utils_2.logger.error("❌ Error requesting data batch.");
                utils_2.logger.debug(error);
                await (0, helpers_1.sleep)(10 * 1000);
            }
        }
    }
    async requestWorkerBatch(workerHeight) {
        utils_2.logger.error(`❌ "requestWorkerBatch" not implemented. Exiting ...`);
        process.exit(1);
    }
    async createBundle(bundleInstructions) {
        utils_2.logger.error(`❌ "createBundle" not implemented. Exiting ...`);
        process.exit(1);
    }
    async validateProposal(bundleProposal, uploadBundle) {
        utils_2.logger.debug(`Validating bundle ${bundleProposal.txId} ...`);
        try {
            const { status } = await this.arweave.transactions.getStatus(bundleProposal.txId);
            if (status === 200 || status === 202) {
                const _data = (await this.arweave.transactions.getData(bundleProposal.txId, {
                    decode: true,
                }));
                const downloadBytes = _data.byteLength;
                const downloadBundle = (0, helpers_1.parseBundle)(Buffer.from((0, zlib_1.gunzipSync)(_data)));
                await this.vote({
                    transaction: bundleProposal.txId,
                    valid: await this.validate(uploadBundle, +bundleProposal.byteSize, downloadBundle, +downloadBytes),
                });
            }
        }
        catch (error) {
            utils_2.logger.error(`❌ Error fetching bundle from Arweave. Skipping vote ...`);
            utils_2.logger.debug(error);
        }
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
    async getBundleProposal() {
        const proposal = {
            ...(await this.pool.bundleProposal()),
        };
        return {
            uploader: proposal.uploader,
            txId: (0, helpers_1.fromBytes)(proposal.txId),
            byteSize: proposal.byteSize.toNumber(),
            fromHeight: proposal.fromHeight.toNumber(),
            toHeight: proposal.toHeight.toNumber(),
            start: proposal.start.toNumber(),
        };
    }
    async getBundleInstructions() {
        const instructions = {
            ...(await this.pool.bundleInstructions()),
        };
        return {
            uploader: instructions.uploader,
            fromHeight: instructions.fromHeight.toNumber(),
        };
    }
    async uploadBundleToArweave(bundle, instructions) {
        try {
            utils_2.logger.info("💾 Uploading bundle to Arweave ...");
            const transaction = await this.arweave.createTransaction({
                data: (0, zlib_1.gzipSync)((0, helpers_1.formatBundle)(bundle)),
            });
            utils_2.logger.debug(`Bundle data size = ${transaction.data_size} Bytes`);
            utils_2.logger.debug(`Bundle size = ${bundle.length}`);
            transaction.addTag("Application", "KYVE - Testnet");
            transaction.addTag("Pool", this.pool.address);
            transaction.addTag("@kyve/core", package_json_1.version);
            transaction.addTag(this.runtime, this.version);
            transaction.addTag("Uploader", instructions.uploader);
            transaction.addTag("FromHeight", instructions.fromHeight.toString());
            transaction.addTag("ToHeight", (instructions.fromHeight + bundle.length).toString());
            transaction.addTag("Content-Type", "application/gzip");
            await this.arweave.transactions.sign(transaction, this.keyfile);
            const balance = await this.arweave.wallets.getBalance(await this.arweave.wallets.getAddress(this.keyfile));
            if (+transaction.reward > +balance) {
                utils_2.logger.error("❌ You do not have enough funds in your Arweave wallet.");
                process.exit(1);
            }
            await this.arweave.transactions.post(transaction);
            return transaction;
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to upload bundle to Arweave. Skipping upload ...");
            utils_2.logger.debug(error);
            return null;
        }
    }
    async submitBundleProposal(transaction, bundleSize) {
        try {
            const tx = await this.pool.submitBundleProposal((0, helpers_1.toBytes)(transaction.id), +transaction.data_size, bundleSize, {
                gasLimit: ethers_1.ethers.BigNumber.from(1000000),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            utils_2.logger.debug(`Submitting bundle proposal ${transaction.id} ...`);
            utils_2.logger.debug(`Transaction = ${tx.hash}`);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while submitting bundle proposal. Skipping submit ...");
            utils_2.logger.debug(error);
        }
    }
    async waitForNextBundleInstructions(bundleInstructions) {
        return new Promise((resolve) => {
            utils_2.logger.debug("Waiting for next bundle instructions ...");
            const uploadTimeout = setTimeout(async () => {
                try {
                    if ((bundleInstructions === null || bundleInstructions === void 0 ? void 0 : bundleInstructions.uploader) !== this.wallet.address) {
                        utils_2.logger.debug("Reached upload timeout. Claiming uploader role ...");
                        const tx = await this.pool.claimUploaderRole({
                            gasLimit: await this.pool.estimateGas.claimUploaderRole(),
                            gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
                        });
                        utils_2.logger.debug(`Transaction = ${tx.hash}`);
                    }
                }
                catch (error) {
                    utils_2.logger.error("❌ Received an error while claiming uploader slot. Skipping claim ...");
                    utils_2.logger.debug(error);
                }
            }, this.poolState.uploadTimeout.toNumber() * 1000);
            this.pool.on("NextBundleInstructions", () => {
                clearTimeout(uploadTimeout);
                resolve();
            });
        });
    }
    async vote(vote) {
        utils_2.logger.info(`🖋  Voting ${vote.valid ? "valid" : "invalid"} on bundle ${vote.transaction} ...`);
        const canVote = await this.pool.canVote(this.wallet.address);
        if (!canVote) {
            utils_2.logger.info("⚠️  Node has no voting power because it has no delegators. Skipping vote ...");
            return;
        }
        try {
            const tx = await this.pool.vote((0, helpers_1.toBytes)(vote.transaction), vote.valid, {
                gasLimit: await this.pool.estimateGas.vote((0, helpers_1.toBytes)(vote.transaction), vote.valid),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            utils_2.logger.debug(`Transaction = ${tx.hash}`);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to vote. Skipping vote ...");
            utils_2.logger.debug(error);
        }
    }
    logNodeInfo() {
        const formatInfoLogs = (input) => {
            const length = Math.max(13, this.runtime.length);
            return input.padEnd(length, " ");
        };
        utils_2.logger.info(`🚀 Starting node ...\n\t${formatInfoLogs("Name")} = ${this.name}\n\t${formatInfoLogs("Address")} = ${this.wallet.address}\n\t${formatInfoLogs("Pool")} = ${this.pool.address}\n\t${formatInfoLogs("Desired Stake")} = ${this.stake} $KYVE\n\n\t${formatInfoLogs("@kyve/core")} = v${package_json_1.version}\n\t${formatInfoLogs(this.runtime)} = v${this.version}`);
    }
    setupMetrics() {
        if (this.runMetrics) {
            utils_2.logger.info("🔬 Starting metric server on: http://localhost:8080/metrics");
            // HTTP server which exposes the metrics on http://localhost:8080/metrics
            http_1.default
                .createServer(async (req, res) => {
                // Retrieve route from request object
                const route = url_1.default.parse(req.url).pathname;
                if (route === "/metrics") {
                    // Return all metrics the Prometheus exposition format
                    res.setHeader("Content-Type", prom_client_1.register.contentType);
                    const defaultMetrics = await prom_client_1.register.metrics();
                    const other = await KYVE.metrics.register.metrics();
                    res.end(defaultMetrics + "\n" + other);
                }
            })
                .listen(8080);
        }
    }
    async fetchPoolState(logs = true) {
        var _a, _b;
        utils_2.logger.debug("Attempting to fetch pool state.");
        try {
            this.poolState = { ...(await this.pool.pool()) };
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to fetch the pool state:", error);
            process.exit(1);
        }
        try {
            this.poolState.config = JSON.parse(this.poolState.config);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to parse the config:", error);
            process.exit(1);
        }
        try {
            this.poolState.metadata = JSON.parse(this.poolState.metadata);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to parse the metadata:", error);
            process.exit(1);
        }
        if (((_a = this.poolState.metadata) === null || _a === void 0 ? void 0 : _a.runtime) === this.runtime) {
            if (logs) {
                utils_2.logger.info(`💻 Running node on runtime ${this.runtime}.`);
            }
        }
        else {
            utils_2.logger.error("❌ Specified pool does not match the integration runtime.");
            process.exit(1);
        }
        try {
            if ((0, semver_1.satisfies)(this.version, ((_b = this.poolState.metadata) === null || _b === void 0 ? void 0 : _b.versions) || this.version)) {
                if (logs) {
                    utils_2.logger.info("⏱  Pool version requirements met.");
                }
            }
            else {
                utils_2.logger.error(`❌ Running an invalid version for the specified pool. Version requirements are ${this.poolState.metadata.versions}.`);
                process.exit(1);
            }
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying parse versions");
            utils_2.logger.debug(error);
            process.exit(1);
        }
        utils_2.logger.info("✅ Fetched pool state.");
    }
    async setupDB() {
        if (!(0, fs_1.existsSync)("./db")) {
            (0, fs_1.mkdirSync)("./db");
        }
        this.db = (0, level_1.default)(`./db/${this.name}`, {
            keyEncoding: "json",
            valueEncoding: "binary",
        });
    }
    async checkIfNodeIsValidator(logs = true) {
        try {
            const isValidator = await this.pool.isValidator(this.wallet.address);
            if (isValidator) {
                if (logs) {
                    utils_2.logger.info("🔍  Node is running as a validator.");
                }
            }
            else {
                utils_2.logger.error("❌ Node is no active validator. Exiting ...");
                process.exit(1);
            }
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to fetch validator info");
            utils_2.logger.debug(error);
            process.exit(1);
        }
    }
    async setupNodeStake() {
        let parsedStake;
        utils_2.logger.info("🌐 Joining KYVE Network ...");
        let nodeStake = (0, helpers_1.toBN)((await this.pool.nodeState(this.wallet.address)).personalStake);
        try {
            parsedStake = new bignumber_js_1.default(this.stake).multipliedBy(new bignumber_js_1.default(10).exponentiatedBy(18));
            if (parsedStake.isZero()) {
                utils_2.logger.error("❌ Desired stake can't be zero.");
                process.exit(1);
            }
        }
        catch (error) {
            utils_2.logger.error("❌ Provided invalid staking amount:", error);
            process.exit(1);
        }
        if (parsedStake.lt((0, helpers_1.toBN)(this.poolState.minStake))) {
            utils_2.logger.error(`❌ Desired stake is lower than the minimum stake. Desired Stake = ${(0, helpers_1.toHumanReadable)(parsedStake)}, Minimum Stake = ${(0, helpers_1.toHumanReadable)((0, helpers_1.toBN)(this.poolState.minStake))}`);
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
            utils_2.logger.info("👌 Already staked with the correct amount.");
        }
    }
    async selfStake(amount) {
        const token = await (0, helpers_1.getTokenContract)(this.pool);
        let tx;
        const balance = (0, helpers_1.toBN)((await token.balanceOf(this.wallet.address)));
        if (balance.lt(amount)) {
            utils_2.logger.error("❌ Supplied wallet does not have enough $KYVE to stake.");
            process.exit(1);
        }
        try {
            tx = await token.approve(this.pool.address, (0, helpers_1.toEthersBN)(amount), {
                gasLimit: await token.estimateGas.approve(this.pool.address, (0, helpers_1.toEthersBN)(amount)),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            utils_2.logger.debug(`Approving ${(0, helpers_1.toHumanReadable)(amount)} $KYVE to be spent. Transaction = ${tx.hash}`);
            await tx.wait();
            utils_2.logger.info("👍 Successfully approved.");
            tx = await this.pool.stake((0, helpers_1.toEthersBN)(amount), {
                gasLimit: await this.pool.estimateGas.stake((0, helpers_1.toEthersBN)(amount)),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            utils_2.logger.debug(`Staking ${(0, helpers_1.toHumanReadable)(amount)} $KYVE. Transaction = ${tx.hash}`);
            await tx.wait();
            utils_2.logger.info("📈 Successfully staked.");
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to stake:", error);
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
            utils_2.logger.debug(`Unstaking. Transaction = ${tx.hash}`);
            await tx.wait();
            utils_2.logger.info("📉 Successfully unstaked.");
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to unstake:", error);
            process.exit(1);
        }
    }
    async setupNodeCommission() {
        let parsedCommission;
        utils_2.logger.info("👥 Setting node commission ...");
        let nodeCommission = (0, helpers_1.toBN)((await this.pool.nodeState(this.wallet.address)).commission);
        try {
            parsedCommission = new bignumber_js_1.default(this.commission).multipliedBy(new bignumber_js_1.default(10).exponentiatedBy(18));
            if (parsedCommission.lt(0) && parsedCommission.gt(100)) {
                utils_2.logger.error("❌ Desired commission must be between 0 and 100.");
                process.exit(1);
            }
        }
        catch (error) {
            utils_2.logger.error("❌ Provided invalid commission amount:", error);
            process.exit(1);
        }
        if (!parsedCommission.eq(nodeCommission)) {
            try {
                const tx = await this.pool.updateCommission((0, helpers_1.toEthersBN)(parsedCommission), {
                    gasLimit: await this.pool.estimateGas.updateCommission((0, helpers_1.toEthersBN)(parsedCommission)),
                    gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
                });
                utils_2.logger.debug(`Updating commission. Transaction = ${tx.hash}`);
                await tx.wait();
                utils_2.logger.info("💼 Successfully updated commission.");
            }
            catch (error) {
                utils_2.logger.error("❌ Received an error while trying to update commission:", error);
                process.exit(1);
            }
        }
        else {
            utils_2.logger.info("👌 Already set correct commission.");
        }
    }
    // TODO: move to separate file
    generateRandomName() {
        const r = new prando_1.default(this.wallet.address + this.pool.address);
        return (0, unique_names_generator_1.uniqueNamesGenerator)({
            dictionaries: [unique_names_generator_1.adjectives, unique_names_generator_1.colors, unique_names_generator_1.animals],
            separator: "-",
            length: 3,
            style: "lowerCase",
            seed: r.nextInt(0, unique_names_generator_1.adjectives.length * unique_names_generator_1.colors.length * unique_names_generator_1.animals.length),
        }).replace(" ", "-");
    }
}
KYVE.metrics = prom_client_1.default;
exports.default = KYVE;
