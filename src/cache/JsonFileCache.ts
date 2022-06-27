import { readFile, writeFile } from "jsonfile";
import { promises as fs } from "fs";
import fse from "fs-extra";

import { Cache } from ".";

export default class JsonFileCache extends Cache {
  public async put(key: string | number, value: any): Promise<void> {
    await writeFile(`${this.path}/${key}.json`, value);
  }

  public async get(key: string | number): Promise<any> {
    return await readFile(`${this.path}/${key}.json`);
  }

  public async del(key: string | number): Promise<void> {
    await fs.unlink(`${this.path}/${key}.json`);
  }

  public async drop(): Promise<void> {
    await fse.emptyDir(`${this.path}/`);
  }

  public async exists(key: string | number): Promise<boolean> {
    return await fse.pathExists(`${this.path}/${key}.json`);
  }
}
