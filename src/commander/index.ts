import { Command } from "commander";

import {
  parsePoolId,
  parseMnemonic,
  parseKeyfile,
  parseInitialStake,
  parseNetwork,
} from "./parser";

const program = new Command();

export default program
  .requiredOption(
    "-p, --poolId <number>",
    "The id of the pool the node should join.",
    parsePoolId
  )
  .requiredOption(
    "-m, --mnemonic <string>",
    "Your mnemonic of your account.",
    parseMnemonic
  )
  .requiredOption(
    "-k, --keyfile <string>",
    "The path to your Arweave keyfile.",
    parseKeyfile
  )
  .option(
    "-s, --initialStake <number>",
    "Your initial stake the node should start with. Flag is ignored node is already staked [unit = $KYVE].",
    parseInitialStake,
    "0"
  )
  .option(
    "-n, --network <string>",
    "The chain id of the network. [optional, default = korellia]",
    parseNetwork,
    "korellia"
  )
  .option(
    "-v, --verbose",
    "Run node in verbose mode. [optional, default = false]",
    false
  )
  .option(
    "--metrics <deprecated>",
    "Run Prometheus metrics server on localhost. [deprecated]",
    false
  )
  .option(
    "--space <deprecated>",
    "How much bytes the node can occupy for caching [deprecated].",
    "1000000000"
  );
