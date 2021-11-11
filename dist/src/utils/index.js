"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
exports.CLI = exports.getTagByName = void 0;
var commander_1 = require("commander");
var getTagByName = function (name, tags) {
    if (tags) {
        var tag = tags.find(function (tag) { return tag.name === name; });
        if (tag) {
            return tag.value;
        }
    }
    return undefined;
};
exports.getTagByName = getTagByName;
var CLI = /** @class */ (function (_super) {
    __extends(CLI, _super);
    function CLI(runtime, version) {
        var _this = _super.call(this, runtime) || this;
        _this.requiredOption("-p, --pool <string>", "The address of the pool you want to run on.");
        _this.requiredOption("-s, --stake <number>", "The amount of tokens you want to stake.");
        _this.requiredOption("-pk, --private-key <string>", "Your Ethereum private key that holds $KYVE.");
        _this.option("-k, --keyfile <string>", "The path to your Arweave keyfile. [optional]");
        _this.option("-n, --name <string>", "The identifier name of the node. [optional, default = random]");
        _this.option("-e, --endpoint <string>", "A custom Moonbase Alpha endpoint. [optional]");
        _this.option("-g, --gas-multiplier <string>", "The amount that you want to multiply the default gas price by. [optional]");
        _this.option("-st, --send-statistics <boolean>", "Send statistics. [optional, default = true]", true);
        _this.version(version, "-v, --version");
        return _this;
    }
    return CLI;
}(commander_1.Command));
exports.CLI = CLI;
