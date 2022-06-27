import { existsSync, mkdirSync } from "fs";

export abstract class Cache {
  public path: string = "";

  init(path: string): void {
    this.path = path;

    if (!existsSync(this.path)) {
      mkdirSync(this.path, { recursive: true });
    }
  }

  abstract put(key: string, value: any): Promise<void>;
  abstract get(key: string): Promise<any>;
  abstract exists(key: string): Promise<boolean>;
  abstract del(key: string): Promise<void>;
  abstract drop(): Promise<void>;
}
