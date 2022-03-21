import { existsSync, mkdirSync, promises as fs } from "fs";
import { readFile, writeFile } from "jsonfile";
import fse from "fs-extra";

export class Database {
  public path: string;

  constructor(path: string) {
    this.path = path;

    if (!existsSync("./db")) {
      mkdirSync("./db");
    }

    if (!existsSync(`./db/${this.path}`)) {
      mkdirSync(`./db/${this.path}`);
    }
  }

  public async put(key: string | number, value: any): Promise<void> {
    await writeFile(`./db/${this.path}/${key}.json`, value);
  }

  public async get(key: string | number): Promise<any> {
    return await readFile(`./db/${this.path}/${key}.json`);
  }

  public async del(key: string | number): Promise<void> {
    await fs.unlink(`./db/${this.path}/${key}.json`);
  }

  public async drop(): Promise<void> {
    await fse.emptyDir(`./db/${this.path}/`);
  }
}
