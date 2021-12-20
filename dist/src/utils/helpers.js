"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBundle = exports.formatBundle = exports.dataSizeOfBinary = exports.dataSizeOfString = exports.fromBytes = exports.toBytes = exports.sleep = exports.getGasPrice = exports.toBN = exports.toEthersBN = exports.toHumanReadable = exports.getPoolContract = exports.getTokenContract = exports.ADDRESS_ZERO = void 0;
const base64url_1 = __importDefault(require("base64url"));
const bignumber_js_1 = require("bignumber.js");
const ethers_1 = require("ethers");
const pool_json_1 = __importDefault(require("../abi/pool.json"));
const token_json_1 = __importDefault(require("../abi/token.json"));
exports.ADDRESS_ZERO = ethers_1.ethers.constants.AddressZero;
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
// Inspired by https://github.com/Bundlr-Network/arbundles/blob/f3e8e1df09e68e33f3a51af33127999566ab3e37/src/utils.ts#L41-L85.
const longTo32ByteArray = (long) => {
    const byteArray = Buffer.alloc(32, 0);
    for (let index = 0; index < byteArray.length; index++) {
        const byte = long & 0xff;
        byteArray[index] = byte;
        long = (long - byte) / 256;
    }
    return Uint8Array.from(byteArray);
};
// Inspired by https://github.com/Bundlr-Network/arbundles/blob/f3e8e1df09e68e33f3a51af33127999566ab3e37/src/utils.ts#L87-L93.
const byteArrayToLong = (byteArray) => {
    let value = 0;
    for (let i = byteArray.length - 1; i >= 0; i--) {
        value = value * 256 + byteArray[i];
    }
    return value;
};
// Inspired by https://github.com/Bundlr-Network/arbundles/blob/1976030eba3953dcd7582e65b50217f893f6248d/src/ar-data-bundle.ts#L25-L64.
const formatBundle = (input) => {
    const offsets = new Uint8Array(32 * input.length);
    input.forEach((item, index) => {
        offsets.set(longTo32ByteArray(item.byteLength), 32 * index);
    });
    return Buffer.concat([
        longTo32ByteArray(input.length),
        offsets,
        Buffer.concat(input),
    ]);
};
exports.formatBundle = formatBundle;
// Inspired by https://github.com/Bundlr-Network/arbundles/blob/8a1509bc9596467d2f05003039da7e4de4d02ce3/src/Bundle.ts#L174-L199.
const parseBundle = (input) => {
    const count = byteArrayToLong(input.slice(0, 32));
    const itemStart = 32 + 32 * count;
    let offset = 0;
    const result = [];
    for (let i = 32; i < itemStart; i += 32) {
        const _offset = byteArrayToLong(input.slice(i, i + 32));
        result.push(input.slice(itemStart + offset, itemStart + offset + _offset));
        offset += _offset;
    }
    return result;
};
exports.parseBundle = parseBundle;
