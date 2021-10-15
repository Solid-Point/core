"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.fromBytes = exports.toBytes = void 0;
var base64url_1 = __importDefault(require("base64url"));
var toBytes = function (input) {
    return Buffer.from(base64url_1["default"].decode(input, "hex"), "hex");
};
exports.toBytes = toBytes;
var fromBytes = function (input) {
    return base64url_1["default"].encode(input.slice(2), "hex");
};
exports.fromBytes = fromBytes;
