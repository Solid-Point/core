"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const fs_1 = require("fs");
class Database {
    constructor(path) {
        this.path = path;
        if (!(0, fs_1.existsSync)("./db")) {
            (0, fs_1.mkdirSync)("./db");
        }
        if (!(0, fs_1.existsSync)(`./db/${this.path}`)) {
            (0, fs_1.mkdirSync)(`./db/${this.path}`);
        }
    }
    async put(key, value) {
        await fs_1.promises.writeFile(`./db/${this.path}/${key}.json`, value);
    }
    async get(key) {
        return await fs_1.promises.readFile(`./db/${this.path}/${key}.json`);
    }
    async del(key) {
        await fs_1.promises.unlink(`./db/${this.path}/${key}.json`);
    }
}
exports.Database = Database;
