import { AfterViewChecked, AfterViewInit, Component, Input, OnInit } from "@angular/core";
import { HearLog, HearLogItem, WobRef } from "./hear-log";
import { ScrollbackChunk, ScrollbackLine } from "./scrollback";
import { AutocompleteService } from "./autocomplete.service";
import { SessionService } from "./session.service";
import { TerminalCommandService } from "./terminal-command.service";
import { InteractiveChunkComponent } from "./interactive-chunk.component";

///<reference path="../typings/globals/jquery/index.d.ts" />
///<reference path="../typings/globals/bootstrap/index.d.ts" />

@Component({
	moduleId: module.id,
	selector: "terminal",
	styleUrls: [
		"./terminal.component.css"
	],
	templateUrl: "./terminal.component.html",
	directives: [
		InteractiveChunkComponent
	],
	providers: [
		AutocompleteService,
		TerminalCommandService
	]
})
export class TerminalComponent implements AfterViewChecked, AfterViewInit, OnInit {
	private cursorAtEnd: boolean;
	private cursorPosition: number;
	private cursorSpeed: number;
	private element: JQuery;
	private inputCursor: string;
	private inputLeft: string;
	private inputRight: string;
	private inputHistory: string[];
	private inputHistoryIndex: number;
	private scrollback: ScrollbackLine[];
	private scrollbackMaxLength: number;
	private prompt: string;
	private lastShownTimestamp: Date;
	private hasServerError: boolean;

	@Input()
	domId: string;

	constructor(
		private autocompleteService: AutocompleteService,
		private sessionService: SessionService,
		private terminalCommandService: TerminalCommandService
	) {
		this.cursorSpeed = 500; // Cursor blink rate in milliseconds
		this.inputRight = ""; // User input string to right of cursor
		this.inputHistory = []; // User input history
		this.inputHistoryIndex = 0; // 0-based index of currently shown input history
		this.scrollback = []; // Scrollback buffer
		this.scrollbackMaxLength = 5000; // Max number of scrollback lines
		this.prompt = "fb> "; // Command prompt

		// Initialise empty command line
		this.deleteLine();
	}

	ngOnInit() {
		// Subscribe to output from the TerminalCommandService
		this.terminalCommandService.output.subscribe(
			this.handleOutput.bind(this)
		);
	}

	ngAfterViewInit() {
		// Initialise jQuery reference to this component's toplevel element.
		this.element = $(`#${this.domId}`);
	}

	ngAfterViewChecked() {
		// Bootstrap: Opt-in to tooltip data API
		$('[data-toggle="tooltip"]').tooltip();
	}

	trackByScrollbackLine(index: number, line: ScrollbackLine) {
		return index;
	}

	private handleOutput(data: HearLog) {
		var isFirstLine: boolean = true;

		//console.debug("Handling output:", data);
		if (data.error) {
			// Log detailed error to console
			console.log("Error received by TerminalComponent.handleOutput():", data.error);

			// Show friendly error message on terminal
			if (!this.hasServerError) {
				this.appendLine(new ScrollbackLine(new ScrollbackChunk("text-danger", "The server or network is experiencing technical issues. You will not be able to submit commands or interact with the world."), new Date()));
				this.appendLine("text-danger", "This session will automatically keep trying to reconnect you.");
			}
			this.scrollToBottom();

			// Indicate that an error is currently happening
			this.hasServerError = true;

			// Skip regular data processing
			return;
		}
		else {
			// If we were in an error state, notify the user that we have
			// recovered
			if (this.hasServerError) {
				this.appendLine(new ScrollbackLine(new ScrollbackChunk("text-success", "Reconnected!"), new Date()));
				this.scrollToBottom();
			}

			// Indicate that no error is currently happening
			this.hasServerError = false;
		}

		data.log.forEach((log) => {
			var chunks: ScrollbackChunk[] = [];
			var lineType: string = "output";
			var timestamp: Date = new Date(log.timestamp);

			// If a hear log entry exists, but it has no items, then the Server
			// is informing us that it means to display a blank line
			if (log.items.length == 0) {
				chunks.push(new ScrollbackChunk("blank", " "));
			}
			else {
				switch(log.type) {
				case HearLogItem.TypeCommand: // echoed command
					// If this command hasn't already been locally echoed,
					// it either came from a previous session or other
					// simultaneously connected session. Display it.
					if (log.tag != this.terminalCommandService.tag) {
						chunks.push(new ScrollbackChunk("command", this.prompt + log.items[0]));
					}
					// Skip processing this line (i.e. don't display a
					// blank line) if this command has already been
					// locally echoed
					else {
						return;
					}
					break;
				case HearLogItem.TypeError: // data error
					lineType = "text-warning";
				case HearLogItem.TypeOutput: // generic output
					log.items.forEach((item) => {
						var type: string;
						var interactive: any;

						if (typeof(item) === "object") {
							switch(item.rich) {
							case "wob":
								type = "wob";
								interactive = {
									id: item.id
								};
								break;
							}
							chunks.push(new ScrollbackChunk(type, item.text, interactive));
						}
						else {
							chunks.push(new ScrollbackChunk(lineType, item));
						}
					});
					break;
				}
			}

			// Show a timestmap on this line if:
			//  - It is the first line in the HearLog (e.g. new message or
			//    response to newly entered command
			//  - A timestamp has never been shown in this session (i.e. the
			//    user just logged in on this session and a backog is being
			//    shown)
			//  - The minute of the current line's timestamp differs from the
			//    last timestamp that was shown
			if (isFirstLine ||
				!this.lastShownTimestamp ||
				timestamp.getMinutes() != this.lastShownTimestamp.getMinutes()) {
				this.appendLine(new ScrollbackLine(chunks, timestamp));
				isFirstLine = false;
			}
			else {
				this.appendLine(new ScrollbackLine(chunks, undefined));
			}

			this.lastShownTimestamp = timestamp;
		});

		// If any new lines were output, scroll to bottom
		if (data.log.length) {
			this.scrollToBottom();
		}
	}

