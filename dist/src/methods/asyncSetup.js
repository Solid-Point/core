"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncSetup = void 0;
async function asyncSetup() {
    this.client = await this.sdk.fromMnemonic(this.mnemonic);
}
exports.asyncSetup = asyncSetup;
