"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Progress = void 0;
const chalk_1 = __importDefault(require("chalk"));
const cli_progress_1 = __importDefault(require("cli-progress"));
class Progress {
    constructor(unit) {
        this.progress = new cli_progress_1.default.SingleBar({
            format: `${chalk_1.default.gray(new Date().toISOString().replace("T", " ").replace("Z", " "))} ${chalk_1.default.bold.blueBright("INFO")} [{bar}] {percentage}% | {value}/{total} ${unit}`,
        });
    }
    start(total, startValue) {
        this.progress.start(total, startValue);
    }
    update(current) {
        this.progress.update(current);
    }
    stop() {
        this.progress.stop();
    }
}
exports.Progress = Progress;
