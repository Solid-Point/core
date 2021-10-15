"use strict";
exports.__esModule = true;
var sleep = function (ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
};
exports["default"] = sleep;
