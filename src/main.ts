import { Runtime, StorageProvider } from "./types";
import { Core } from "./core";

class ProtocolNode extends Core {
  // register attributes
  public key: string = "test";

  // main method wait execution thread should be very abstract and easy to understand
  public async run(): Promise<void> {
    this.validate();

    const dataItem = await this.runtime.getDataItem(this.key);
    this.logger.log(dataItem.value);

    this.key = await this.runtime.getNextKey(dataItem.key);
    this.logger.log(this.key);

    this.logger.log(this.poolId.toString());
    this.logger.log(this.name);
    this.logger.log(this.network);
    this.logger.log(this.initialStake);
  }
}

// put storage platforms in storage folder -> user can make PRs or do their on in integration
class Arweave implements StorageProvider {
  async saveBundle(bundle: Buffer) {
    return "arweave tx";
  }

  async retrieveBundle(bundleId: string) {
    return Buffer.from("arweave tx");
  }
}
class Bundlr implements StorageProvider {
  async saveBundle(bundle: Buffer) {
    return "arweave tx";
  }

  async retrieveBundle(bundleId: string) {
    return Buffer.from("arweave tx");
  }
}

class IPFS implements StorageProvider {
  async saveBundle(bundle: Buffer) {
    return "ipfs hash";
  }

  async retrieveBundle(bundleId: string) {
    return Buffer.from("ipfs hash");
  }
}

// integration runtime should be implemented on the integration repo
class EVM implements Runtime {
  public name = "@kyve/evm";
  public version = "1.1.0";

  async getDataItem(key: string) {
    return {
      key,
      value: `${key}value`,
    };
  }

  async getNextKey(key: string) {
    return `${key}+1`;
  }
}

// inject runtime and storage provider
const node = new ProtocolNode(new EVM(), new Arweave());
node.run();

export default ProtocolNode;
