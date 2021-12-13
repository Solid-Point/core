"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeData = exports.dataSizeOfBinary = exports.dataSizeOfString = exports.fromBytes = exports.toBytes = exports.sleep = exports.getGasPrice = exports.toBN = exports.toEthersBN = exports.toHumanReadable = exports.getPoolContract = exports.getTokenContract = void 0;
const base64url_1 = __importDefault(require("base64url"));
const bignumber_js_1 = require("bignumber.js");
const ethers_1 = require("ethers");
const pool_json_1 = __importDefault(require("../abi/pool.json"));
const token_json_1 = __importDefault(require("../abi/token.json"));
const getTokenContract = async (pool) => {
    return new ethers_1.Contract((await pool.token()), token_json_1.default, pool.signer);
};
exports.getTokenContract = getTokenContract;
const getPoolContract = (address, wallet) => {
    return new ethers_1.Contract(address, pool_json_1.default, wallet);
};
exports.getPoolContract = getPoolContract;
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
const toBytes = (input) => {
    return Buffer.from(base64url_1.default.decode(input, "hex"), "hex");
};
exports.toBytes = toBytes;
const fromBytes = (input) => {
    return base64url_1.default.encode(input.slice(2), "hex");
};
exports.fromBytes = fromBytes;
const dataSizeOfString = (string) => {
    return new Uint8Array(new TextEncoder().encode(string)).byteLength || 0;
};
exports.dataSizeOfString = dataSizeOfString;
const dataSizeOfBinary = (binary) => {
    return new Uint8Array(binary).byteLength || 0;
};
exports.dataSizeOfBinary = dataSizeOfBinary;
const encodeData = (type, data) => {
    const message = type.fromObject(data);
    return type.encode(message).finish();
};
exports.encodeData = encodeData;
