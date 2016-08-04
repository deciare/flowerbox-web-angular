"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
var observable_1 = require("rxjs/observable");
require("rxjs/add/operator/toPromise");
var TerminalCommandService = (function () {
    function TerminalCommandService(http) {
        this.http = http;
        this.execUrl = "http://localhost:3001/terminal/command";
        this.outputUrl = "http://localhost:3001/terminal/new-output";
        this.lastCheckTime = 0; // UNIX timestamp of most recent query to new-output
        this.output = observable_1.Observable.create(this.awaitOutput.bind(this));
        this.tag = this.makeTag(); // Random tag for identifying commands submitted from this session
    }
    TerminalCommandService.prototype.makeTag = function () {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 16; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    };
    ;
    TerminalCommandService.prototype.handleResponse = function (response) {
        console.debug("handleResponse", response);
        var data = response.json();
        if (!data.success) {
            return this.handleDataError(data);
        }
        return Promise.resolve(data);
    };
    TerminalCommandService.prototype.handleDataError = function (data) {
        console.debug("handleDataError", data);
        return Promise.reject("Data error: " + data.error);
    };
    TerminalCommandService.prototype.handleServerError = function (response) {
        console.debug("handleServerError", data);
        var data = response.json();
        return Promise.reject("Server error: " + data.status + " " + data.statusText);
    };
    TerminalCommandService.prototype.awaitOutput = function (observer) {
        var _this = this;
        return this.getOutput()
            .then(function (data) {
            // If data.log.length is 0, then it's an empty array signifying
            // that no new lines have been output since the last check for
            // new output
            if (data.log.length) {
                // Set lastCheckTime based on the timestamp of the last
                // HearLog
                _this.lastCheckTime = Math.max(_this.lastCheckTime, data.log[data.log.length - 1].timestamp);
            }
            // Notify observer about new output available
            observer.next(data);
            // Send next request
            return _this.awaitOutput(observer);
        })
            .catch(function (error) {
            // Notify observer about server error or data error
            observer.error(error);
            // Send next request
            return _this.awaitOutput(observer);
        });
    };
    TerminalCommandService.prototype.getOutput = function () {
        var headers = new http_1.Headers({
            "Content-Type": "application/json"
        });
        console.debug("Getting output from", this.outputUrl + "/?since=" + (this.lastCheckTime + 1) + "&datehack=" + new Date().getTime(), headers);
        return this.http.get(this.outputUrl + "/?since=" + (this.lastCheckTime + 1) + "&datehack=" + new Date().getTime(), headers)
            .toPromise()
            .then(this.handleResponse.bind(this), this.handleServerError.bind(this));
    };
    TerminalCommandService.prototype.exec = function (command) {
        var headers = new http_1.Headers({
            "Content-Type": "application/json"
        });
        return this.http.get(this.execUrl + "/" + encodeURIComponent(command) + "?tag=" + this.tag)
            .toPromise()
            .then(this.handleResponse.bind(this), this.handleServerError.bind(this));
    };
    TerminalCommandService = __decorate([
        core_1.Injectable(), 
        __metadata('design:paramtypes', [http_1.Http])
    ], TerminalCommandService);
    return TerminalCommandService;
}());
exports.TerminalCommandService = TerminalCommandService;
//# sourceMappingURL=terminal-command.service.js.map