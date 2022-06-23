import { Command } from "commander";

export class CLI extends Command {
  constructor(
    public runtime = process.env.KYVE_RUNTIME!,
    public packageVersion = process.env.KYVE_VERSION!
  ) {
    super(runtime);

    this.requiredOption(
      "-p, --poolId <number>",
      "The id of the pool you want to run on."
    );
    this.requiredOption(
      "-m, --mnemonic <string>",
      "Your mnemonic of your account."
    );
    this.requiredOption(
      "-k, --keyfile <string>",
      "The path to your Arweave keyfile."
    );
    this.option(
      "-s, --initialStake <number>",
      "Your initial stake the node should start with. Flag is ignored node is already staked [unit = $KYVE]."
    );
    this.option(
      "--space",
      "How much bytes the node can occupy [deprecated]. [optional, default = 1000000000]",
      "1000000000"
    );
    this.option(
      "-n, --network <string>",
      "The chain id of the network. [optional, default = korellia]",
      "korellia"
    );
    this.option(
      "--metrics",
      "Run Prometheus metrics server on localhost. [optional, default = false]",
      false
    );
    this.option(
      "-v, --verbose",
      "Run node in verbose mode. [optional, default = false]",
      false
    );
    this.version(packageVersion, "--version");
  }
}
