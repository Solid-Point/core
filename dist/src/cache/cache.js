"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const fs_1 = require("fs");
class Cache {
    constructor() {
        this.path = "";
    }
    init(path) {
        this.path = path;
        if (!(0, fs_1.existsSync)(this.path)) {
            (0, fs_1.mkdirSync)(this.path, { recursive: true });
        }
    }
}
exports.Cache = Cache;
