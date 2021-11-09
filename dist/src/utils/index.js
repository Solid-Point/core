"use strict";
exports.__esModule = true;
exports.getTagByName = void 0;
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
