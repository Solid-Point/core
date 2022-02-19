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
const client_1 = require("./utils/client");
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
        this.poolId = options.poolId;
        this.runtime = cli.runtime;
        this.version = cli.packageVersion;
        this.commission = options.commission;
        this.client = new client_1.Client(options.mnemonic);
        this.keyfile = JSON.parse((0, fs_1.readFileSync)(options.keyfile, "utf-8"));
        this.gasMultiplier = options.gasMultiplier;
        this.runMetrics = options.metrics;
        this.space = +options.space;
        this.name = (_a = options === null || options === void 0 ? void 0 : options.name) !== null && _a !== void 0 ? _a : this.generateRandomName(options.mnemonic);
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
        await this.logNodeInfo();
        this.setupMetrics();
        try {
            await this.getPool();
        }
        catch {
            process.exit(1);
        }
        // await this.setupNodeCommission();
        try {
            await this.verifyNode();
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
                utils_2.logger.info("\n⚡️ Starting new proposal");
                const address = await this.client.getAddress();
                try {
                    await this.getPool(false);
                }
                catch {
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                const createdAt = this.pool.bundleProposal.createdAt;
                if (this.pool.paused) {
                    utils_2.logger.info("💤  Pool is paused. Waiting ...");
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                try {
                    await this.verifyNode(false);
                }
                catch {
                    await (0, helpers_1.sleep)(60 * 1000);
                    continue;
                }
                await this.clearFinalizedData();
                if (this.pool.bundleProposal.nextUploader === address) {
                    utils_2.logger.info("📚 Selected as UPLOADER");
                }
                else {
                    utils_2.logger.info("🧐 Selected as VALIDATOR");
                }
                if (this.pool.bundleProposal.uploader &&
                    this.pool.bundleProposal.uploader !== address) {
                    const { data: canVote } = await axios_1.default.get(`${this.client.endpoints.rest}/kyve/registry/can_vote/${this.poolId}/${await this.client.getAddress()}?bundleId=${this.pool.bundleProposal.bundleId}`);
                    if (canVote.possible) {
                        await this.validateProposal();
                        await this.getPool(false);
                    }
                    else {
                        utils_2.logger.debug(`Can not vote this round: Reason: ${canVote.reason}`);
                    }
                }
                if (!this.pool.bundleProposal.nextUploader) {
                    await this.claimUploaderRole();
                    await this.getPool(false);
                }
                if (this.pool.bundleProposal.nextUploader === address) {
                    utils_2.logger.debug("Waiting for proposal quorum ...");
                }
                while (true) {
                    await this.getPool(false);
                    if (this.pool.bundleProposal.nextUploader === address) {
                        const { data: canPropose } = await axios_1.default.get(`${this.client.endpoints.rest}/kyve/registry/can_propose/${this.poolId}/${await this.client.getAddress()}`);
                        if (canPropose.possible) {
                            // if upload fails try again & refetch bundleProposal
                            await this.uploadBundleToArweave();
                            break;
                        }
                        else {
                            utils_2.logger.debug(`Can not propose: ${canPropose.reason}. Retrying in 10s ...`);
                            await (0, helpers_1.sleep)(10 * 1000);
                        }
                    }
                    else {
                        await this.nextBundleProposal(createdAt);
                        break;
                    }
                }
            }
        }
        catch (error) {
            utils_2.logger.error(`❌ Runtime error. Exiting ...`);
            // logger.debug(error);
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
                    workerHeight = parseInt(this.pool.heightArchived);
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
    async createBundle() {
        utils_2.logger.error(`❌ "createBundle" not implemented. Exiting ...`);
        process.exit(1);
    }
    async loadBundle() {
        utils_2.logger.error(`❌ "loadBundle" not implemented. Exiting ...`);
        process.exit(1);
    }
    async clearFinalizedData() {
        let tail;
        try {
            tail = parseInt(await this.db.get("tail"));
        }
        catch {
            tail = parseInt(this.pool.heightArchived);
        }
        for (let key = tail; key < parseInt(this.pool.heightArchived); key++) {
            await this.db.del(key);
        }
        await this.db.put("tail", parseInt(this.pool.heightArchived));
    }
    async validateProposal() {
        utils_2.logger.info(`🔬 Validating bundle ${this.pool.bundleProposal.bundleId}`);
        utils_2.logger.debug(`Downloading bundle from Arweave ...`);
        let uploadBundle;
        let downloadBundle;
        while (true) {
            downloadBundle = await this.downloadBundleFromArweave();
            if (downloadBundle) {
                utils_2.logger.debug(`Loading local bundle from ${this.pool.bundleProposal.fromHeight} to ${this.pool.bundleProposal.toHeight} ...`);
                uploadBundle = (0, zlib_1.gzipSync)(await this.loadBundle());
                await this.vote({
                    transaction: this.pool.bundleProposal.bundleId,
                    valid: await this.validate(uploadBundle, +this.pool.bundleProposal.byteSize, downloadBundle, +downloadBundle.byteLength),
                });
                break;
            }
            else {
                utils_2.logger.error(`❌ Error fetching bundle from Arweave. Retrying in 30s ...`);
                await (0, helpers_1.sleep)(30 * 1000);
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
    async downloadBundleFromArweave() {
        try {
            const { status } = await this.arweave.transactions.getStatus(this.pool.bundleProposal.bundleId);
            if (status === 200 || status === 202) {
                const { data: downloadBundle } = await axios_1.default.get(`https://arweave.net/${this.pool.bundleProposal.bundleId}`, { responseType: "arraybuffer" });
                return downloadBundle;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async uploadBundleToArweave() {
        try {
            utils_2.logger.info("📦 Creating new bundle proposal");
            const uploadBundle = await this.createBundle();
            utils_2.logger.debug("Uploading bundle to Arweave ...");
            const transaction = await this.arweave.createTransaction({
                data: (0, zlib_1.gzipSync)(uploadBundle.bundle),
            });
            utils_2.logger.debug(`Bundle details = bytes: ${transaction.data_size}, items: ${uploadBundle.toHeight - uploadBundle.fromHeight}`);
            transaction.addTag("Application", "KYVE - Testnet");
            transaction.addTag("Pool", this.poolId.toString());
            transaction.addTag("@kyve/core", package_json_1.version);
            transaction.addTag(this.runtime, this.version);
            transaction.addTag("Uploader", this.pool.bundleProposal.nextUploader);
            transaction.addTag("FromHeight", uploadBundle.fromHeight.toString());
            transaction.addTag("ToHeight", uploadBundle.toHeight.toString());
            transaction.addTag("Content-Type", "application/gzip");
            await this.arweave.transactions.sign(transaction, this.keyfile);
            const balance = await this.arweave.wallets.getBalance(await this.arweave.wallets.getAddress(this.keyfile));
            if (+transaction.reward > +balance) {
                utils_2.logger.error("❌ You do not have enough funds in your Arweave wallet.");
                process.exit(1);
            }
            await this.arweave.transactions.post(transaction);
            const tx = await this.client.sendMessage({
                typeUrl: "/KYVENetwork.kyve.registry.MsgSubmitBundleProposal",
                value: {
                    creator: await this.client.getAddress(),
                    id: this.poolId,
                    bundleId: transaction.id,
                    byteSize: +transaction.data_size,
                    bundleSize: uploadBundle.toHeight - uploadBundle.fromHeight,
                },
            });
            utils_2.logger.debug(`Arweave Transaction ${transaction.id} ...`);
            utils_2.logger.debug(`Transaction = ${tx.transactionHash}`);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to upload bundle to Arweave. Skipping upload ...");
            utils_2.logger.debug(error);
        }
    }
    async claimUploaderRole() {
        try {
            utils_2.logger.info("🔍 Claiming uploader role ...");
            const tx = await this.client.sendMessage({
                typeUrl: "/KYVENetwork.kyve.registry.MsgClaimUploaderRole",
                value: {
                    creator: await this.client.getAddress(),
                    id: this.poolId,
                },
            });
            utils_2.logger.debug(`Transaction = ${tx.transactionHash}`);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while to claim uploader role. Skipping ...");
            utils_2.logger.debug(error);
        }
    }
    async nextBundleProposal(createdAt) {
        return new Promise(async (resolve) => {
            utils_2.logger.debug("Waiting for new proposal ...");
            while (true) {
                await this.getPool(false);
                if (+this.pool.bundleProposal.createdAt > +createdAt) {
                    break;
                }
                else {
                    await (0, helpers_1.sleep)(2 * 1000); // sleep 2 secs
                }
            }
            resolve();
        });
    }
    async vote(vote) {
        utils_2.logger.info(`🖋  Voting ${vote.valid ? "valid" : "invalid"} on bundle ${vote.transaction} ...`);
        try {
            const tx = await this.client.sendMessage({
                typeUrl: "/KYVENetwork.kyve.registry.MsgVoteProposal",
                value: {
                    creator: await this.client.getAddress(),
                    id: this.poolId,
                    bundleId: vote.transaction,
                    support: vote.valid,
                },
            });
            utils_2.logger.debug(`Transaction = ${tx.transactionHash}`);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to vote. Skipping ...");
            utils_2.logger.debug(error);
        }
    }
    async logNodeInfo() {
        const formatInfoLogs = (input) => {
            const length = Math.max(13, this.runtime.length);
            return input.padEnd(length, " ");
        };
        utils_2.logger.info(`🚀 Starting node ...\n\t${formatInfoLogs("Node name")} = ${this.name}\n\t${formatInfoLogs("Address")} = ${await this.client.getAddress()}\n\t${formatInfoLogs("Pool Id")} = ${this.poolId}\n\t${formatInfoLogs("@kyve/core")} = v${package_json_1.version}\n\t${formatInfoLogs(this.runtime)} = v${this.version}`);
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
    async getPool(logs = true) {
        var _a, _b;
        if (logs) {
            utils_2.logger.debug("Attempting to fetch pool state.");
        }
        try {
            const { data: { Pool }, } = await axios_1.default.get(`${this.client.endpoints.rest}/kyve/registry/pool/${this.poolId}`);
            this.pool = { ...Pool };
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to fetch the pool state:");
            utils_2.logger.debug(error);
            throw new Error();
        }
        try {
            this.pool.metadata = JSON.parse(this.pool.metadata);
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying to parse the metadata:");
            utils_2.logger.debug(error);
            throw new Error();
        }
        if (((_a = this.pool.metadata) === null || _a === void 0 ? void 0 : _a.runtime) === this.runtime) {
            if (logs) {
                utils_2.logger.info(`💻 Running node on runtime ${this.runtime}.`);
            }
        }
        else {
            utils_2.logger.error("❌ Specified pool does not match the integration runtime.");
            process.exit(1);
        }
        try {
            if ((0, semver_1.satisfies)(this.version, ((_b = this.pool.metadata) === null || _b === void 0 ? void 0 : _b.versions) || this.version)) {
                if (logs) {
                    utils_2.logger.info("⏱  Pool version requirements met.");
                }
            }
            else {
                utils_2.logger.error(`❌ Running an invalid version for the specified pool. Version requirements are ${this.pool.metadata.versions}.`);
                process.exit(1);
            }
        }
        catch (error) {
            utils_2.logger.error("❌ Received an error while trying parse versions");
            utils_2.logger.debug(error);
            process.exit(1);
        }
        if (logs) {
            utils_2.logger.info("✅ Fetched pool state");
        }
    }
    async verifyNode(logs = true) {
        try {
            const isStaker = this.pool.stakers.includes(await this.client.getAddress());
            if (isStaker) {
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
    // private async setupNodeCommission() {
    //   let parsedCommission;
    //   logger.info("👥 Setting node commission ...");
    //   let nodeCommission = toBN(
    //     (await this.pool.nodeState(this.wallet.address)).commission
    //   );
    //   try {
    //     parsedCommission = new BigNumber(this.commission).multipliedBy(
    //       new BigNumber(10).exponentiatedBy(18)
    //     );
    //     if (parsedCommission.lt(0) && parsedCommission.gt(100)) {
    //       logger.error("❌ Desired commission must be between 0 and 100.");
    //       process.exit(1);
    //     }
    //   } catch (error) {
    //     logger.error("❌ Provided invalid commission amount:", error);
    //     process.exit(1);
    //   }
    //   if (!parsedCommission.eq(nodeCommission)) {
    //     try {
    //       const tx = await this.pool.updateCommission(
    //         toEthersBN(parsedCommission),
    //         {
    //           gasLimit: await this.pool.estimateGas.updateCommission(
    //             toEthersBN(parsedCommission)
    //           ),
    //           gasPrice: await getGasPrice(this.pool, this.gasMultiplier),
    //         }
    //       );
    //       logger.debug(`Updating commission. Transaction = ${tx.hash}`);
    //       await tx.wait();
    //       logger.info("💼 Successfully updated commission.");
    //     } catch (error) {
    //       logger.error(
    //         "❌ Received an error while trying to update commission:",
    //         error
    //       );
    //       process.exit(1);
    //     }
    //   } else {
    //     logger.info("👌 Already set correct commission.");
    //   }
    // }
    // TODO: move to separate file
    generateRandomName(mnemonic) {
        const r = new prando_1.default(mnemonic + this.pool);
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
