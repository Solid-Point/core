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

  public async put(key: string, value: Buffer): Promise<void> {
    await fs.writeFile(`${this.path}/${key}`, value);
  }

  public async get(key: string): Promise<Buffer> {
    return await fs.readFile(`${this.path}/${key}`);
  }

  public async del(key: string): Promise<void> {
    await fs.unlink(key);
  }

  public async batch(ops: Operation[]): Promise<void> {
    for (let op of ops) {
      if (op.type === "put") {
        await this.put(op.key, op.value || Buffer.from([]));
      } else if (op.type === "del") {
        await this.del(op.key);
      }
    }
  }
}
