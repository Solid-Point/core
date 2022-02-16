"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KYVE_ENDPOINTS = exports.KYVE_DEFAULT_FEE = exports.KYVE_DECIMALS = exports.KYVE_WALLET_OPTIONS = void 0;
const proto_signing_1 = require("@cosmjs/proto-signing");
exports.KYVE_WALLET_OPTIONS = {
    prefix: "kyve",
};
exports.KYVE_DECIMALS = 9;
exports.KYVE_DEFAULT_FEE = {
    amount: (0, proto_signing_1.coins)(0, "kyve"),
    gas: "200000",
};
exports.KYVE_ENDPOINTS = {
    rpc: "https://rpc.node.kyve.network",
    rest: "https://api.node.kyve.network",
};
// export const KYVE_ENDPOINTS = {
//   rpc: "http://0.0.0.0:26657",
//   rest: "http://0.0.0.0:1317",
// };
