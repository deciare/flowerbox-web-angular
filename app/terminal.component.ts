/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { AfterViewChecked, AfterViewInit, Component, Input, OnInit } from "@angular/core";
import { Subscription } from "rxjs/Subscription";

import { Config } from "./config";
import { EventStream, EventStreamItem } from "./event-stream";
import { ScrollbackChunk, ScrollbackLine } from "./scrollback";
import { Urls } from "./urls";

import { AutocompleteService } from "./autocomplete.service";
import { SessionService } from "./session.service";
import { TerminalEventService } from "./terminal-event.service";

import { MaskPipe } from "./mask.pipe";

///<reference path="../typings/globals/jquery/index.d.ts" />
///<reference path="../typings/globals/bootstrap/index.d.ts" />

class ChunkWrapper {
	chunk: ScrollbackChunk;
	placement: string;

	// Possible values for placement
	static PlacementStart = "start";
	static PlacementEnd = "end";
}

@Component({
	moduleId: module.id,
	selector: "terminal",
	styleUrls: [
		"./terminal.component.css"
	],
	templateUrl: "./terminal.component.html"
})
export class TerminalComponent implements AfterViewChecked, AfterViewInit, OnInit {
	private cursorAtEnd: boolean;
	private cursorPosition: number;
	private cursorSpeed: number;
	private element: JQuery;
	private inputCursor: string;
	private inputLeft: string;
	private inputRight: string;
	private inputMask: string;
	private inputHistory: string[];
	private inputHistoryIndex: number;
	private scrollback: ScrollbackLine[];
	private scrollbackMaxLength: number;
	private defaultPrompt: string;
	private prompt: string;
	private promptResolve: Function;
	private promptReject: Function;
	private promptedInput: string;
	private promptingInput: boolean;
	private lastShownTimestamp: Date;
	private hasServerError: boolean;
	private eventStreamSubscription: Subscription;

	@Input()
	domId: string;

	constructor(
		private autocompleteService: AutocompleteService,
		private sessionService: SessionService,
		private terminalEventService: TerminalEventService
	) {
		this.cursorSpeed = 500; // Cursor blink rate in milliseconds
		this.inputRight = ""; // User input string to right of cursor
		this.inputHistory = []; // User input history
		this.inputHistoryIndex = 0; // 0-based index of currently shown input history
		this.scrollback = []; // Scrollback buffer
		this.scrollbackMaxLength = 5000; // Max number of scrollback lines
		this.defaultPrompt = "fb> "; // Default command prompt
		this.prompt = this.defaultPrompt; // Current command prompt

		// Initialise empty command line
		this.deleteLine();
	}

	ngOnInit() {
		this.subscribeToEventStream()
			.then((subscription: Subscription) => {
				this.eventStreamSubscription = subscription;
			});
	}

	ngAfterViewInit() {
		// Initialise jQuery reference to this component's toplevel element.
		this.element = $(`#${this.domId}`);
	}

	ngAfterViewChecked() {
		// Bootstrap: Opt-in to tooltip data API
		$('[data-toggle="tooltip"]').tooltip();
	}

	private createInteractiveChunk(item: any, index: number, arr: Array<EventStreamItem>): ChunkWrapper {
		// Metadata passed to InteractiveChunkComponent
		//   (as ScrollbackChunk.interactive)
		// in addition to item.rich
		//   (as ScrollbackChunk.type)
		var interactive: any;

		// Where in the current line the created chunk should be inserted
		var placement = ChunkWrapper.PlacementEnd;

		// Text to be dislayed in terminal for this chunk
		var text: string = "";

		switch(item.rich) {
		case "image":
			interactive = {
				id: item.id,
				url: Urls.wobProperty(item.id, item.property),
				alt: item.text
			};

			// If an image is the first chunk on a line, float it left
			if (index == 0) {
				interactive.float = "left";
			}
			// If an image is the last chunk on a line, float it right
			else if (index == arr.length - 1) {
				interactive.float = "right";
				// To ensure that floating image is displayed on the same line
				// as other content on this line, it must be inserted before
				// other content.
				placement = ChunkWrapper.PlacementStart;
			}

			break;
		case "wob":
			interactive = {
				id: item.id
			};
			text = item.text;
			break;
		}
		return {
			chunk: new ScrollbackChunk(item.rich, text, interactive),
			placement: placement
		}
	}

