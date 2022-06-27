import { Runtime, StorageProvider, Logger } from "../types";
import { generateName } from "../utils/helpers";

import { Cache } from "../cache";
import JsonFileCache from "../cache/JsonFileCache";

import { version as coreVersion } from "../../package.json";
import { validate } from "../methods";
import program from "../commander";

export abstract class Core {
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
  public validate = validate;

  constructor(
    protected runtime: Runtime,
    protected storage: StorageProvider,
    protected cache: Cache = new JsonFileCache(),
    protected logger: Logger = console
  ) {
    // define program
    const options = program
      .name(this.runtime.name)
      .description(`KYVE Protocol Node [@kyve/core=${coreVersion}]`)
      .version(this.runtime.version)
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
    this.coreVersion = coreVersion;
    this.name = generateName(
      options.poolId,
      options.mnemonic,
      options.coreVersion
    );

    // init cache
    this.cache.init(`./cache/${this.name}`);
  }

  // main run method
  abstract run(): Promise<void>;
}
