import {
  Coin,
  DirectSecp256k1HdWallet,
  OfflineDirectSigner,
  EncodeObject,
  Registry,
} from "@cosmjs/proto-signing";
import { SigningStargateClient, DeliverTxResponse } from "@cosmjs/stargate";
import {
  KYVE_DEFAULT_FEE,
  KYVE_ENDPOINTS,
  KYVE_WALLET_OPTIONS,
} from "./constants";
import axios from "axios";
import { Field, Type } from "protobufjs";

interface BalanceResponse {
  balance: Coin;
}

interface Endpoints {
  rpc: string;
  rest: string;
}

type Signer = DirectSecp256k1HdWallet | OfflineDirectSigner;

const registry = new Registry(
  Array.from([
    [
      `/KYVENetwork.kyve.registry.v1beta1.MsgSubmitBundleProposal`,
      new Type("MsgSubmitBundleProposal")
        .add(new Field("creator", 1, "string"))
        .add(new Field("id", 2, "uint64"))
        .add(new Field("bundleId", 3, "string"))
        .add(new Field("byteSize", 4, "uint64"))
        .add(new Field("bundleSize", 5, "uint64")),
    ],
    [
      `/KYVENetwork.kyve.registry.v1beta1.MsgVoteProposal`,
      new Type("MsgVoteProposal")
        .add(new Field("creator", 1, "string"))
        .add(new Field("id", 2, "uint64"))
        .add(new Field("bundleId", 3, "string"))
        .add(new Field("support", 4, "bool")),
    ],
    [
      `/KYVENetwork.kyve.registry.v1beta1.MsgClaimUploaderRole`,
      new Type("MsgClaimUploaderRole")
        .add(new Field("creator", 1, "string"))
        .add(new Field("id", 2, "uint64")),
    ],
  ])
);

export class Client {
  private signer?: Signer;
  private address?: string;
  private client?: SigningStargateClient;

  constructor(
    private readonly mnemonic: string,
    public readonly endpoints: Endpoints = KYVE_ENDPOINTS
  ) {}

  async getSigner(): Promise<Signer> {
    if (!this.signer) {
      this.signer = await DirectSecp256k1HdWallet.fromMnemonic(
        this.mnemonic,
        KYVE_WALLET_OPTIONS
      );
    }

    return this.signer;
  }

  async getClient(): Promise<SigningStargateClient> {
    if (!this.client) {
      this.client = await SigningStargateClient.connectWithSigner(
        this.endpoints.rpc,
        await this.getSigner(),
        { registry }
      );
    }

    return this.client;
  }

  async sendMessage(msg: EncodeObject): Promise<DeliverTxResponse> {
    const creator = await this.getAddress();
    const client = await this.getClient();

    return await client.signAndBroadcast(creator, [msg], KYVE_DEFAULT_FEE);
  }

  async getAddress(): Promise<string> {
    if (!this.address) {
      const signer = await this.getSigner();
      const [{ address }] = await signer.getAccounts();

      this.address = address;
    }

    return this.address;
  }

  async getBalance(): Promise<string> {
    const address = await this.getAddress();

    const { data } = await axios.get<BalanceResponse>(
      `${this.endpoints.rest}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=kyve`
    );

    return data.balance.amount;
  }
}
