import { Runtime, StorageProvider, Cache, Logger } from "./types";
import { generateName } from "./utils/helpers";

import Arweave from "./storage/Arweave";
import JsonFileCache from "./cache/JsonFileCache";

import { version as coreVersion } from "../package.json";
import { validate } from "./methods";
import program from "./commander";
import KyveSDK from "@kyve/sdk";
import { kyve } from "@kyve/proto";
import { KYVE_NETWORK } from "@kyve/sdk/dist/constants";
import KyveClient from "@kyve/sdk/dist/clients/rpc-client/client";
import { KyveLCDClientType } from "@kyve/sdk/dist/clients/lcd-client/client";

class Node {
  // register dependency attributes
  public runtime!: Runtime;
  public storageProvider!: StorageProvider;
  public cache!: Cache;

  // register sdk attributes
  public sdk: KyveSDK;
  public client!: KyveClient;
  public query: KyveLCDClientType;

  // register attributes
  public coreVersion: string;
  public pool: any;
  public name: string;

  // options
  public poolId: number;
  public mnemonic: string;
  public keyfile: string;
  public initialStake: string;
  public network: string;
  public verbose: boolean;

  // register core methods
  public validate = validate;

  constructor(public logger: Logger = console) {
    // define program
    const options = program
      .name("@kyve/core")
      .description(`KYVE Protocol Node`)
      .version(coreVersion)
      .parse()
      .opts();

    // assign program options
    this.poolId = options.poolId;
    this.mnemonic = options.mnemonic;
    this.keyfile = options.keyfile;
    this.initialStake = options.initialStake;
    this.network = options.network;
    this.verbose = options.verbose;

    // assign main attributes
    this.sdk = new KyveSDK(this.network as KYVE_NETWORK);
    this.query = this.sdk.createLCDClient();

    this.coreVersion = coreVersion;
    this.name = generateName(
      options.poolId,
      options.mnemonic,
      options.coreVersion
    );
  }

  public addRuntime(runtime: Runtime): this {
    this.runtime = runtime;
    return this;
  }

  public addStorageProvider(storageProvider: StorageProvider): this {
    this.storageProvider = storageProvider;
    this.storageProvider.init(this.keyfile);

    return this;
  }

  public addCache(cache: Cache): this {
    this.cache = cache;
    this.cache.init(`./cache/${this.name}`);

    return this;
  }

  // main method wait execution thread should be very abstract and easy to understand
  public async run(): Promise<void> {
    this.client = await this.sdk.fromMnemonic(this.mnemonic);

    const tags: [string, string][] = [["Application", "KYVE"]];

    this.storageProvider.saveBundle(Buffer.from("test"), tags);

    this.logger.log(this.client.account.address);

    this.logger.log(this.poolId.toString());
    this.logger.log(this.name);
    this.logger.log(this.network);
    this.logger.log(this.initialStake);
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
new Node()
  .addRuntime(new EVM())
  .addStorageProvider(new Arweave())
  .addCache(new JsonFileCache())
  .run();

export default Node;
