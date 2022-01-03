"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const fs_1 = require("fs");
const jsonfile_1 = require("jsonfile");
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
        await (0, jsonfile_1.writeFile)(`./db/${this.path}/${key}.json`, value);
    }
    async get(key) {
        return await (0, jsonfile_1.readFile)(`./db/${this.path}/${key}.json`);
    }
    async del(key) {
        await fs_1.promises.unlink(`./db/${this.path}/${key}.json`);
    }
}
exports.Database = Database;
