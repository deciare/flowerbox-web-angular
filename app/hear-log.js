"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var model_base_1 = require("./model-base");
var HearLog = (function (_super) {
    __extends(HearLog, _super);
    function HearLog() {
        _super.apply(this, arguments);
    }
    return HearLog;
}(model_base_1.ModelBase));
exports.HearLog = HearLog;
var HearLogItem = (function () {
    function HearLogItem() {
    }
    // These are possible values for the "type" member.
    HearLogItem.TypeOutput = "output";
    HearLogItem.TypeCommand = "command";
    return HearLogItem;
}());
exports.HearLogItem = HearLogItem;
// Rich text with a wob reference.
var WobRef = (function () {
    function WobRef() {
    }
    return WobRef;
}());
exports.WobRef = WobRef;
//# sourceMappingURL=hear-log.js.map