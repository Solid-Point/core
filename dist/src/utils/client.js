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
const protobufjs_1 = require("protobufjs");
const registry = new proto_signing_1.Registry(Array.from([
    [
        `/KYVENetwork.kyve.registry.MsgSubmitBundleProposal`,
        new protobufjs_1.Type("MsgSubmitBundleProposal")
            .add(new protobufjs_1.Field("creator", 1, "string"))
            .add(new protobufjs_1.Field("id", 2, "uint64"))
            .add(new protobufjs_1.Field("bundleId", 3, "string"))
            .add(new protobufjs_1.Field("byteSize", 4, "uint64"))
            .add(new protobufjs_1.Field("bundleSize", 5, "uint64")),
    ],
    [
        `/KYVENetwork.kyve.registry.MsgVoteProposal`,
        new protobufjs_1.Type("MsgVoteProposal")
            .add(new protobufjs_1.Field("creator", 1, "string"))
            .add(new protobufjs_1.Field("id", 2, "uint64"))
            .add(new protobufjs_1.Field("bundleId", 3, "string"))
            .add(new protobufjs_1.Field("support", 4, "bool")),
    ],
    [
        `/KYVENetwork.kyve.registry.MsgClaimUploaderRole`,
        new protobufjs_1.Type("MsgClaimUploaderRole")
            .add(new protobufjs_1.Field("creator", 1, "string"))
            .add(new protobufjs_1.Field("id", 2, "uint64")),
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
            this.client = await stargate_1.SigningStargateClient.connectWithSigner(this.endpoints.rpc, await this.getSigner(), { registry });
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
        const { data } = await axios_1.default.get(`${this.endpoints.rest}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=kyve`);
        return data.balance.amount;
    }
}
exports.Client = Client;