	private indexOfLeftWordBoundary(): number {
		var fromIndex = this.cursorPosition;
		// If character to immediate left of cursor is a space, start searching
		// from the left of that space
		if (this.inputLeft[this.inputLeft.length - 1] == " ") {
			fromIndex -= 2;
		}

		// Search for the nearest space to the left of the cursor
		return this.inputLeft.lastIndexOf(" ", fromIndex);
	}

	private indexOfRightWordBoundary(): number {
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
	}

	backspace() {
		// Remove character to left of cursor and advance cursor left
		this.inputLeft = this.inputLeft.slice(0, -1);
		this.cursorPosition--;
	}

	forwardDelete() {
		// Remove character under cursor
		this.inputCursor = this.inputRight.substr(0, 1);
		this.inputRight = this.inputRight.slice(1);
	}

	deleteLine() {
		this.inputLeft = "";
		this.inputCursor = " ";
		this.inputRight = "";
		this.cursorPosition = 0;
		this.cursorAtEnd = true;
	}

	gotoInputHistory(index: number) {
		// Can't rewind past start of history
		if (index < 0) {
			index = 0;
		}
		// Can't advance past end of history
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
	}

	advanceInputHistory(steps: number) {
		this.gotoInputHistory(this.inputHistoryIndex + steps);
	}

	setCursorPosition(index: number) {
		var atEnd = false
		var command = this.inputLeft + (this.cursorAtEnd ? "" : this.inputCursor + this.inputRight);

		// Can't move cursor past beginning of line
		if (index < 0) {
			index = 0;
		}
		// Can't move cursor past end of line
		else if (index > command.length) {
			index = command.length;
			atEnd = true; // indicate cursor is at end of line
		}
		// At end of line
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
	}

	advanceCursorPosition(steps: number) {
		this.setCursorPosition(this.cursorPosition + steps);
	}

	moveCursorLeftWord() {
		this.setCursorPosition(this.indexOfLeftWordBoundary() + 1);
	}

	moveCursorRightWord() {
		var index = this.indexOfRightWordBoundary();
		if (index == -1) {
			this.moveCursorToEnd();
		}
		else {
			this.setCursorPosition(index + 1);
		}
	}

	moveCursorToStart() {
		this.setCursorPosition(0);
	}

	moveCursorToEnd() {
		var totalLength = this.inputLeft.length + this.inputRight.length + (this.cursorAtEnd ? 0 : 1);

		this.setCursorPosition(totalLength);
	}

	deleteToStart() {
		// Adjust cursor position by length of characters to be removed
		this.cursorPosition = 0;
		// Remove characters to left of cursor
		this.inputLeft = "";
	}

	deleteToEnd() {
		if (!this.cursorAtEnd) {
			// Remove character under cursor and characters to right of cursor
			this.inputCursor = " ";
			this.inputRight = "";
			// Cursor is now at end of line
			this.cursorAtEnd = true;
		}
	}

	deleteLeftWord() {
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
	}

	scroll(pages: number) {
		// setTimeout() gives DOM chance to finish updating before a scroll, if
		// this function was called from a function that modified the DOM
		setTimeout(() => {
			this.element.animate({
				scrollTop: this.element.scrollTop() + pages * this.element.height()
			}, 100, 'linear');
		}, 0);
	}

