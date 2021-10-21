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
var pool_1 = __importStar(require("./utils/pool"));
var sleep_1 = __importDefault(require("./utils/sleep"));
var package_json_1 = require("../package.json");
var KYVE = /** @class */ (function () {
    function KYVE(poolAddress, runtime, version, stakeAmount, privateKey, keyfile, name) {
        var _this = this;
        this.buffer = [];
        this.votes = [];
        this.client = new arweave_1["default"]({
            host: "arweave.net",
            protocol: "https"
        });
        this.wallet = new ethers_1.Wallet(privateKey, new ethers_1.ethers.providers.StaticJsonRpcProvider("https://moonbeam-alpha.api.onfinality.io/public", {
            chainId: 1287,
            name: "moonbase-alphanet"
        }));
        this.pool = (0, pool_1["default"])(poolAddress, this.wallet);
        this.runtime = runtime;
        this.version = version;
        this.stake = stakeAmount;
        this.keyfile = keyfile;
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
        return __awaiter(this, void 0, void 0, function () {
            var format, config, _uploader;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        format = function (input) {
                            var length = Math.max(13, _this.runtime.length);
                            return input.padEnd(length, " ");
                        };
                        logger_1["default"].info("\uD83D\uDE80 Starting node ...\n\t" + format("Name") + " = " + this.name + "\n\t" + format("Address") + " = " + this.wallet.address + "\n\t" + format("Pool") + " = " + this.pool.address + "\n\t" + format("Desired Stake") + " = " + this.stake + " $KYVE\n\n\t" + format("@kyve/core") + " = v" + package_json_1.version + "\n\t" + format(this.runtime) + " = v" + this.version);
                        return [4 /*yield*/, this.sync()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.fetchConfig()];
                    case 2:
                        config = _a.sent();
                        if (!(0, semver_1.satisfies)(this.version, this._metadata.versions || this.version)) return [3 /*break*/, 3];
                        logger_1["default"].info("⏱  Pool version requirements met.");
                        return [3 /*break*/, 5];
                    case 3:
                        logger_1["default"].error("\u274C Running an invalid version for the specified pool. Version requirements are " + this._metadata.versions + ".");
                        return [4 /*yield*/, (0, pool_1.unstakeAll)(this.pool)];
                    case 4:
                        _a.sent();
                        process.exit(1);
                        _a.label = 5;
                    case 5:
                        if (this._metadata.runtime === this.runtime) {
                            logger_1["default"].info("\uD83D\uDCBB Running node on runtime " + this.runtime + ".");
                        }
                        else {
                            logger_1["default"].error("❌ Specified pool does not match the integration runtime.");
                            process.exit(1);
                        }
                        return [4 /*yield*/, (0, pool_1.stake)(this.stake, this.pool, this._settings)];
                    case 6:
                        _a.sent();
                        _uploader = this._settings._uploader;
                        if (!(this.wallet.address === _uploader)) return [3 /*break*/, 10];
                        if (!this.keyfile) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.pool.paused()];
                    case 7:
                        if (_a.sent()) {
                            logger_1["default"].warn("⚠️  Pool is paused. Exiting ...");
                            process.exit();
                        }
                        else {
                            logger_1["default"].info("📚 Running as an uploader ...");
                            this.uploader(uploadFunction, config);
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        logger_1["default"].error("❌ You need to specify your Arweave keyfile.");
                        process.exit(1);
                        _a.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        logger_1["default"].info("🧐 Running as an validator ...");
                        this.validator(validateFunction, config);
                        _a.label = 11;
                    case 11: return [2 /*return*/];
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
                    var i, tempBuffer, transaction, balance, _a, _b, registerTransaction, error_1;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                i = this.buffer.push(item);
                                uploaderLogger.debug("Received a new data item (" + i + " / " + this._metadata.bundleSize + ").");
                                if (!(this.buffer.length >= this._metadata.bundleSize)) return [3 /*break*/, 9];
                                uploaderLogger.info("📦 Creating bundle ...");
                                tempBuffer = this.buffer;
                                this.buffer = [];
                                // Upload buffer to Arweave.
                                uploaderLogger.debug("Uploading bundle to Arweave.");
                                return [4 /*yield*/, this.client.createTransaction({
                                        data: JSON.stringify(tempBuffer)
                                    })];
                            case 1:
                                transaction = _c.sent();
                                transaction.addTag("Application", "KYVE - Testnet");
                                transaction.addTag("Pool", this.pool.address);
                                transaction.addTag("@kyve/core", package_json_1.version);
                                transaction.addTag(this.runtime, this.version);
                                transaction.addTag("Bundle-Size", this._metadata.bundleSize);
                                transaction.addTag("Content-Type", "application/json");
                                return [4 /*yield*/, this.client.transactions.sign(transaction, this.keyfile)];
                            case 2:
                                _c.sent();
                                _b = (_a = this.client.wallets).getBalance;
                                return [4 /*yield*/, this.client.wallets.getAddress(this.keyfile)];
                            case 3: return [4 /*yield*/, _b.apply(_a, [_c.sent()])];
                            case 4:
                                balance = _c.sent();
                                if (+transaction.reward > +balance) {
                                    uploaderLogger.error("❌ You do not have enough funds in your Arweave wallet.");
                                    process.exit();
                                }
                                return [4 /*yield*/, this.client.transactions.post(transaction)];
                            case 5:
                                _c.sent();
                                uploaderLogger.info("\uD83D\uDCBE Uploaded bundle to Arweave. Transaction = " + transaction.id);
                                // Create a new vote.
                                uploaderLogger.debug("Attempting to register a bundle.");
                                _c.label = 6;
                            case 6:
                                _c.trys.push([6, 8, , 9]);
                                return [4 /*yield*/, this.pool.register((0, arweave_2.toBytes)(transaction.id), +transaction.data_size, {
                                        gasLimit: 10000000
                                    })];
                            case 7:
                                registerTransaction = (_c.sent());
                                uploaderLogger.info("\u2B06\uFE0F  Creating a new proposal. Transaction = " + registerTransaction.hash);
                                return [3 /*break*/, 9];
                            case 8:
                                error_1 = _c.sent();
                                uploaderLogger.error("❌ Received an error while trying to register a bundle:", error_1);
                                process.exit(1);
                                return [3 /*break*/, 9];
                            case 9: return [2 /*return*/];
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
                            var transaction, res, _data, bytes, bundle;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        transaction = (0, arweave_2.fromBytes)(_transaction);
                                        listenerLogger.info("\u2B07\uFE0F  Received a new proposal. Bundle = " + transaction);
                                        return [4 /*yield*/, this.client.transactions.getStatus(transaction)];
                                    case 1:
                                        res = _a.sent();
                                        if (!(res.status === 200 || res.status === 202)) return [3 /*break*/, 3];
                                        return [4 /*yield*/, this.client.transactions.getData(transaction, {
                                                decode: true
                                            })];
                                    case 2:
                                        _data = (_a.sent());
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
                                            this.votes.push({
                                                transaction: transaction,
                                                valid: false
                                            });
                                        }
                                        return [3 /*break*/, 4];
                                    case 3:
                                        listenerLogger.error("❌ Error fetching bundle from Arweave.");
                                        _a.label = 4;
                                    case 4: return [2 /*return*/];
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
                        this.vote(validatorLogger);
                        return [4 /*yield*/, this.listener()];
                    case 1:
                        listener = _a.sent();
                        node = new rxjs_1.Observable(function (subscriber) {
                            validateFunction(listener, subscriber, config, validatorLogger);
                        });
                        node.subscribe(function (item) { return _this.votes.push(item); });
                        return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.vote = function (logger) {
        return __awaiter(this, void 0, void 0, function () {
            var vote, _a, _b, _c, error_2;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!true) return [3 /*break*/, 9];
                        if (!this.votes.length) return [3 /*break*/, 6];
                        vote = this.votes.shift();
                        logger.info("\uD83D\uDDF3  Voting \"" + (vote.valid ? "valid" : "invalid") + "\" on bundle " + vote.transaction + ".");
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 4, , 5]);
                        _b = (_a = this.pool).vote;
                        _c = [(0, arweave_2.toBytes)(vote.transaction), vote.valid];
                        _d = {};
                        return [4 /*yield*/, this.pool.estimateGas.vote((0, arweave_2.toBytes)(vote.transaction), vote.valid)];
                    case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.gasLimit = _e.sent(),
                                _d)]))];
                    case 3:
                        _e.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _e.sent();
                        return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, (0, sleep_1["default"])(10 * 1000)];
                    case 7:
                        _e.sent();
                        _e.label = 8;
                    case 8: return [3 /*break*/, 0];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.sync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var payoutLogger, pointsLogger, slashLogger;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.fetchMetadata()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.fetchSettings()];
                    case 2:
                        _a.sent();
                        // Listen to new contract changes.
                        this.pool.on("ConfigChanged", function () {
                            logger_1["default"].warn("⚠️  Config changed. Exiting ...");
                            process.exit();
                        });
                        this.pool.on("MetadataChanged", function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.fetchMetadata()];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        this.pool.on("MinimumStakeChanged", function (_, minimum) { return __awaiter(_this, void 0, void 0, function () {
                            var stake;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.pool._stakingAmounts(this.wallet.address)];
                                    case 1:
                                        stake = (_a.sent());
                                        if (stake.lt(minimum)) {
                                            logger_1["default"].error("\u274C Minimum stake is " + minimum
                                                .div(pool_1.decimals)
                                                .toString() + " $KYVE. You will not be able to register / vote.");
                                            process.exit();
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        this.pool.on("Paused", function () {
                            if (_this.wallet.address === _this._settings._uploader) {
                                logger_1["default"].warn("⚠️  Pool is now paused. Exiting ...");
                                process.exit();
                            }
                        });
                        this.pool.on("UploaderChanged", function (previous) {
                            if (_this.wallet.address === previous) {
                                logger_1["default"].warn("⚠️  Uploader changed. Exiting ...");
                                process.exit();
                            }
                        });
                        payoutLogger = logger_1["default"].getChildLogger({
                            name: "Payout"
                        });
                        this.pool.on(this.pool.filters.Payout(this.wallet.address), function (_, __, _amount, _transaction) {
                            var amount = _amount.mul(1000000).div(pool_1.decimals).toNumber() / 1000000;
                            var transaction = (0, arweave_2.fromBytes)(_transaction);
                            payoutLogger.info("\uD83D\uDCB8 Received a reward of " + amount + " $KYVE. Bundle = " + transaction);
                        });
                        pointsLogger = logger_1["default"].getChildLogger({
                            name: "Points"
                        });
                        this.pool.on(this.pool.filters.IncreasePoints(this.wallet.address), function (_, __, _points, _transaction) {
                            var transaction = (0, arweave_2.fromBytes)(_transaction);
                            pointsLogger.warn("\u26A0\uFE0F  Received a new slashing point (" + _points.toString() + " / " + _this._settings._slashThreshold + "). Bundle = " + transaction);
                        });
                        slashLogger = logger_1["default"].getChildLogger({
                            name: "Slash"
                        });
                        this.pool.on(this.pool.filters.Slash(this.wallet.address), function (_, __, _amount, _transaction) {
                            var transaction = (0, arweave_2.fromBytes)(_transaction);
                            slashLogger.warn("\uD83D\uDEAB Node has been slashed. Lost " + _amount
                                .div(pool_1.decimals)
                                .toString() + " $KYVE. Bundle = " + transaction);
                            process.exit();
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.fetchConfig = function () {
        return __awaiter(this, void 0, void 0, function () {
            var configLogger, _config, config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        configLogger = logger_1["default"].getChildLogger({
                            name: "Config"
                        });
                        configLogger.debug("Attempting to fetch the config.");
                        return [4 /*yield*/, this.pool._config()];
                    case 1:
                        _config = (_a.sent());
                        try {
                            config = JSON.parse(_config);
                            configLogger.debug("Successfully fetched the config.");
                            return [2 /*return*/, config];
                        }
                        catch (error) {
                            configLogger.error("❌ Received an error while trying to fetch the config:", error);
                            process.exit(1);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.fetchMetadata = function () {
        return __awaiter(this, void 0, void 0, function () {
            var metadataLogger, _metadata, oldMetadata, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metadataLogger = logger_1["default"].getChildLogger({
                            name: "Metadata"
                        });
                        metadataLogger.debug("Attempting to fetch the metadata.");
                        return [4 /*yield*/, this.pool._metadata()];
                    case 1:
                        _metadata = (_a.sent());
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 6]);
                        oldMetadata = this._metadata;
                        this._metadata = JSON.parse(_metadata);
                        if (!(oldMetadata &&
                            this._metadata.versions &&
                            oldMetadata.versions !== this._metadata.versions)) return [3 /*break*/, 4];
                        logger_1["default"].warn("⚠️  Version requirements changed. Unstaking and exiting ...");
                        logger_1["default"].info("\u23F1  New version requirements are " + this._metadata.versions + ".");
                        return [4 /*yield*/, (0, pool_1.unstakeAll)(this.pool)];
                    case 3:
                        _a.sent();
                        process.exit();
                        _a.label = 4;
                    case 4:
                        metadataLogger.debug("Successfully fetched the metadata.");
                        return [3 /*break*/, 6];
                    case 5:
                        error_3 = _a.sent();
                        metadataLogger.error("❌ Received an error while trying to fetch the metadata:", error_3);
                        process.exit(1);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    KYVE.prototype.fetchSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var settingsLogger, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        settingsLogger = logger_1["default"].getChildLogger({
                            name: "Settings"
                        });
                        settingsLogger.debug("Attempting to fetch the settings.");
                        _a = this;
                        return [4 /*yield*/, this.pool._settings()];
                    case 1:
                        _a._settings = _b.sent();
                        settingsLogger.debug("Successfully fetched the settings.");
                        return [2 /*return*/];
                }
            });
        });
    };
    return KYVE;
}());
exports["default"] = KYVE;
