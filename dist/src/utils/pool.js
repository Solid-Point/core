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
exports.unstakeAll = exports.stake = exports.getGasPrice = exports.toBN = exports.toEthersBN = exports.toHumanReadable = void 0;
var bignumber_js_1 = require("bignumber.js");
var ethers_1 = require("ethers");
var pool_json_1 = __importDefault(require("../abi/pool.json"));
var token_json_1 = __importDefault(require("../abi/token.json"));
var logger_1 = __importDefault(require("../utils/logger"));
var Token = function (pool) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = ethers_1.Contract.bind;
                return [4 /*yield*/, pool.token()];
            case 1: return [2 /*return*/, new (_a.apply(ethers_1.Contract, [void 0, (_b.sent()), token_json_1["default"], pool.signer]))()];
        }
    });
}); };
var Pool = function (address, wallet) {
    return new ethers_1.Contract(address, pool_json_1["default"], wallet);
};
var toHumanReadable = function (amount) {
    return amount.dividedBy(new bignumber_js_1.BigNumber(10).exponentiatedBy(18)).toFixed(5);
};
exports.toHumanReadable = toHumanReadable;
var toEthersBN = function (amount) {
    return ethers_1.ethers.BigNumber.from(amount.toFixed());
};
exports.toEthersBN = toEthersBN;
var toBN = function (amount) {
    return new bignumber_js_1.BigNumber(amount.toString());
};
exports.toBN = toBN;
var getGasPrice = function (pool, gasMultiplier) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = exports.toEthersBN;
                _b = exports.toBN;
                return [4 /*yield*/, pool.provider.getGasPrice()];
            case 1: return [2 /*return*/, _a.apply(void 0, [_b.apply(void 0, [_c.sent()]).multipliedBy(new bignumber_js_1.BigNumber(gasMultiplier).toFixed(2))])];
        }
    });
}); };
exports.getGasPrice = getGasPrice;
var stake = function (stake, pool, settings, gasMultiplier) { return __awaiter(void 0, void 0, void 0, function () {
    var stakeLogger, address, token, parsedStake, currentStake, _a, minimumStake, diff, transaction, _b, _c, _d, error_1, diff, balance, _e, transaction, _f, _g, _h, _j, _k, _l, error_2;
    var _m, _o, _p;
    return __generator(this, function (_q) {
        switch (_q.label) {
            case 0:
                stakeLogger = logger_1["default"].getChildLogger({
                    name: "Stake"
                });
                return [4 /*yield*/, pool.signer.getAddress()];
            case 1:
                address = _q.sent();
                return [4 /*yield*/, Token(pool)];
            case 2:
                token = _q.sent();
                try {
                    parsedStake = new bignumber_js_1.BigNumber(stake).multipliedBy(new bignumber_js_1.BigNumber(10).exponentiatedBy(18));
                }
                catch (error) {
                    stakeLogger.error("❌ Provided invalid staking amount:", error);
                    process.exit(1);
                }
                _a = bignumber_js_1.BigNumber.bind;
                return [4 /*yield*/, pool._stakingAmounts(address)];
            case 3:
                currentStake = new (_a.apply(bignumber_js_1.BigNumber, [void 0, (_q.sent()).toString()]))();
                minimumStake = (0, exports.toBN)(settings._minimumStake);
                if (parsedStake.lt(minimumStake)) {
                    stakeLogger.error("\u274C Minimum stake is " + (0, exports.toHumanReadable)(minimumStake) + " $KYVE. You will not be able to register / vote.");
                    process.exit();
                }
                if (!currentStake.gt(parsedStake)) return [3 /*break*/, 11];
                diff = currentStake.minus(parsedStake);
                stakeLogger.debug("Attempting to unstake " + (0, exports.toHumanReadable)(diff) + " $KYVE.");
                _q.label = 4;
            case 4:
                _q.trys.push([4, 9, , 10]);
                _c = (_b = pool).unstake;
                _d = [(0, exports.toEthersBN)(diff)];
                _m = {};
                return [4 /*yield*/, pool.estimateGas.unstake((0, exports.toEthersBN)(diff))];
            case 5:
                _m.gasLimit = _q.sent();
                return [4 /*yield*/, (0, exports.getGasPrice)(pool, gasMultiplier)];
            case 6: return [4 /*yield*/, _c.apply(_b, _d.concat([(_m.gasPrice = _q.sent(),
                        _m)]))];
            case 7:
                transaction = (_q.sent());
                stakeLogger.debug("Unstaking " + (0, exports.toHumanReadable)(diff) + " $KYVE. Transaction = " + transaction.hash);
                return [4 /*yield*/, transaction.wait()];
            case 8:
                _q.sent();
                stakeLogger.info("📉 Successfully unstaked.");
                return [3 /*break*/, 10];
            case 9:
                error_1 = _q.sent();
                stakeLogger.error("❌ Received an error while trying to unstake:", error_1);
                process.exit(1);
                return [3 /*break*/, 10];
            case 10: return [3 /*break*/, 25];
            case 11:
                if (!currentStake.lt(parsedStake)) return [3 /*break*/, 24];
                diff = parsedStake.minus(currentStake);
                stakeLogger.debug("Attempting to stake " + (0, exports.toHumanReadable)(diff) + " $KYVE.");
                _e = exports.toBN;
                return [4 /*yield*/, token.balanceOf(address)];
            case 12:
                balance = _e.apply(void 0, [(_q.sent())]);
                if (!balance.lt(diff)) return [3 /*break*/, 13];
                stakeLogger.error("❌ Supplied wallet does not have enough $KYVE to stake.");
                process.exit(1);
                return [3 /*break*/, 23];
            case 13:
                _q.trys.push([13, 22, , 23]);
                transaction = void 0;
                _g = (_f = token).approve;
                _h = [pool.address, (0, exports.toEthersBN)(diff)];
                _o = {};
                return [4 /*yield*/, token.estimateGas.approve(pool.address, (0, exports.toEthersBN)(diff))];
            case 14:
                _o.gasLimit = _q.sent();
                return [4 /*yield*/, (0, exports.getGasPrice)(pool, gasMultiplier)];
            case 15: return [4 /*yield*/, _g.apply(_f, _h.concat([(_o.gasPrice = _q.sent(),
                        _o)]))];
            case 16:
                transaction = _q.sent();
                stakeLogger.debug("Approving " + (0, exports.toHumanReadable)(diff) + " $KYVE to be spent. Transaction = " + transaction.hash);
                return [4 /*yield*/, transaction.wait()];
            case 17:
                _q.sent();
                stakeLogger.info("👍 Successfully approved.");
                _k = (_j = pool).stake;
                _l = [(0, exports.toEthersBN)(diff)];
                _p = {};
                return [4 /*yield*/, pool.estimateGas.stake((0, exports.toEthersBN)(diff))];
            case 18:
                _p.gasLimit = _q.sent();
                return [4 /*yield*/, (0, exports.getGasPrice)(pool, gasMultiplier)];
            case 19: return [4 /*yield*/, _k.apply(_j, _l.concat([(_p.gasPrice = _q.sent(),
                        _p)]))];
            case 20:
                transaction = _q.sent();
                stakeLogger.debug("Staking " + (0, exports.toHumanReadable)(diff) + " $KYVE. Transaction = " + transaction.hash);
                return [4 /*yield*/, transaction.wait()];
            case 21:
                _q.sent();
                stakeLogger.info("📈 Successfully staked.");
                return [3 /*break*/, 23];
            case 22:
                error_2 = _q.sent();
                stakeLogger.error("❌ Received an error while trying to stake:", error_2);
                process.exit(1);
                return [3 /*break*/, 23];
            case 23: return [3 /*break*/, 25];
            case 24:
                // Already staked with the correct amount.
                stakeLogger.info("👌 Already staked with the correct amount.");
                _q.label = 25;
            case 25: return [2 /*return*/];
        }
    });
}); };
exports.stake = stake;
var unstakeAll = function (pool, gasMultiplier) { return __awaiter(void 0, void 0, void 0, function () {
    var unstakeLogger, address, currentStake, _a, transaction, _b, _c, _d, error_3;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                unstakeLogger = logger_1["default"].getChildLogger({
                    name: "Unstake"
                });
                return [4 /*yield*/, pool.signer.getAddress()];
            case 1:
                address = _f.sent();
                _a = bignumber_js_1.BigNumber.bind;
                return [4 /*yield*/, pool._stakingAmounts(address)];
            case 2:
                currentStake = new (_a.apply(bignumber_js_1.BigNumber, [void 0, (_f.sent()).toString()]))();
                if (!currentStake.gt(0)) return [3 /*break*/, 10];
                unstakeLogger.debug("Attempting to unstake " + (0, exports.toHumanReadable)(currentStake) + " $KYVE.");
                _f.label = 3;
            case 3:
                _f.trys.push([3, 8, , 9]);
                _c = (_b = pool).unstake;
                _d = [(0, exports.toEthersBN)(currentStake)];
                _e = {};
                return [4 /*yield*/, pool.estimateGas.unstake((0, exports.toEthersBN)(currentStake))];
            case 4:
                _e.gasLimit = _f.sent();
                return [4 /*yield*/, (0, exports.getGasPrice)(pool, gasMultiplier)];
            case 5: return [4 /*yield*/, _c.apply(_b, _d.concat([(_e.gasPrice = _f.sent(),
                        _e)]))];
            case 6:
                transaction = (_f.sent());
                unstakeLogger.debug("Unstaking " + (0, exports.toHumanReadable)(currentStake) + " $KYVE. Transaction = " + transaction.hash);
                return [4 /*yield*/, transaction.wait()];
            case 7:
                _f.sent();
                unstakeLogger.info("📉 Successfully unstaked.");
                return [3 /*break*/, 9];
            case 8:
                error_3 = _f.sent();
                unstakeLogger.error("❌ Received an error while trying to unstake:", error_3);
                process.exit(1);
                return [3 /*break*/, 9];
            case 9: return [3 /*break*/, 11];
            case 10:
                unstakeLogger.debug("Nothing to unstake.");
                _f.label = 11;
            case 11: return [2 /*return*/];
        }
    });
}); };
exports.unstakeAll = unstakeAll;
exports["default"] = Pool;
