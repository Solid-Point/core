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
exports.unstakeAll = exports.stake = exports.decimals = void 0;
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
                return [4 /*yield*/, pool._token()];
            case 1: return [2 /*return*/, new (_a.apply(ethers_1.Contract, [void 0, (_b.sent()), token_json_1["default"], pool.signer]))()];
        }
    });
}); };
var Pool = function (address, wallet) {
    return new ethers_1.Contract(address, pool_json_1["default"], wallet);
};
exports.decimals = ethers_1.BigNumber.from(10).pow(18);
var stake = function (stake, pool, settings) { return __awaiter(void 0, void 0, void 0, function () {
    var stakeLogger, address, token, parsedStake, currentStake, minimumStake, diff, transaction, _a, _b, _c, error_1, diff, balance, transaction, _d, _e, _f, _g, _h, _j, error_2;
    var _k, _l, _m;
    return __generator(this, function (_o) {
        switch (_o.label) {
            case 0:
                stakeLogger = logger_1["default"].getChildLogger({
                    name: "Stake"
                });
                return [4 /*yield*/, pool.signer.getAddress()];
            case 1:
                address = _o.sent();
                return [4 /*yield*/, Token(pool)];
            case 2:
                token = _o.sent();
                parsedStake = ethers_1.BigNumber.from(stake).mul(exports.decimals);
                return [4 /*yield*/, pool._stakingAmounts(address)];
            case 3:
                currentStake = (_o.sent());
                minimumStake = settings._minimumStake;
                if (parsedStake.lt(minimumStake)) {
                    stakeLogger.warn("\u26A0\uFE0F  Minimum stake is " + minimumStake
                        .div(exports.decimals)
                        .toString() + " $KYVE. You will not be able to register / vote.");
                }
                if (!currentStake.gt(parsedStake)) return [3 /*break*/, 10];
                diff = currentStake.sub(parsedStake);
                stakeLogger.debug("Attempting to unstake " + diff.div(exports.decimals).toString() + " $KYVE.");
                _o.label = 4;
            case 4:
                _o.trys.push([4, 8, , 9]);
                _b = (_a = pool).unstake;
                _c = [diff];
                _k = {};
                return [4 /*yield*/, pool.estimateGas.unstake(diff)];
            case 5: return [4 /*yield*/, _b.apply(_a, _c.concat([(_k.gasLimit = _o.sent(),
                        _k)]))];
            case 6:
                transaction = (_o.sent());
                stakeLogger.debug("Unstaking " + diff.div(exports.decimals).toString() + " $KYVE. Transaction = " + transaction.hash);
                return [4 /*yield*/, transaction.wait()];
            case 7:
                _o.sent();
                stakeLogger.info("📉 Successfully unstaked.");
                return [3 /*break*/, 9];
            case 8:
                error_1 = _o.sent();
                stakeLogger.error("❌ Received an error while trying to unstake:", error_1);
                process.exit(1);
                return [3 /*break*/, 9];
            case 9: return [3 /*break*/, 22];
            case 10:
                if (!currentStake.lt(parsedStake)) return [3 /*break*/, 21];
                diff = parsedStake.sub(currentStake);
                stakeLogger.debug("Attempting to stake " + diff.div(exports.decimals).toString() + " $KYVE.");
                return [4 /*yield*/, token.balanceOf(address)];
            case 11:
                balance = (_o.sent());
                if (!balance.lt(diff)) return [3 /*break*/, 12];
                stakeLogger.error("❌ Supplied wallet does not have enough $KYVE to stake.");
                process.exit(1);
                return [3 /*break*/, 20];
            case 12:
                _o.trys.push([12, 19, , 20]);
                transaction = void 0;
                _e = (_d = token).approve;
                _f = [pool.address, diff];
                _l = {};
                return [4 /*yield*/, token.estimateGas.approve(pool.address, diff)];
            case 13: return [4 /*yield*/, _e.apply(_d, _f.concat([(_l.gasLimit = _o.sent(),
                        _l)]))];
            case 14:
                transaction = _o.sent();
                stakeLogger.debug("Approving " + diff
                    .div(exports.decimals)
                    .toString() + " $KYVE to be spent. Transaction = " + transaction.hash);
                return [4 /*yield*/, transaction.wait()];
            case 15:
                _o.sent();
                stakeLogger.info("👍 Successfully approved.");
                _h = (_g = pool).stake;
                _j = [diff];
                _m = {};
                return [4 /*yield*/, pool.estimateGas.stake(diff)];
            case 16: return [4 /*yield*/, _h.apply(_g, _j.concat([(_m.gasLimit = _o.sent(),
                        _m)]))];
            case 17:
                transaction = _o.sent();
                stakeLogger.debug("Staking " + diff.div(exports.decimals).toString() + " $KYVE. Transaction = " + transaction.hash);
                return [4 /*yield*/, transaction.wait()];
            case 18:
                _o.sent();
                stakeLogger.info("📈 Successfully staked.");
                return [3 /*break*/, 20];
            case 19:
                error_2 = _o.sent();
                stakeLogger.error("❌ Received an error while trying to stake:", error_2);
                process.exit(1);
                return [3 /*break*/, 20];
            case 20: return [3 /*break*/, 22];
            case 21:
                // Already staked with the correct amount.
                stakeLogger.info("👌 Already staked with the correct amount.");
                _o.label = 22;
            case 22: return [2 /*return*/];
        }
    });
}); };
exports.stake = stake;
var unstakeAll = function (pool) { return __awaiter(void 0, void 0, void 0, function () {
    var unstakeLogger, address, currentStake, transaction, _a, _b, _c, error_3;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                unstakeLogger = logger_1["default"].getChildLogger({
                    name: "Unstake"
                });
                return [4 /*yield*/, pool.signer.getAddress()];
            case 1:
                address = _e.sent();
                return [4 /*yield*/, pool._stakingAmounts(address)];
            case 2:
                currentStake = (_e.sent());
                if (!currentStake.gt(0)) return [3 /*break*/, 9];
                unstakeLogger.debug("Attempting to unstake " + currentStake.div(exports.decimals).toString() + " $KYVE.");
                _e.label = 3;
            case 3:
                _e.trys.push([3, 7, , 8]);
                _b = (_a = pool).unstake;
                _c = [currentStake];
                _d = {};
                return [4 /*yield*/, pool.estimateGas.unstake(currentStake)];
            case 4: return [4 /*yield*/, _b.apply(_a, _c.concat([(_d.gasLimit = _e.sent(),
                        _d)]))];
            case 5:
                transaction = (_e.sent());
                unstakeLogger.debug("Unstaking " + currentStake
                    .div(exports.decimals)
                    .toString() + " $KYVE. Transaction = " + transaction.hash);
                return [4 /*yield*/, transaction.wait()];
            case 6:
                _e.sent();
                unstakeLogger.info("📉 Successfully unstaked.");
                return [3 /*break*/, 8];
            case 7:
                error_3 = _e.sent();
                unstakeLogger.error("❌ Received an error while trying to unstake:", error_3);
                process.exit(1);
                return [3 /*break*/, 8];
            case 8: return [3 /*break*/, 10];
            case 9:
                unstakeLogger.debug("Nothing to unstake.");
                _e.label = 10;
            case 10: return [2 /*return*/];
        }
    });
}); };
exports.unstakeAll = unstakeAll;
exports["default"] = Pool;
