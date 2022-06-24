import { validate } from "./methods";

interface Logger {
  log(message: string): void;
}

// DTOs should be strongly commented and explained
interface DataItem {
  key: string;
  value: any;
}

// interfaces should be strongly commented and explained
interface Runtime {
  getDataItem(key: string): Promise<DataItem>;
  getNextKey(key: string): Promise<string>;
}

interface StorageProvider {
  saveBundle(bundle: Buffer): Promise<string>;
  retrieveBundle(bundleId: string): Promise<Buffer>;
}

class KYVE {
  // register attributes
  public key: string = "test";

  // register methods
  public validate = validate;

  // dependency injection of runtime and storage and other switchable helpers like logger and db
  constructor(
    protected runtime: Runtime,
    protected storage: StorageProvider,
    protected logger: Logger = console
  ) {}

  // main method wait execution thread should be very abstract and easy to understand
  public async run(): Promise<void> {
    this.validate();

    const dataItem = await this.runtime.getDataItem(this.key);
    this.logger.log(dataItem.value);

    this.key = await this.runtime.getNextKey(dataItem.key);
    this.logger.log(this.key);
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

class Filecoin implements StorageProvider {
  async saveBundle(bundle: Buffer) {
    return "filecoin hash";
  }

  async retrieveBundle(bundleId: string) {
    return Buffer.from("filecoin hash");
  }
}

// integration runtime should be implemented on the integration repo
class EVM implements Runtime {
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
const core = new KYVE(new EVM(), new Arweave());
core.run();

export default KYVE;
