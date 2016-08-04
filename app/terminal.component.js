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
var hear_log_1 = require("./hear-log");
var terminal_command_service_1 = require("./terminal-command.service");
///<reference path="../typings/globals/jquery/index.d.ts" />
var ScrollbackChunk = (function () {
    function ScrollbackChunk(type, text, url) {
        this.type = type;
        this.text = text;
        this.url = url;
    }
    return ScrollbackChunk;
}());
var ScrollbackLine = (function () {
    function ScrollbackLine(chunk) {
        if (chunk instanceof Array) {
            this.chunks = chunk;
        }
        else if (chunk instanceof ScrollbackChunk) {
            this.chunks = [chunk];
        }
        else {
            console.error("ScrollbackLine constructor: invaild chunk", chunk);
        }
    }
    return ScrollbackLine;
}());
var TerminalComponent = (function () {
    function TerminalComponent(terminalCommandService) {
        var _this = this;
        this.terminalCommandService = terminalCommandService;
        this.cursorSpeed = 500; // Cursor blink rate in milliseconds
        this.inputRight = ""; // User input string to right of cursor
        this.inputHistory = []; // User input history
        this.inputHistoryIndex = 0; // 0-based index of currently shown input history
        this.scrollback = []; // Scrollback buffer
        this.scrollbackMaxLength = 5000; // Max number of scrollback lines
        this.prompt = "fb> "; // Command prompt
        // Initialise empty command line
        this.deleteLine();
        // Initialise jQuery reference to this component's toplevel element.
        // This must be done with a setTimeout() because domId has not been
        // bound to the id property of the terminal's container div at the time
        // ngOnInit() executes. Not wrapping this initialisation in a
        // setTimeout() would result in this.element being undefined.
        setTimeout(function () { _this.element = $("#" + _this.domId); }, 0);
    }
    TerminalComponent.prototype.ngOnInit = function () {
        // Subscribe to output from the TerminalCommandService
        this.terminalCommandService.output.subscribe(this.handleOutput.bind(this), this.handleErrorOutput.bind(this));
    };
    TerminalComponent.prototype.trackByScrollbackLine = function (index, line) {
        return index;
    };
    TerminalComponent.prototype.handleOutput = function (data) {
        var _this = this;
        console.debug("Handling output:", data);
        data.log.forEach(function (log) {
            var chunks = [];
            switch (log.type) {
                case hear_log_1.HearLogItem.TypeCommand:
                    if (log.tag != _this.terminalCommandService.tag) {
                        chunks.push(new ScrollbackChunk("command", _this.prompt + log.items[0]));
                    }
                    break;
                case hear_log_1.HearLogItem.TypeOutput:
                    chunks.push(new ScrollbackChunk("output", log.timestamp + ": "));
                    log.items.forEach(function (item) {
                        var type;
                        var url;
                        if (typeof (item) === "object") {
                            switch (item.rich) {
                                case "wob":
                                    type = "wob";
                                    url = "/objinfo/" + item.id;
                                    break;
                            }
                            chunks.push(new ScrollbackChunk(type, item.text, url));
                        }
                        else {
                            chunks.push(new ScrollbackChunk("output", item));
                        }
                    });
                    break;
            }
            _this.appendLine(chunks);
        });
        this.scrollToBottom();
    };
    TerminalComponent.prototype.handleErrorOutput = function (error) {
        console.log("Handing error output:", error);
        this.appendLine("error", error);
        this.scrollToBottom();
    };
    TerminalComponent.prototype.indexOfLeftWordBoundary = function () {
        var fromIndex = this.cursorPosition;
        // If character to immediate left of cursor is a space, start searching
        // from the left of that space
        if (this.inputLeft[this.inputLeft.length - 1] == " ") {
            fromIndex -= 2;
        }
        // Search for the nearest space to the left of the cursor
        return this.inputLeft.lastIndexOf(" ", fromIndex);
    };
    TerminalComponent.prototype.indexOfRightWordBoundary = function () {
        var fromIndex = 0;
        // If character to immediate right of cursor is a space, start
        // searching from the right of that space
        if (this.inputRight[0] == " ") {
            fromIndex += 2;
        }
        // Search for the nearest space to the right of the cursor
        var index = this.inputRight.indexOf(" ", fromIndex);
        if (index == -1) {
            // If no word boundary was found, return -1
            return -1;
        }
        else {
            // If a word boundary was found, return the index of the boundary
            // relative to the start of hte line
            return this.cursorPosition + index + 1;
        }
    };
    TerminalComponent.prototype.backspace = function () {
        // Remove character to left of cursor and advance cursor left
        this.inputLeft = this.inputLeft.slice(0, -1);
        this.cursorPosition--;
    };
    TerminalComponent.prototype.forwardDelete = function () {
        // Remove character under cursor
        this.inputCursor = this.inputRight.substr(0, 1);
        this.inputRight = this.inputRight.slice(1);
    };
    TerminalComponent.prototype.deleteLine = function () {
        this.inputLeft = "";
        this.inputCursor = " ";
        this.inputRight = "";
        this.cursorPosition = 0;
        this.cursorAtEnd = true;
    };
    TerminalComponent.prototype.gotoInputHistory = function (index) {
        // Can't rewind past start of history
        if (index < 0) {
            index = 0;
        }
        else if (index > this.inputHistory.length) {
            index = this.inputHistory.length;
        }
        // Only make adjustments if the effective target index differs from the
        // current index
        if (this.inputHistoryIndex != index) {
            if (index == this.inputHistory.length) {
                this.deleteLine();
            }
            else {
                // Set input equal to given index in input history
                this.inputLeft = this.inputHistory[index];
                this.inputCursor = "";
                this.inputRight = "";
            }
            // Move cursor to end of line
            this.moveCursorToEnd();
            // Update index of currently-displayed command line
            this.inputHistoryIndex = index;
        }
    };
    TerminalComponent.prototype.advanceInputHistory = function (steps) {
        this.gotoInputHistory(this.inputHistoryIndex + steps);
    };
    TerminalComponent.prototype.setCursorPosition = function (index) {
        var atEnd = false;
        var command = this.inputLeft + (this.cursorAtEnd ? "" : this.inputCursor + this.inputRight);
        // Can't move cursor past beginning of line
        if (index < 0) {
            index = 0;
        }
        else if (index > command.length) {
            index = command.length;
            atEnd = true; // indicate cursor is at end of line
        }
        else if (index == command.length) {
            atEnd = true;
        }
        // Save updated cursor position
        this.cursorPosition = index;
        // Save end-of-line state of cursor
        this.cursorAtEnd = atEnd;
        // Update input strings relative to cursor position
        this.inputLeft = command.slice(0, index);
        if (!atEnd) {
            this.inputCursor = command.substr(index, 1);
            this.inputRight = command.slice(index + 1);
        }
        else {
            this.inputCursor = " ";
            this.inputRight = "";
        }
    };
    TerminalComponent.prototype.advanceCursorPosition = function (steps) {
        this.setCursorPosition(this.cursorPosition + steps);
    };
    TerminalComponent.prototype.moveCursorLeftWord = function () {
        this.setCursorPosition(this.indexOfLeftWordBoundary() + 1);
    };
    TerminalComponent.prototype.moveCursorRightWord = function () {
        var index = this.indexOfRightWordBoundary();
        if (index == -1) {
            this.moveCursorToEnd();
        }
        else {
            this.setCursorPosition(index + 1);
        }
    };
    TerminalComponent.prototype.moveCursorToStart = function () {
        this.setCursorPosition(0);
    };
    TerminalComponent.prototype.moveCursorToEnd = function () {
        var totalLength = this.inputLeft.length + this.inputRight.length + (this.cursorAtEnd ? 0 : 1);
        this.setCursorPosition(totalLength);
    };
    TerminalComponent.prototype.deleteToStart = function () {
        // Adjust cursor position by length of characters to be removed
        this.cursorPosition -= this.inputLeft.length;
        // Remove characters to left of cursor
        this.inputLeft = "";
    };
    TerminalComponent.prototype.deleteToEnd = function () {
        if (!this.cursorAtEnd) {
            // Remove character under cursor and characters to right of cursor
            this.inputCursor = " ";
            this.inputRight = "";
            // Cursor is now at end of line
            this.cursorAtEnd = true;
        }
    };
    TerminalComponent.prototype.deleteLeftWord = function () {
        var index = this.indexOfLeftWordBoundary();
        if (index == -1) {
            // If no word boundary was found to left of cursor, delete to start
            // of line
            this.deleteToStart();
        }
        else {
            // Otherwise, delete leftward up to but excluding the word boundary
            this.inputLeft = this.inputLeft.slice(0, index + 1);
            this.cursorPosition -= this.cursorPosition - index - 1;
        }
    };
    TerminalComponent.prototype.scroll = function (pages) {
        var _this = this;
        // setTimeout() gives DOM chance to finish updating before a scroll, if
        // this function was called from a function that modified the DOM
        setTimeout(function () {
            _this.element.animate({
                scrollTop: _this.element.scrollTop() + pages * _this.element.height()
            }, 100, 'linear');
        }, 0);
    };
    TerminalComponent.prototype.scrollToBottom = function () {
        var _this = this;
        // setTimeout() gives DOM chance to finish updating before a scroll, if
        // this function was called from a function that modified the DOM
        setTimeout(function () {
            _this.element.animate({
                scrollTop: _this.element.prop("scrollHeight")
            }, 100, "linear");
        }, 0);
    };
    TerminalComponent.prototype.insertInput = function (text) {
        this.inputLeft += text;
        this.cursorPosition++;
    };
    TerminalComponent.prototype.submitInput = function () {
        var _this = this;
        var command = this.inputLeft + (this.cursorAtEnd ? "" : this.inputCursor + this.inputRight);
        // Append input to scrollback buffer
        this.appendLine("input", command);
        // Clear this line
        this.deleteLine();
        // Always keep the bottom in view when submitting a command
        this.scrollToBottom();
        // If command is not blank...
        if (command.trim()) {
            // Append command to input history
            this.inputHistory.push(command);
            this.inputHistoryIndex = this.inputHistory.length;
            // Execute command
            this.terminalCommandService.exec(command)
                .catch(function (error) {
                _this.appendLine("error", error);
            });
        }
    };
    TerminalComponent.prototype.appendLine = function (typeOrChunks, text) {
        if (typeof (typeOrChunks) === "string") {
            this.scrollback.push(new ScrollbackLine(new ScrollbackChunk(typeOrChunks, text)));
        }
        else if (typeof (typeOrChunks) === "object" &&
            (typeOrChunks instanceof Array ||
                typeOrChunks instanceof ScrollbackChunk)) {
            this.scrollback.push(new ScrollbackLine(typeOrChunks));
        }
        if (this.scrollback.length >= this.scrollbackMaxLength) {
            this.scrollback.shift();
        }
    };
    TerminalComponent.prototype.onKey = function (event) {
        // Disable browser keyboard shortcuts
        event.preventDefault();
        // Figure out what to do with the keypress
        switch (event.key) {
            case "Alt":
            case "Control":
            case "Meta":
            case "Shift":
                // Do nothing on modifier keys
                break;
            case "ArrowUp":
                if (event.shiftKey) {
                    this.scroll(-0.15);
                }
                else {
                    this.advanceInputHistory(-1);
                }
                break;
            case "ArrowDown":
                if (event.shiftKey) {
                    this.scroll(+0.15);
                }
                else {
                    this.advanceInputHistory(+1);
                }
                break;
            case "ArrowLeft":
                if (event.ctrlKey || event.altKey) {
                    this.moveCursorLeftWord();
                }
                else {
                    this.advanceCursorPosition(-1);
                }
                break;
            case "ArrowRight":
                if (event.ctrlKey || event.altKey) {
                    this.moveCursorRightWord();
                }
                else {
                    this.advanceCursorPosition(+1);
                }
                break;
            case "Backspace":
                this.backspace();
                break;
            case "Delete":
                this.forwardDelete();
                break;
            case "Home":
                this.moveCursorToStart();
                break;
            case "End":
                this.moveCursorToEnd();
                break;
            case "PageUp":
                this.scroll(-0.9);
                break;
            case "PageDown":
                this.scroll(+0.9);
                break;
            case "Enter":
                this.submitInput();
                break;
            case "a":
                if (event.ctrlKey) {
                    this.moveCursorToStart();
                    break;
                }
            case "e":
                if (event.ctrlKey) {
                    this.moveCursorToEnd();
                    break;
                }
            case "k":
                if (event.ctrlKey) {
                    this.deleteToEnd();
                    break;
                }
            case "u":
                if (event.ctrlKey) {
                    this.deleteToStart();
                    break;
                }
            case "w":
                if (event.ctrlKey) {
                    this.deleteLeftWord();
                    break;
                }
            default:
                // Append character to command line
                this.insertInput(event.key);
        }
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', String)
    ], TerminalComponent.prototype, "domId", void 0);
    TerminalComponent = __decorate([
        core_1.Component({
            moduleId: module.id,
            selector: "terminal",
            styleUrls: [
                "./terminal.component.css"
            ],
            templateUrl: "./terminal.component.html",
            providers: [
                terminal_command_service_1.TerminalCommandService
            ]
        }), 
        __metadata('design:paramtypes', [terminal_command_service_1.TerminalCommandService])
    ], TerminalComponent);
    return TerminalComponent;
}());
exports.TerminalComponent = TerminalComponent;
//# sourceMappingURL=terminal.component.js.map