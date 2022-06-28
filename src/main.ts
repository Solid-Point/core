import { Runtime, StorageProvider, Cache } from "./types";

import Arweave from "./storage/Arweave";
import JsonFileCache from "./cache/JsonFileCache";

import { version as coreVersion } from "../package.json";
import { setupLogger, setupName, logNodeInfo, syncPoolState } from "./methods";
import program from "./commander";
import KyveSDK, { KyveClient, KyveLCDClientType } from "@kyve/sdk";
import { kyve } from "@kyve/proto";
import { KYVE_NETWORK } from "@kyve/sdk/dist/constants";
import { Logger } from "tslog";

class Node {
  // register dependency attributes
  protected runtime!: Runtime;
  protected storageProvider!: StorageProvider;
  protected cache!: Cache;

  // register sdk attributes
  protected sdk: KyveSDK;
  protected client!: KyveClient;
  protected query: KyveLCDClientType;

  // logger attributes
  protected logger: Logger;

  // register attributes
  protected coreVersion: string;
  protected pool: any;
  protected name: string;

  // options
  protected poolId: number;
  protected mnemonic: string;
  protected keyfile: string;
  protected initialStake: string;
  protected network: string;
  protected verbose: boolean;

  // register core methods
  protected setupLogger = setupLogger;
  protected setupName = setupName;
  protected logNodeInfo = logNodeInfo;
  protected syncPoolState = syncPoolState;

  constructor() {
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

    this.name = this.setupName();
    this.logger = this.setupLogger();
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

    this.logNodeInfo();

    await this.syncPoolState();

    // console.log(this.pool);
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