	private handleOutput(data: EventStream) {
		var isFirstLine: boolean = true;

		//console.debug("Handling output:", data);
		if (data.error) {
			// Log detailed error to console
			console.log("Error received by TerminalComponent.handleOutput():", data.error);

			// Show friendly error message on terminal
			if (!this.hasServerError) {
				// If session error
				if (data.error.match(/Missing bearer token/) ||
					data.error.match(/Token validation error/) ||
					data.error.match(/Not logged in/)
				) {
					// Clear locally-stored session data, as it is invalid
					this.sessionService.logout();

					// Provide user with instructions
					this.appendLine("text-info", "You are not logged in, or your session is invalid. To log in, type:")
					this.appendLine("text-info", "  login");
					this.appendLine("text-info", "To log out afterward, type:");
					this.appendLine("text-info", "  logout");
				}
				else {
					this.appendLine(new ScrollbackLine(new ScrollbackChunk("text-danger", "Connection to server was interrupted. Until the connection is restored, you will not be able to interact with the world."), new Date()));
					this.appendLine(new ScrollbackLine(new ScrollbackChunk("text-danger", "Trying to reconnect...")));
				}
				this.scrollToBottom();
			}

			// Indicate that an error is currently happening
			this.hasServerError = true;

			// Skip regular data processing
			return;
		}
		else {
			// If we were in an error state, notify the user that we have
			// recovered.
			//
			// DON'T notify the user about recovery if we're not currently
			// logged in, as the apparent recovery may be a response to the
			// last new-event check submitted before a session error.
			if (this.hasServerError && this.sessionService.isLoggedIn()) {
				this.appendLine(new ScrollbackLine(new ScrollbackChunk("text-success", "Reconnected!"), new Date()));
				this.scrollToBottom();

				// Indicate that no error is currently happening
				this.hasServerError = false;
			}
		}

		data.log.forEach((log) => {
			var chunks: ScrollbackChunk[] = [];
			var lineType: string;
			var timestamp: Date = new Date(log.timestamp);

			// If a hear log entry exists, but it has no items, then the Server
			// is informing us that it means to display a blank line
			if (log.items.length == 0) {
				chunks.push(new ScrollbackChunk("blank", " "));
			}
			else {
				switch(log.type) {
				case EventStreamItem.TypeCommand: // echoed command
					// If this command hasn't already been locally echoed,
					// it either came from a previous session or other
					// simultaneously connected session. Display it.
					if (log.tag != this.terminalEventService.tag) {
						chunks.push(new ScrollbackChunk("command", this.prompt + log.items[0]));
					}
					// Skip processing this line (i.e. don't display a
					// blank line) if this command has already been
					// locally echoed
					else {
						return;
					}
					break;
				case EventStreamItem.TypeDebug: // debug message
					if (Config.debug) {
						lineType = lineType ? lineType : "text-info";
					}
					else {
						break;
					}
				case EventStreamItem.TypeParseError: // parsing error
				case EventStreamItem.TypeScriptError: // scripting error
				case EventStreamItem.TypeError: // data error
					lineType = lineType ? lineType : "text-warning";
				case EventStreamItem.TypeOutput: // generic output
					lineType = lineType ? lineType : "output";
					log.items.forEach((item, index, arr) => {
						if (typeof(item) === "object") {
							// If item is not plain text, create an interactive
							// chunk based on item's object properties
							let wrappedChunk = this.createInteractiveChunk(item, index, arr);

							// Check whether the resultant chunk should be
							// placed at the start or end of the current line
							if (wrappedChunk.placement == ChunkWrapper.PlacementStart) {
								chunks.unshift(wrappedChunk.chunk);
							}
							else if (wrappedChunk.placement == ChunkWrapper.PlacementEnd) {
								chunks.push(wrappedChunk.chunk);
							}
						}
						else {
							chunks.push(new ScrollbackChunk(lineType, item));
						}
					});
					break;
				}
			}

			// Show a timestmap on this line if:
			//  - It is the first line in the EventStream (e.g. new message or
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

	private loginPrompt(): Promise<string> {
		var username, password;

		return this.promptInput("Username: ")
			.then((response: string) => {
				username = response;
				return this.promptInput("Password: ", "*");
			})
			.then((response: string) => {
				password = response;
				return this.sessionService.login(username, password);
			})
			.then((response: string) => {
				this.appendLine("text-info", response);
				return response;
			},
			(error: string) => {
				this.appendLine("text-danger", error);
				return this.loginPrompt();
			})
	}

	private subscribeToEventStream(): Promise<Subscription> {
		// If not yet logged in, first attempt to log in
		if (!this.sessionService.isLoggedIn()) {
			return this.loginPrompt()
				.then((response: string) => {
					// When login successful,
					// subscribe to output from the TerminalEventService
					return this.terminalEventService.output.subscribe(
						this.handleOutput.bind(this)
					);
				});
		}
		else {
			// Subscribe to output from the TerminalEventService
			return Promise.resolve(
				this.terminalEventService.output.subscribe(
					this.handleOutput.bind(this)
				)
			);
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
		this.inputCursor = "\xa0"; // non-breaking space
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
		var command = this.getCommand();

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
			this.inputCursor = "\xa0"; // non-breaking space
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
			this.inputCursor = "\xa0"; // non-breaking space
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
		this.sessionService.getPlayerInfo()
			.then((data) => {
				return this.autocompleteService.completeCommand(this.inputLeft, data.container);
			})
			.then((completions: string[]) => {
				var inCommon: string;

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

		if (matches = command.match(/^login$/)) {
			this.loginPrompt();

			// This command should be consumed (not executed on server)
			processOnServer = false;
		}
		else if (matches = command.match(/^logout$/)) {
			// Delete authorization token from local stores
			this.sessionService.logout();

			// Tell the user they've been logged out
			this.appendLine("text-info", "Logged out. To log back in, type:");
			this.appendLine("text-info", "  login");

			// This command should be consumed (not executed on server)
			processOnServer = false;
		}

		return processOnServer;
	}

	promptInput(prompt: string, mask?: string): Promise<string> {
		return new Promise((resolve, reject) => {
			// Set a special prompt
			this.prompt = prompt;

			// Set character to echo instead of actual character typed by user
			this.inputMask = mask;

			// Indicate that the next command should be treated as a response
			// to this prompt instead of being processed as a regular command
			this.promptingInput = true;

			// Make it possible to resolve or reject this promise from outside
			// of this function
			this.promptResolve = resolve;
			this.promptReject = reject;
		});
	}

	getCommand(): string {
		return this.inputLeft + (this.cursorAtEnd ? "" : this.inputCursor + this.inputRight);
	}

	submitInput() {
		var command = this.getCommand();

		// If command is not blank...
		if (command.trim()) {
			// Append input to scrollback buffer
			this.appendLine("command", this.prompt
				+ (this.inputMask ? new MaskPipe().transform(command, this.inputMask) : command),
				new Date());

			// If awaiting input from the user in response to a specific prompt
			if (this.promptingInput) {
				// Reset prompt to standard appearance
				this.prompt = this.defaultPrompt;
				this.promptingInput = false;
				// Disbale input mask
				this.inputMask = undefined;

				// Treat this command as the response to a prompt
				this.promptResolve(command);
			}
			else {
				// Append command to input history
				this.inputHistory.push(command);
				this.inputHistoryIndex = this.inputHistory.length;

				// Attempt to execute this as a local command
				if (this.localExec(command)) {
					// If the command was not consumed by local execution,
					// attempt to execute it on the server
					this.terminalEventService.exec(command);
				}
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
