import { existsSync, mkdirSync, promises as fs } from "fs";

export interface Operation {
  type: "put" | "del";
  key: string;
  value?: Buffer;
}

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

  public async put(key: string | number, value: Buffer): Promise<void> {
    await fs.writeFile(`./db/${this.path}/${key}`, value);
  }

  public async get(key: string | number): Promise<Buffer> {
    return await fs.readFile(`./db/${this.path}/${key}`);
  }

  public async del(key: string | number): Promise<void> {
    await fs.unlink(`./db/${this.path}/${key}`);
  }
}
