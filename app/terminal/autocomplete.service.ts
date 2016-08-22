/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import "rxjs/add/operator/toPromise";

import { Urls } from "../shared/urls";
import { AttachedItem, WobInfo, WobInfoList } from "../models/wob";

import { SessionService } from "../session/session.service";
import { WobService } from "../api/wob.service";

@Injectable()
export class AutocompleteService {
	constructor(
		private sessionService: SessionService,
		private wobService: WobService
	) {
		// Dependency injection only; no code
	}

	private progressiveWordList(command: string): string[] {
		var lastWordBoundary: number = +Infinity
		var wordList: string[] = [];

		// Create an array containing the last word in the command, then the
		// last 2 words in the command, and so on.
		while (lastWordBoundary > 0) {
			// lastIndexOf searches cannot begin from a negative index, so if
			// we reach lastWordBoundary == 0, the search is over.
			lastWordBoundary = command.lastIndexOf(" ", lastWordBoundary - 1);
			if (command.charAt(lastWordBoundary + 1) != " ") {
				wordList.push(command.substring(lastWordBoundary + 1));
			}
		}

		return wordList;
	}

	completeCommand(command: string, locationId: number): Promise<string[]> {
		command = command.toLowerCase();
		var wordList: string[] = this.progressiveWordList(command);
		var completions: any;
		var includeVerbs: boolean;
		var includeWobs: boolean;
		var matches: string[];
		var prevMatches: string[];
		var prevMatchesIndex: number;
		var word: string;

		// TODO: Cache data for locations. For now, simply query the server
		// anew for each attempted auto-completion.
		return this.wobService.getContents(locationId)
			.then((data: WobInfoList) => {
				// Start by looking for matches against the last word in the
				// command, then for matches against the last 2 words in the
				// command, and so on. Continue until matches have been
				// attempted against the entire command.
				//
				// The last match(es) that are found by this process (i.e. the
				// matches that fit as much of the command string as possible)
				// are retuned as the final result.
				prevMatches = [];
				for (let i = 0; i < wordList.length; i++) {
					includeVerbs = i == wordList.length - 1; // include verbs if this is the first word in the command
					includeWobs = i < wordList.length - 1; // include wobs if this is not the first word in the command
					completions = {};
					matches = [];
					word = wordList[i];

					data.list.forEach((wob: WobInfo) => {
						// If including verbs in the search...
						if (includeVerbs) {
							wob.verbs.forEach((verb: AttachedItem) => {
								// For each verb, check whether the verb starts
								// with the same characters as the current
								// word. Exclude $verbs (which are not intended
								// to be used on the command line).
								if (!verb.value.startsWith("$") && verb.value.toLowerCase().match("^" + word)) {
									// Assign matches to object properties, to
									// ensure each value is distinct
									completions[verb.value] = true;
								}
							});
						}

						// If including wobs in the search...
						if (includeWobs) {
							// Check whether this wob's name starts with the
							// same characters as the current word
							if (wob.name.toLowerCase().match("^" + word)) {
								// Assign matches to object properties, to
								// ensure each value is distinct
								completions[wob.name] = true;
							}
						}
					});

					// Construct array of distinct matches to return
					for (let property in completions) {
						if (completions.hasOwnProperty(property)) {
							matches.push(property);
						}
					}

					// If no matches are found, restore the last-known matches
					// and proceed with the next iteration.
					if (matches.length == 0) {
						matches = prevMatches;
						continue;
					}
					// If at least one match was found, save the match(es) as
					// the last-known match, and the current index as the index
					// of the last-known match.
					prevMatchesIndex = i;
					prevMatches = matches;
				}

				// If the last-known match was found before reaching the start
				// of the command line...
				if (matches.length && prevMatchesIndex < wordList.length - 1) {
					matches = matches.map((match) => {
						// Prepend the command line up until the word(s) that
						// resulted in the last-known match.
						if (wordList[prevMatchesIndex] == "") {
							// If the last-known match was found after a word
							// boundary but before the start of the next word,
							// that means it was found at the end of the command
							// line. Simply prepend the entire command.
							return command + match;
						}
						else {
							return command.substring(0,  command.indexOf(wordList[prevMatchesIndex])) + match;
						}
					});
				}

				return matches;
			}
		);
	}
}
