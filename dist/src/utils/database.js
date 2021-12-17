"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const fs_1 = require("fs");
class Database {
    constructor(path) {
        this.path = path;
    }
    async put(key, value) {
        await fs_1.promises.writeFile(`${this.path}/${key}`, value);
    }
    async get(key) {
        return await fs_1.promises.readFile(`${this.path}/${key}`);
    }
    async del(key) {
        await fs_1.promises.unlink(key);
    }
    async batch(ops) {
        for (let op of ops) {
            if (op.type === "put") {
                await this.put(op.key, op.value || Buffer.from([]));
            }
            else if (op.type === "del") {
                await this.del(op.key);
            }
        }
    }
}
exports.Database = Database;
