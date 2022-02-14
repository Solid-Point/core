import {
  Coin,
  DirectSecp256k1HdWallet,
  OfflineDirectSigner,
  EncodeObject,
} from "@cosmjs/proto-signing";
import { SigningStargateClient, DeliverTxResponse } from "@cosmjs/stargate";
import axios from "axios";
import {
  KYVE_DEFAULT_FEE,
  KYVE_ENDPOINTS,
  KYVE_WALLET_OPTIONS,
} from "./constants";

interface BalanceResponse {
  height: string;
  result: Coin[];
}

interface Endpoints {
  rpc: string;
  rest: string;
}

type Signer = DirectSecp256k1HdWallet | OfflineDirectSigner;

export class KyveWallet {
  private signer?: Signer;
  private address?: string;
  private client?: SigningStargateClient;

  constructor(
    private readonly mnemonic: string,
    private readonly endpoints: Endpoints = KYVE_ENDPOINTS
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
        await this.getSigner()
        // { registry } TODO: import
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
      `${this.endpoints.rest}/bank/balances/${address}`
    );
    const coin = data.result.find((coin) => coin.denom === "kyve");

    return coin ? coin.amount : "0";
  }
}
