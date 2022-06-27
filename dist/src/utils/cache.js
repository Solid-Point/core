"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const fs_1 = require("fs");
const jsonfile_1 = require("jsonfile");
const fs_extra_1 = __importDefault(require("fs-extra"));
class Cache {
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
    async drop() {
        await fs_extra_1.default.emptyDir(`./db/${this.path}/`);
    }
    async exists(key) {
        return await fs_extra_1.default.pathExists(`./db/${this.path}/${key}.json`);
    }
}
exports.Cache = Cache;
