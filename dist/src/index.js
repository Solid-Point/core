"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var arweave_1 = __importDefault(require("arweave"));
var ethers_1 = require("ethers");
var fs_1 = require("fs");
var prando_1 = __importDefault(require("prando"));
var rxjs_1 = require("rxjs");
var semver_1 = require("semver");
var unique_names_generator_1 = require("unique-names-generator");
var arweave_2 = require("./utils/arweave");
var logger_1 = __importDefault(require("./utils/logger"));
var helpers_1 = require("./utils/helpers");
var node_json_1 = __importDefault(require("./abi/node.json"));
var package_json_1 = require("../package.json");
var bignumber_js_1 = __importDefault(require("bignumber.js"));
var KYVE = /** @class */ (function () {
    function KYVE(poolAddress, runtime, version, stakeAmount, privateKey, keyfile, name, endpoint, gasMultiplier) {
        var _this = this;
        if (gasMultiplier === void 0) { gasMultiplier = "1"; }
        this.buffer = [];
        this.client = new arweave_1["default"]({
            host: "arweave.net",
            protocol: "https"
        });
        this.wallet = new ethers_1.Wallet(privateKey, new ethers_1.ethers.providers.StaticJsonRpcProvider(endpoint || "https://moonbeam-alpha.api.onfinality.io/public", {
            chainId: 1287,
            name: "moonbase-alphanet"
        }));
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
            var r = new prando_1["default"](this.wallet.address + this.pool.address);
            this.name = (0, unique_names_generator_1.uniqueNamesGenerator)({
                dictionaries: [unique_names_generator_1.adjectives, unique_names_generator_1.starWars],
                separator: "-",
                length: 2,
                style: "lowerCase",
                seed: r.nextInt(0, unique_names_generator_1.adjectives.length * unique_names_generator_1.starWars.length)
            }).replace(" ", "-");
        }
        if (!(0, fs_1.existsSync)("./logs")) {
            (0, fs_1.mkdirSync)("./logs");
        }
        var logToTransport = function (log) {
            (0, fs_1.appendFileSync)("./logs/" + _this.name + ".txt", JSON.stringify(log) + "\n");
        };
        logger_1["default"].attachTransport({
            silly: logToTransport,
            debug: logToTransport,
            trace: logToTransport,
            info: logToTransport,
            warn: logToTransport,
            error: logToTransport,
            fatal: logToTransport
        });
    }
    KYVE.prototype.run = function (uploadFunction, validateFunction) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.logNodeInfo();
                        return [4 /*yield*/, this.fetchPoolState()];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, this.checkVersionRequirements()];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, this.checkRuntimeRequirements()];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, this.setupNodeContract()];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, this.setupListeners()];
                    case 5:
                        _b.sent();
                        if (!(((_a = this.node) === null || _a === void 0 ? void 0 : _a.address) === this.settings.uploader)) return [3 /*break*/, 9];
                        if (!this.keyfile) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.pool.paused()];
                    case 6:
                        if (_b.sent()) {
                            logger_1["default"].warn("⚠️  Pool is paused. Exiting ...");
                            process.exit();
                        }
                        else {
                            logger_1["default"].info("📚 Running as an uploader ...");
                            this.uploader(uploadFunction, this.config);
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        logger_1["default"].error("❌ You need to specify your Arweave keyfile.");
                        process.exit(1);
                        _b.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        logger_1["default"].info("🧐 Running as an validator ...");
                        this.validator(validateFunction, this.config);
                        _b.label = 10;
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.uploader = function (uploadFunction, config) {
        return __awaiter(this, void 0, void 0, function () {
            var uploaderLogger, node;
            var _this = this;
            return __generator(this, function (_a) {
                uploaderLogger = logger_1["default"].getChildLogger({
                    name: "Uploader"
                });
                node = new rxjs_1.Observable(function (subscriber) {
                    uploadFunction(subscriber, config, uploaderLogger);
                });
                node.subscribe(function (item) { return __awaiter(_this, void 0, void 0, function () {
                    var i, tempBuffer, transaction, balance, _a, _b, registerTransaction, _c, _d, _e, error_1;
                    var _f;
                    return __generator(this, function (_g) {
                        switch (_g.label) {
                            case 0:
                                i = this.buffer.push(item);
                                uploaderLogger.debug("Received a new data item (" + i + " / " + this.metadata.bundleSize + ").");
                                if (!(this.buffer.length >= this.metadata.bundleSize)) return [3 /*break*/, 10];
                                uploaderLogger.info("📦 Creating bundle ...");
                                tempBuffer = this.buffer;
                                this.buffer = [];
                                // Upload buffer to Arweave.
                                uploaderLogger.debug("Uploading bundle to Arweave.");
                                return [4 /*yield*/, this.client.createTransaction({
                                        data: JSON.stringify(tempBuffer)
                                    })];
                            case 1:
                                transaction = _g.sent();
                                transaction.addTag("Application", "KYVE - Testnet");
                                transaction.addTag("Pool", this.pool.address);
                                transaction.addTag("@kyve/core", package_json_1.version);
                                transaction.addTag(this.runtime, this.version);
                                transaction.addTag("Bundle-Size", this.metadata.bundleSize);
                                transaction.addTag("Content-Type", "application/json");
                                return [4 /*yield*/, this.client.transactions.sign(transaction, this.keyfile)];
                            case 2:
                                _g.sent();
                                _b = (_a = this.client.wallets).getBalance;
                                return [4 /*yield*/, this.client.wallets.getAddress(this.keyfile)];
                            case 3: return [4 /*yield*/, _b.apply(_a, [_g.sent()])];
                            case 4:
                                balance = _g.sent();
                                if (+transaction.reward > +balance) {
                                    uploaderLogger.error("❌ You do not have enough funds in your Arweave wallet.");
                                    process.exit();
                                }
                                return [4 /*yield*/, this.client.transactions.post(transaction)];
                            case 5:
                                _g.sent();
                                uploaderLogger.info("\uD83D\uDCBE Uploaded bundle to Arweave. Transaction = " + transaction.id);
                                // Create a new vote.
                                uploaderLogger.debug("Attempting to register a bundle.");
                                _g.label = 6;
                            case 6:
                                _g.trys.push([6, 9, , 10]);
                                _d = (_c = this.pool).register;
                                _e = [(0, arweave_2.toBytes)(transaction.id),
                                    +transaction.data_size];
                                _f = {
                                    gasLimit: 10000000
                                };
                                return [4 /*yield*/, (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier)];
                            case 7: return [4 /*yield*/, _d.apply(_c, _e.concat([(_f.gasPrice = _g.sent(),
                                        _f)]))];
                            case 8:
                                registerTransaction = (_g.sent());
                                uploaderLogger.info("\u2B06\uFE0F  Creating a new proposal. Transaction = " + registerTransaction.hash);
                                return [3 /*break*/, 10];
                            case 9:
                                error_1 = _g.sent();
                                uploaderLogger.error("❌ Received an error while trying to register a bundle:", error_1);
                                process.exit(1);
                                return [3 /*break*/, 10];
                            case 10: return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        });
    };
    KYVE.prototype.listener = function () {
        return __awaiter(this, void 0, void 0, function () {
            var listenerLogger;
            var _this = this;
            return __generator(this, function (_a) {
                listenerLogger = logger_1["default"].getChildLogger({
                    name: "Listener"
                });
                return [2 /*return*/, new rxjs_1.Observable(function (subscriber) {
                        _this.pool.on("ProposalStart", function (_transactionIndexed, _transaction, _bytes) { return __awaiter(_this, void 0, void 0, function () {
                            var transaction, isValidator, res, _data, bytes, bundle;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        transaction = (0, arweave_2.fromBytes)(_transaction);
                                        listenerLogger.info("\u2B07\uFE0F  Received a new proposal. Bundle = " + transaction);
                                        return [4 /*yield*/, this.pool.isValidator((_a = this.node) === null || _a === void 0 ? void 0 : _a.address)];
                                    case 1:
                                        isValidator = _b.sent();
                                        if (!isValidator) return [3 /*break*/, 6];
                                        return [4 /*yield*/, this.client.transactions.getStatus(transaction)];
                                    case 2:
                                        res = _b.sent();
                                        if (!(res.status === 200 || res.status === 202)) return [3 /*break*/, 4];
                                        return [4 /*yield*/, this.client.transactions.getData(transaction, {
                                                decode: true
                                            })];
                                    case 3:
                                        _data = (_b.sent());
                                        bytes = _data.byteLength;
                                        bundle = JSON.parse(new TextDecoder("utf-8", {
                                            fatal: true
                                        }).decode(_data));
                                        if (+_bytes === +bytes) {
                                            listenerLogger.debug("Bytes match, forwarding bundle to the validate function.");
                                            subscriber.next({
                                                transaction: transaction,
                                                bundle: bundle
                                            });
                                        }
                                        else {
                                            listenerLogger.debug("Bytes don't match (" + _bytes + " vs " + bytes + ").");
                                            this.vote({
                                                transaction: transaction,
                                                valid: false
                                            });
                                        }
                                        return [3 /*break*/, 5];
                                    case 4:
                                        listenerLogger.error("❌ Error fetching bundle from Arweave.");
                                        _b.label = 5;
                                    case 5: return [3 /*break*/, 7];
                                    case 6:
                                        logger_1["default"].warn("⚠️  Stake not high enough to participate as validator. Skipping proposal ...");
                                        _b.label = 7;
                                    case 7: return [2 /*return*/];
                                }
                            });
                        }); });
                    })];
            });
        });
    };
    KYVE.prototype.validator = function (validateFunction, config) {
        return __awaiter(this, void 0, void 0, function () {
            var validatorLogger, listener, node;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        validatorLogger = logger_1["default"].getChildLogger({
                            name: "Validator"
                        });
                        return [4 /*yield*/, this.listener()];
                    case 1:
                        listener = _a.sent();
                        node = new rxjs_1.Observable(function (subscriber) {
                            validateFunction(listener, subscriber, config, validatorLogger);
                        });
                        node.subscribe(function (item) { return _this.vote(item); });
                        return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.vote = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var voteLogger, _a, _b, _c, error_2;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        voteLogger = logger_1["default"].getChildLogger({
                            name: "Vote"
                        });
                        voteLogger.info("\uD83D\uDDF3  Voting \"" + (input.valid ? "valid" : "invalid") + "\" on bundle " + input.transaction + ".");
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 5, , 6]);
                        _b = (_a = this.pool).vote;
                        _c = [(0, arweave_2.toBytes)(input.transaction), input.valid];
                        _d = {};
                        return [4 /*yield*/, this.pool.estimateGas.vote((0, arweave_2.toBytes)(input.transaction), input.valid)];
                    case 2:
                        _d.gasLimit = _e.sent();
                        return [4 /*yield*/, (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier)];
                    case 3: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.gasPrice = _e.sent(),
                                _d)]))];
                    case 4:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _e.sent();
                        voteLogger.error("❌ Received an error while trying to vote:", error_2);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.logNodeInfo = function () {
        var _this = this;
        var formatInfoLogs = function (input) {
            var length = Math.max(13, _this.runtime.length);
            return input.padEnd(length, " ");
        };
        logger_1["default"].info("\uD83D\uDE80 Starting node ...\n\t" + formatInfoLogs("Name") + " = " + this.name + "\n\t" + formatInfoLogs("Address") + " = " + this.wallet.address + "\n\t" + formatInfoLogs("Pool") + " = " + this.pool.address + "\n\t" + formatInfoLogs("Desired Stake") + " = " + this.stake + " $KYVE\n\n\t" + formatInfoLogs("@kyve/core") + " = v" + package_json_1.version + "\n\t" + formatInfoLogs(this.runtime) + " = v" + this.version);
    };
    KYVE.prototype.setupListeners = function () {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var payoutLogger, pointsLogger, slashLogger;
            var _this = this;
            return __generator(this, function (_d) {
                // Listen to new contract changes.
                this.pool.on("ConfigChanged", function () {
                    logger_1["default"].warn("⚠️  Config changed. Exiting ...");
                    process.exit();
                });
                this.pool.on("MetadataChanged", function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.fetchPoolState()];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                this.pool.on("Paused", function () {
                    var _a;
                    if (((_a = _this.node) === null || _a === void 0 ? void 0 : _a.address) === _this.settings.uploader) {
                        logger_1["default"].warn("⚠️  Pool is now paused. Exiting ...");
                        process.exit();
                    }
                });
                this.pool.on("UploaderChanged", function (previous) {
                    var _a;
                    if (((_a = _this.node) === null || _a === void 0 ? void 0 : _a.address) === previous) {
                        logger_1["default"].warn("⚠️  Uploader changed. Exiting ...");
                        process.exit();
                    }
                });
                payoutLogger = logger_1["default"].getChildLogger({
                    name: "Payout"
                });
                this.pool.on(this.pool.filters.Payout((_a = this.node) === null || _a === void 0 ? void 0 : _a.address), function (_, __, _amount, _transaction) {
                    var transaction = (0, arweave_2.fromBytes)(_transaction);
                    payoutLogger.info("\uD83D\uDCB8 Received a reward of " + (0, helpers_1.toHumanReadable)((0, helpers_1.toBN)(_amount)) + " $KYVE. Bundle = " + transaction);
                });
                pointsLogger = logger_1["default"].getChildLogger({
                    name: "Points"
                });
                this.pool.on(this.pool.filters.IncreasePoints((_b = this.node) === null || _b === void 0 ? void 0 : _b.address), function (_, __, _points, _transaction) {
                    var transaction = (0, arweave_2.fromBytes)(_transaction);
                    pointsLogger.warn("\u26A0\uFE0F  Received a new slashing point (" + _points.toString() + " / " + _this.settings.slashThreshold + "). Bundle = " + transaction);
                });
                slashLogger = logger_1["default"].getChildLogger({
                    name: "Slash"
                });
                this.pool.on(this.pool.filters.Slash((_c = this.node) === null || _c === void 0 ? void 0 : _c.address), function (_, __, _amount, _transaction) {
                    var transaction = (0, arweave_2.fromBytes)(_transaction);
                    slashLogger.warn("\uD83D\uDEAB Node has been slashed. Lost " + (0, helpers_1.toHumanReadable)((0, helpers_1.toBN)(_amount)) + " $KYVE. Bundle = " + transaction);
                    process.exit();
                });
                return [2 /*return*/];
            });
        });
    };
    KYVE.prototype.fetchPoolState = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stateLogger, _poolState, error_3, oldMetadata;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        stateLogger = logger_1["default"].getChildLogger({
                            name: "PoolState"
                        });
                        stateLogger.debug("Attempting to fetch pool state.");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.pool.poolState()];
                    case 2:
                        _poolState = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        stateLogger.error("❌ Received an error while trying to fetch the pool state:", error_3);
                        process.exit(1);
                        return [3 /*break*/, 4];
                    case 4:
                        try {
                            this.config = JSON.parse(_poolState.config);
                        }
                        catch (error) {
                            stateLogger.error("❌ Received an error while trying to parse the config:", error);
                            process.exit(1);
                        }
                        try {
                            oldMetadata = this.metadata;
                            this.metadata = JSON.parse(_poolState.metadata);
                            if (oldMetadata &&
                                this.metadata.versions &&
                                oldMetadata.versions !== this.metadata.versions) {
                                logger_1["default"].warn("⚠️  Version requirements changed. Exiting ...");
                                logger_1["default"].info("\u23F1  New version requirements are " + this.metadata.versions + ".");
                                process.exit();
                            }
                        }
                        catch (error) {
                            stateLogger.error("❌ Received an error while trying to parse the metadata:", error);
                            process.exit(1);
                        }
                        this.settings = _poolState;
                        stateLogger.debug("Successfully fetched pool state.");
                        return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.checkVersionRequirements = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if ((0, semver_1.satisfies)(this.version, this.metadata.versions || this.version)) {
                    logger_1["default"].info("⏱  Pool version requirements met.");
                }
                else {
                    logger_1["default"].error("\u274C Running an invalid version for the specified pool. Version requirements are " + this.metadata.versions + ".");
                    process.exit(1);
                }
                return [2 /*return*/];
            });
        });
    };
    KYVE.prototype.checkRuntimeRequirements = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.metadata.runtime === this.runtime) {
                    logger_1["default"].info("\uD83D\uDCBB Running node on runtime " + this.runtime + ".");
                }
                else {
                    logger_1["default"].error("❌ Specified pool does not match the integration runtime.");
                    process.exit(1);
                }
                return [2 /*return*/];
            });
        });
    };
    KYVE.prototype.setupNodeContract = function () {
        return __awaiter(this, void 0, void 0, function () {
            var nodeAddress, parsedStake, tx, _a, _b, _c, error_4, nodeStake;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this.pool._nodeOwners(this.wallet.address)];
                    case 1:
                        nodeAddress = _e.sent();
                        logger_1["default"].info("🌐 Joining KYVE Network ...");
                        if (!(ethers_1.constants.AddressZero === nodeAddress)) return [3 /*break*/, 9];
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 8, , 9]);
                        _b = (_a = this.pool).createNode;
                        _c = [10];
                        _d = {};
                        return [4 /*yield*/, this.pool.estimateGas.createNode(10)];
                    case 3:
                        _d.gasLimit = _e.sent();
                        return [4 /*yield*/, (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier)];
                    case 4: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.gasPrice = _e.sent(),
                                _d)]))];
                    case 5:
                        tx = _e.sent();
                        logger_1["default"].debug("Creating new contract. Transaction = " + tx.hash);
                        return [4 /*yield*/, tx.wait()];
                    case 6:
                        _e.sent();
                        return [4 /*yield*/, this.pool._nodeOwners(this.wallet.address)];
                    case 7:
                        nodeAddress = _e.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        error_4 = _e.sent();
                        logger_1["default"].error("❌ Could not create node contract:", error_4);
                        process.exit(1);
                        return [3 /*break*/, 9];
                    case 9:
                        this.node = new ethers_1.Contract(nodeAddress, node_json_1["default"], this.wallet);
                        logger_1["default"].info("\u2705 Connected to node " + nodeAddress);
                        return [4 /*yield*/, this.pool._stakingAmounts(nodeAddress)];
                    case 10:
                        nodeStake = _e.sent();
                        try {
                            parsedStake = new bignumber_js_1["default"](this.stake).multipliedBy(new bignumber_js_1["default"](10).exponentiatedBy(18));
                            if (parsedStake.isZero()) {
                                logger_1["default"].error("❌ Desired stake can't be zero.");
                                process.exit(1);
                            }
                        }
                        catch (error) {
                            logger_1["default"].error("❌ Provided invalid staking amount:", error);
                            process.exit(1);
                        }
                        if (!nodeStake.isZero()) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.selfDelegate(parsedStake)];
                    case 11:
                        _e.sent();
                        return [3 /*break*/, 16];
                    case 12:
                        if (!!(0, helpers_1.toEthersBN)(parsedStake).eq(nodeStake)) return [3 /*break*/, 15];
                        return [4 /*yield*/, this.selfUndelegate()];
                    case 13:
                        _e.sent();
                        return [4 /*yield*/, this.selfDelegate(parsedStake)];
                    case 14:
                        _e.sent();
                        return [3 /*break*/, 16];
                    case 15:
                        logger_1["default"].info("👌 Already staked with the correct amount.");
                        _e.label = 16;
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.selfDelegate = function (amount) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var token, tx, balance, _c, _d, _e, _f, _g, _h, _j, _k, error_5;
            var _l, _m;
            return __generator(this, function (_o) {
                switch (_o.label) {
                    case 0: return [4 /*yield*/, (0, helpers_1.Token)(this.pool)];
                    case 1:
                        token = _o.sent();
                        _c = helpers_1.toBN;
                        return [4 /*yield*/, token.balanceOf(this.wallet.address)];
                    case 2:
                        balance = _c.apply(void 0, [(_o.sent())]);
                        if (balance.lt(amount)) {
                            logger_1["default"].error("❌ Supplied wallet does not have enough $KYVE to stake.");
                            process.exit(1);
                        }
                        _o.label = 3;
                    case 3:
                        _o.trys.push([3, 14, , 15]);
                        _e = (_d = token).approve;
                        _f = [this.pool.address, (0, helpers_1.toEthersBN)(amount)];
                        _l = {};
                        return [4 /*yield*/, token.estimateGas.approve(this.pool.address, (0, helpers_1.toEthersBN)(amount))];
                    case 4:
                        _l.gasLimit = _o.sent();
                        return [4 /*yield*/, (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier)];
                    case 5: return [4 /*yield*/, _e.apply(_d, _f.concat([(_l.gasPrice = _o.sent(),
                                _l)]))];
                    case 6:
                        tx = _o.sent();
                        logger_1["default"].debug("Approving " + (0, helpers_1.toHumanReadable)(amount) + " $KYVE to be spent. Transaction = " + tx.hash);
                        return [4 /*yield*/, tx.wait()];
                    case 7:
                        _o.sent();
                        logger_1["default"].info("👍 Successfully approved.");
                        if (!((_a = this.node) === null || _a === void 0)) return [3 /*break*/, 8];
                        _g = void 0;
                        return [3 /*break*/, 11];
                    case 8:
                        _j = (_h = _a).delegate;
                        _k = [(0, helpers_1.toEthersBN)(amount)];
                        _m = {};
                        return [4 /*yield*/, ((_b = this.node) === null || _b === void 0 ? void 0 : _b.estimateGas.delegate((0, helpers_1.toEthersBN)(amount)))];
                    case 9:
                        _m.gasLimit = _o.sent();
                        return [4 /*yield*/, (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier)];
                    case 10:
                        _g = _j.apply(_h, _k.concat([(_m.gasPrice = _o.sent(),
                                _m)]));
                        _o.label = 11;
                    case 11: return [4 /*yield*/, (_g)];
                    case 12:
                        tx = _o.sent();
                        logger_1["default"].debug("Staking " + (0, helpers_1.toHumanReadable)(amount) + " $KYVE. Transaction = " + tx.hash);
                        return [4 /*yield*/, tx.wait()];
                    case 13:
                        _o.sent();
                        logger_1["default"].info("📈 Successfully staked.");
                        return [3 /*break*/, 15];
                    case 14:
                        error_5 = _o.sent();
                        logger_1["default"].error("❌ Received an error while trying to stake:", error_5);
                        process.exit(1);
                        return [3 /*break*/, 15];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.selfUndelegate = function () {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var tx, _c, _d, _e, error_6;
            var _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _g.trys.push([0, 7, , 8]);
                        if (!((_a = this.node) === null || _a === void 0)) return [3 /*break*/, 1];
                        _c = void 0;
                        return [3 /*break*/, 4];
                    case 1:
                        _e = (_d = _a).undelegate;
                        _f = {};
                        return [4 /*yield*/, ((_b = this.node) === null || _b === void 0 ? void 0 : _b.estimateGas.undelegate())];
                    case 2:
                        _f.gasLimit = _g.sent();
                        return [4 /*yield*/, (0, helpers_1.getGasPrice)(this.pool, this.gasMultiplier)];
                    case 3:
                        _c = _e.apply(_d, [(_f.gasPrice = _g.sent(),
                                _f)]);
                        _g.label = 4;
                    case 4: return [4 /*yield*/, (_c)];
                    case 5:
                        tx = _g.sent();
                        logger_1["default"].debug("Unstaking. Transaction = " + tx.hash);
                        return [4 /*yield*/, tx.wait()];
                    case 6:
                        _g.sent();
                        logger_1["default"].info("📉 Successfully unstaked.");
                        return [3 /*break*/, 8];
                    case 7:
                        error_6 = _g.sent();
                        logger_1["default"].error("❌ Received an error while trying to unstake:", error_6);
                        process.exit(1);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    return KYVE;
}());
exports["default"] = KYVE;
