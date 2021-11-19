"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslog_1 = require("tslog");
const logger = new tslog_1.Logger({
    displayFilePath: "hidden",
    displayFunctionName: false,
});
exports.default = logger;
