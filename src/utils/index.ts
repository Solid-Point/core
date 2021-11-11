import { Command } from "commander";
import { Tags } from "../faces";

export const getTagByName = (name: string, tags?: Tags): string | undefined => {
  if (tags) {
    const tag = tags.find((tag) => tag.name === name);

    if (tag) {
      return tag.value;
    }
  }

  return undefined;
};

export class CLI extends Command {
  constructor(runtime: string, version: string) {
    super(runtime);

    this.requiredOption(
      "-p, --pool <string>",
      "The address of the pool you want to run on."
    );
    this.requiredOption(
      "-s, --stake <number>",
      "The amount of tokens you want to stake."
    );
    this.requiredOption(
      "-pk, --private-key <string>",
      "Your Ethereum private key that holds $KYVE."
    );
    this.option(
      "-k, --keyfile <string>",
      "The path to your Arweave keyfile. [optional]"
    );
    this.option(
      "-n, --name <string>",
      "The identifier name of the node. [optional, default = random]"
    );
    this.option(
      "-e, --endpoint <string>",
      "A custom Moonbase Alpha endpoint. [optional]"
    );
    this.option(
      "-g, --gas-multiplier <string>",
      "The amount that you want to multiply the default gas price by. [optional]"
    );
    this.option(
      "-st, --send-statistics <boolean>",
      "Send statistics. [optional, default = true]",
      true
    );
    this.version(version, "-v, --version");
  }
}
