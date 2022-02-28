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
const database_1 = require("./utils/database");
const du_1 = __importDefault(require("du"));
const zlib_1 = require("zlib");
const axios_1 = __importDefault(require("axios"));
__exportStar(require("./utils"), exports);
__exportStar(require("./faces"), exports);
__exportStar(require("./utils/helpers"), exports);
__exportStar(require("./utils/database"), exports);
__exportStar(require("./utils/progress"), exports);
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
        const provider = new ethers_1.ethers.providers.StaticJsonRpcProvider("https://rpc.api.moonbase.moonbeam.network", {
            chainId: 1287,
            name: "Moonbase Alpha",
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
        this.space = +options.space;
        this.name = (_a = options === null || options === void 0 ? void 0 : options.name) !== null && _a !== void 0 ? _a : this.generateRandomName();
        this.db = new database_1.Database(this.name);
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
        try {
            await this.fetchPoolState();
        }
        catch {
            process.exit(1);
        }
        await this.setupNodeStake();
        await this.setupNodeCommission();
        try {
            await this.checkIfNodeIsValidator();
        }
        catch {
            process.exit(1);
        }
        this.worker();
        this.run();
    }
    async run() {
        try {
            while (true) {
                console.log("");
                utils_2.logger.info("⚡️ Starting new proposal");
                let bundleProposal;
                let bundleInstructions;
                try {
                    await this.fetchPoolState(false);
                }
                catch {
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                if (this.poolState.paused) {
                    utils_2.logger.info("💤  Pool is paused. Waiting ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                try {
                    await this.checkIfNodeIsValidator(false);
                }
                catch {
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                await this.clearFinalizedData();
                bundleProposal = await this.getBundleProposal();
                bundleInstructions = await this.getBundleInstructions();
                if (bundleInstructions.uploader === this.wallet.address) {
                    utils_2.logger.info("📚 Selected as UPLOADER");
                }
                else {
                    utils_2.logger.info("🧐 Selected as VALIDATOR");
                }
                if (bundleProposal.uploader !== helpers_1.ADDRESS_ZERO &&
                    bundleProposal.uploader !== this.wallet.address) {
                    if (await this.pool.canVote()) {
                        await this.validateProposal(bundleProposal);
                        bundleProposal = await this.getBundleProposal();
                        bundleInstructions = await this.getBundleInstructions();
                    }
                    else {
                        utils_2.logger.debug("Can not vote this round. Skipping ...");
                    }
                }
                if (bundleInstructions.uploader === helpers_1.ADDRESS_ZERO) {
                    await this.claimUploaderRole();
                    bundleProposal = await this.getBundleProposal();
                    bundleInstructions = await this.getBundleInstructions();
                }
                if (bundleInstructions.uploader === this.wallet.address) {
                    utils_2.logger.debug("Waiting for proposal quorum ...");
                }
                while (true) {
                    bundleProposal = await this.getBundleProposal();
                    bundleInstructions = await this.getBundleInstructions();
                    if (bundleInstructions.uploader === this.wallet.address) {
                        if (await this.pool.canPropose()) {
                            // if upload fails try again & refetch bundleInstructions
                            await this.uploadBundleToArweave(bundleProposal, bundleInstructions);
                            break;
                        }
                        else {
                            await (0, helpers_1.sleep)(10 * 1000);
                        }
                    }
                    else {
                        break;
                    }
                }
                await this.nextBundleInstructions(bundleInstructions);
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
                let workerHeight;
                try {
                    workerHeight = parseInt(await this.db.get("head"));
                }
                catch {
                    workerHeight = this.poolState.height.toNumber();
                }
                const usedDiskSpace = await (0, du_1.default)(`./db/${this.name}/`);
                const usedDiskSpacePercent = parseFloat(((usedDiskSpace * 100) / this.space).toFixed(2));
                metricsWorkerHeight.set(workerHeight);
                metricsDbSize.set(usedDiskSpace);
                metricsDbUsed.set(usedDiskSpacePercent);
                if (usedDiskSpace > this.space) {
                    utils_2.logger.debug(`Used disk space: ${usedDiskSpacePercent}%`);
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                const ops = await this.requestWorkerBatch(workerHeight);
                for (let op of ops) {
                    await this.db.put(op.key, op.value);
                }
                await this.db.put("head", workerHeight + ops.length);
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
    async loadBundle(bundleProposal) {
        utils_2.logger.error(`❌ "loadBundle" not implemented. Exiting ...`);
        process.exit(1);
    }
    async clearFinalizedData() {
        let tail;
        try {
            tail = parseInt(await this.db.get("tail"));
        }
        catch {
            tail = this.poolState.height.toNumber();
        }
        for (let key = tail; key < this.poolState.height.toNumber(); key++) {
            await this.db.del(key);
        }
        await this.db.put("tail", this.poolState.height.toNumber());
    }
    async validateProposal(bundleProposal) {
        utils_2.logger.info(`🔬 Validating bundle ${bundleProposal.txId}`);
        utils_2.logger.debug(`Downloading bundle from Arweave ...`);
        let uploadBundle;
        let downloadBundle;
        let tries = 0;
        while (tries < 10) {
            downloadBundle = await this.downloadBundleFromArweave(bundleProposal);
            if (downloadBundle) {
                utils_2.logger.debug(`Loading local bundle from ${bundleProposal.fromHeight} to ${bundleProposal.toHeight} ...`);
                uploadBundle = (0, zlib_1.gzipSync)(await this.loadBundle(bundleProposal));
                await this.vote({
                    transaction: bundleProposal.txId,
                    valid: await this.validate(uploadBundle, +bundleProposal.byteSize, downloadBundle, +downloadBundle.byteLength),
                });
                break;
            }
            else {
                utils_2.logger.error(`❌ Error fetching bundle from Arweave. Retrying in 30s ...`);
                await (0, helpers_1.sleep)(30 * 1000);
                tries++;
                break;
            }
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
            parentTxId: (0, helpers_1.fromBytes)(proposal.parentTxId),
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
    async downloadBundleFromArweave(bundleProposal) {
        try {
            const { status } = await this.arweave.transactions.getStatus(bundleProposal.txId);
            if (status === 200 || status === 202) {
                const { data: downloadBundle } = await axios_1.default.get(`https://arweave.net/${bundleProposal.txId}`, { responseType: "arraybuffer" });
                return downloadBundle;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async uploadBundleToArweave(bundleProposal, bundleInstructions) {
        try {
            utils_2.logger.info("📦 Creating new bundle proposal");
            const uploadBundle = await this.createBundle(bundleInstructions);
            utils_2.logger.debug("Uploading bundle to Arweave ...");
            const transaction = await this.arweave.createTransaction({
                data: (0, zlib_1.gzipSync)(uploadBundle.bundle),
            });
            utils_2.logger.debug(`Bundle details = bytes: ${transaction.data_size}, items: ${uploadBundle.toHeight - uploadBundle.fromHeight}`);
            transaction.addTag("Application", "KYVE - Testnet");
            transaction.addTag("Pool", this.pool.address);
            transaction.addTag("@kyve/core", package_json_1.version);
            transaction.addTag(this.runtime, this.version);
            transaction.addTag("Uploader", bundleInstructions.uploader);
            transaction.addTag("FromHeight", uploadBundle.fromHeight.toString());
            transaction.addTag("ToHeight", uploadBundle.toHeight.toString());
            transaction.addTag("Content-Type", "application/gzip");
            if (bundleProposal.uploader === helpers_1.ADDRESS_ZERO) {
                transaction.addTag("Parent", bundleProposal.parentTxId);
            }
            else {
                transaction.addTag("Parent", bundleProposal.txId);
            }
            await this.arweave.transactions.sign(transaction, this.keyfile);
            const balance = await this.arweave.wallets.getBalance(await this.arweave.wallets.getAddress(this.keyfile));
            if (+transaction.reward > +balance) {
                utils_2.logger.error("❌ You do not have enough funds in your Arweave wallet.");
                process.exit(1);
            }
            await this.arweave.transactions.post(transaction);
            const tx = await this.pool.submitBundleProposal((0, helpers_1.toBytes)(transaction.id), +transaction.data_size, uploadBundle.toHeight - uploadBundle.fromHeight, {
                gasLimit: ethers_1.ethers.BigNumber.from(1000000),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            utils_2.logger.debug(`Arweave Transaction ${transaction.id} ...`);
            utils_2.logger.debug(`Transaction = ${tx.hash}`);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to upload bundle to Arweave. Skipping upload ...");
            utils_2.logger.debug(error);
        }
    }
    async claimUploaderRole() {
        try {
            utils_2.logger.info("🔍 Claiming uploader role ...");
            const tx = await this.pool.claimUploaderRole();
            utils_2.logger.debug(`Transaction = ${tx.hash}`);
            await tx.wait();
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while to claim uploader role. Skipping ...");
            utils_2.logger.debug(error);
        }
    }
    async nextBundleInstructions(bundleInstructions) {
        return new Promise((resolve) => {
            utils_2.logger.debug("Waiting for new proposal ...");
            const uploadTimeout = setInterval(async () => {
                try {
                    if (bundleInstructions.uploader !== this.wallet.address) {
                        if (await this.pool.canClaim()) {
                            await this.claimUploaderRole();
                        }
                    }
                }
                catch (error) {
                    utils_2.logger.error("❌ Received an error while claiming uploader role. Skipping claim ...");
                    utils_2.logger.debug(error);
                }
            }, 10 * 1000);
            this.pool.on("NextBundleInstructions", () => {
                clearInterval(uploadTimeout);
                resolve();
            });
        });
    }
    async vote(vote) {
        utils_2.logger.info(`🖋  Voting ${vote.valid ? "valid" : "invalid"} on bundle ${vote.transaction} ...`);
        try {
            const tx = await this.pool.vote((0, helpers_1.toBytes)(vote.transaction), vote.valid, {
                gasLimit: await this.pool.estimateGas.vote((0, helpers_1.toBytes)(vote.transaction), vote.valid),
                gasPrice: await (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier),
            });
            utils_2.logger.debug(`Transaction = ${tx.hash}`);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to vote. Skipping ...");
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
        if (logs) {
            utils_2.logger.debug("Attempting to fetch pool state.");
        }
        try {
            this.poolState = { ...(await this.pool.pool()) };
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to fetch the pool state:");
            utils_2.logger.debug(error);
            throw new Error();
        }
        try {
            this.poolState.config = JSON.parse(this.poolState.config);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to parse the config:");
            utils_2.logger.debug(error);
            throw new Error();
        }
        try {
            this.poolState.metadata = JSON.parse(this.poolState.metadata);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to parse the metadata:");
            utils_2.logger.debug(error);
            throw new Error();
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
        if (logs) {
            utils_2.logger.info("✅ Fetched pool state.");
        }
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
            throw new Error();
        }
    }
    async setupNodeStake() {
        let parsedStake;
        utils_2.logger.info("🌐 Joining KYVE Network ...");
        let nodeStake = (0, helpers_1.toBN)((await this.pool.node(this.wallet.address)).personalStake);
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
        let nodeCommission = (0, helpers_1.toBN)((await this.pool.node(this.wallet.address)).commission);
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
