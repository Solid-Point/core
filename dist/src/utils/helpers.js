"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.getGasPrice = exports.toBN = exports.toEthersBN = exports.toHumanReadable = exports.Pool = exports.Token = void 0;
const bignumber_js_1 = require("bignumber.js");
const ethers_1 = require("ethers");
const pool_json_1 = __importDefault(require("../abi/pool.json"));
const token_json_1 = __importDefault(require("../abi/token.json"));
const Token = async (pool) => {
    return new ethers_1.Contract((await pool.token()), token_json_1.default, pool.signer);
};
exports.Token = Token;
const Pool = (address, wallet) => {
    return new ethers_1.Contract(address, pool_json_1.default, wallet);
};
exports.Pool = Pool;
const toHumanReadable = (amount) => {
    return amount.dividedBy(new bignumber_js_1.BigNumber(10).exponentiatedBy(18)).toFixed(5);
};
exports.toHumanReadable = toHumanReadable;
const toEthersBN = (amount) => {
    return ethers_1.ethers.BigNumber.from(amount.toFixed());
};
exports.toEthersBN = toEthersBN;
const toBN = (amount) => {
    return new bignumber_js_1.BigNumber(amount.toString());
};
exports.toBN = toBN;
const getGasPrice = async (pool, gasMultiplier) => {
    return (0, exports.toEthersBN)((0, exports.toBN)(await pool.provider.getGasPrice()).multipliedBy(new bignumber_js_1.BigNumber(gasMultiplier).toFixed(2)));
};
exports.getGasPrice = getGasPrice;
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.sleep = sleep;