	scrollToBottom() {
		// setTimeout() gives DOM chance to finish updating before a scroll, if
		// this function was called from a function that modified the DOM
		setTimeout(() => {
			this.element.animate({
				scrollTop: this.element.prop("scrollHeight")
			}, 100, "linear")
		}, 0);
	}

	autocompleteInput() {
		this.autocompleteService.completeCommand(this.inputLeft, 1)
			.then((completions: string[]) => {
				var inCommon: string;

				console.log("Completions:", completions);
				// If no completions were found, don't cange the command line.
				if (completions.length == 0) {
					inCommon = this.inputLeft;
				}
				// if 1 completion was found, replace the command line
				// with the completion.
				else if (completions.length == 1) {
					inCommon = completions[0];
				}
				// If multiple completions were found, replace the command line
				// with the longest substring that the completions have in
				// common.
				//
				// Also show a list of possible completions.
				else {
					this.appendLine("completion", "Suggestions:");
					completions.forEach((completion) => {
						// List each possible completion
						this.appendLine("completion", "  " + completion);

						// Determine the longest substring that all completions
						// have in common.
						if (inCommon === undefined) {
							inCommon = completion
						}
						else {
							var i: number;
							for (i = 0; i < completion.length; i++) {
								if (inCommon.charAt(i).toLowerCase() !== completion.charAt(i).toLowerCase()) {
									break;
								}
							}
							inCommon = inCommon.substring(0, i);
						}
					});
					this.scrollToBottom();
				}

				// Overwrite characters to left of cursor with the longest
				// string that is in common between all suggested completions.
				this.inputLeft = inCommon;
				this.cursorPosition = this.inputLeft.length;
			});
	}

	insertInput(text: string) {
		this.inputLeft += text;
		this.cursorPosition++;
	}

	/**
	 * Attempt to execute the current input as a command to this
	 * TerminalComponent. This processing should take place before user input
	 * is submitted to the server.
	 *
	 * @returns (boolean) true if command should be forwarded to server
	 */
	localExec(command: string): boolean {
		var matches: string[]; // results of regex matching
		var processOnServer: boolean = true; // whether to exec on server

		// TODO: Show a real login prompt at some point. For now, have a
		// special command that is parsed locally to log in.
		if (matches = command.match(/^login ([A-Za-z0-9]*)+ (.*)+/)) {
			// First match is login, second match is password
			this.sessionService.login(matches[1], matches[2])
				.then((msg) => {
					this.appendLine("text-information", msg);
				});
			// This command should be consumed (not executed on server)
			processOnServer = false;
		}
		else if (matches = command.match(/^logout$/)) {
			this.sessionService.logout();
			this.appendLine("text-information", "Logged out");
			processOnServer = false;
		}

		return processOnServer;
	}

	submitInput() {
		var command = this.inputLeft + (this.cursorAtEnd ? "" : this.inputCursor + this.inputRight);

		// If command is not blank...
		if (command.trim()) {
			// Append input to scrollback buffer
			this.appendLine("command", this.prompt + command, new Date());

			// Append command to input history
			this.inputHistory.push(command);
			this.inputHistoryIndex = this.inputHistory.length;

			// Attempt to execute this as a local command
			if (this.localExec(command)) {
				// If the command was not consumed by local execution, attempt
				// to execute it on the server
				this.terminalCommandService.exec(command)
					.catch((error) => {
						this.appendLine("text-danger", error);
					});
			}
		}
		else {
			this.appendLine("blank", " ");
		}

		// Clear this line
		this.deleteLine();

		// Always keep the bottom in view when submitting a command
		this.scrollToBottom();
	}

	appendLine(typeOrLine: any, text?: string, timestamp?: Date) {
		var line: ScrollbackLine;

		if (typeof(typeOrLine) === "string") {
			line = new ScrollbackLine(new ScrollbackChunk(typeOrLine, text), timestamp);
		}
		else if (typeof(typeOrLine) === "object" &&
			typeOrLine instanceof ScrollbackLine
		) {
			line = typeOrLine;
		}

		// Add line to scrollback buffer
		this.scrollback.push(line);
		// Age out old lines from scrollback buffer
		if (this.scrollback.length >= this.scrollbackMaxLength) {
			this.scrollback.shift();
		}
	}

	onKey(event: KeyboardEvent) {
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
			case "Enter":
				this.submitInput();
				break;
			case "Escape":
				// Unimplemented
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
			case "Tab":
				this.autocompleteInput();
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
	}
}
