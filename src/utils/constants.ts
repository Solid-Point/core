import { coins, DirectSecp256k1HdWalletOptions } from "@cosmjs/proto-signing";

export const KYVE_WALLET_OPTIONS: Partial<DirectSecp256k1HdWalletOptions> = {
  prefix: "kyve",
};

export const KYVE_DECIMALS = 9;

export const KYVE_DEFAULT_FEE = {
  amount: coins(0, "kyve"),
  gas: "200000",
};

// export const KYVE_ENDPOINTS = {
//   rpc: "https://rpc.node.kyve.network",
//   rest: "https://api.node.kyve.network",
// };

export const KYVE_ENDPOINTS = {
  rpc: "http://0.0.0.0:26657",
  rest: "http://0.0.0.0:1317",
};
