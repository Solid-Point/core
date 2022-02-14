"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const proto_signing_1 = require("@cosmjs/proto-signing");
const stargate_1 = require("@cosmjs/stargate");
const constants_1 = require("./constants");
const axios_1 = __importDefault(require("axios"));
const path_1 = require("path");
const protobufjs_1 = require("protobufjs");
const root = (0, protobufjs_1.loadSync)((0, path_1.join)(__dirname, "../proto/registry/tx.proto"));
exports.default = new proto_signing_1.Registry(Array.from([
    [
        `/KYVENetwork.kyve.registry.MsgSubmitBundleProposal`,
        root.lookupType("MsgSubmitBundleProposal"),
    ],
    [
        `/KYVENetwork.kyve.registry.MsgVoteProposal`,
        root.lookupType("MsgVoteProposal"),
    ],
    [
        `/KYVENetwork.kyve.registry.MsgClaimUploaderRole`,
        root.lookupType("MsgClaimUploaderRole"),
    ],
]));
class Client {
    constructor(mnemonic, endpoints = constants_1.KYVE_ENDPOINTS) {
        this.mnemonic = mnemonic;
        this.endpoints = endpoints;
    }
    async getSigner() {
        if (!this.signer) {
            this.signer = await proto_signing_1.DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, constants_1.KYVE_WALLET_OPTIONS);
        }
        return this.signer;
    }
    async getClient() {
        if (!this.client) {
            this.client = await stargate_1.SigningStargateClient.connectWithSigner(this.endpoints.rpc, await this.getSigner()
            // { registry } TODO: import
            );
        }
        return this.client;
    }
    async sendMessage(msg) {
        const creator = await this.getAddress();
        const client = await this.getClient();
        return await client.signAndBroadcast(creator, [msg], constants_1.KYVE_DEFAULT_FEE);
    }
    async getAddress() {
        if (!this.address) {
            const signer = await this.getSigner();
            const [{ address }] = await signer.getAccounts();
            this.address = address;
        }
        return this.address;
    }
    async getBalance() {
        const address = await this.getAddress();
        const { data } = await axios_1.default.get(`${this.endpoints.rest}/bank/balances/${address}`);
        const coin = data.result.find((coin) => coin.denom === "kyve");
        return coin ? coin.amount : "0";
    }
}
exports.Client = Client;
