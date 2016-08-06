import { Injectable } from "@angular/core";
import { Headers, Http, Response } from "@angular/http";
import "rxjs/add/operator/toPromise";
import { Urls } from "./urls";
import { AttachedItem, Info, InfoList } from "./wob";

@Injectable()
export class AutocompleteService {
	constructor(
		private http: Http
	) {
		// Dependency injection only; no code
	}

	private handleServerError(response: Response): Promise<void> {
		if (response.status) {
			return Promise.reject(`Server error: ${response.status} ${response.statusText}`);
		}
		else {
			return Promise.reject("Could not connect to server.");
		}
	}

	private progressiveWordList(command: string): string[] {
		var lastWordBoundary: number = +Infinity
		var wordList: string[] = [];

		// Create an array containing the last word in the command, then the
		// last 2 words in the command, and so on.
		while (lastWordBoundary != -1) {
			lastWordBoundary = command.lastIndexOf(" ", lastWordBoundary - 1);
			if (command.charAt(lastWordBoundary + 1) != " ") {
				wordList.push(command.substring(lastWordBoundary + 1));
			}
		}

		console.log("Returning word list:", wordList);
		return wordList;
	}

	completeCommand(command: string, locationId: number): Promise<string[]> {
		command = command.toLowerCase();
		var wordList: string[] = this.progressiveWordList(command);
		var completions: any;
		var includeVerbs: boolean;
		var matches: string[];
		var prevMatches: string[];
		var prevMatchesIndex: number;
		var word: string;

		// TODO: Cache data for locations. For now, simply query the server
		// anew for each attempted auto-completion.
		return this.getWobs(locationId)
			.then((data: InfoList) => {
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
					completions = {};
					matches = [];
					word = wordList[i];

					console.log("Current word:", word);

					data.list.forEach((wob: Info) => {
						// If including verbs in the search...
						if (includeVerbs) {
							wob.verbs.forEach((verb: AttachedItem) => {
								// For each verb, check whether the verb starts
								// with the same characters as the current word
								if (verb.value.toLowerCase().match("^" + word)) {
									// Assign matches to object properties, to
									// ensure each value is distinct
									console.log("Matched verb:", verb.value);
									completions[verb.value] = true;
								}
							});
						}

						// Check whether this wob's aname starts with the same
						// characters as the current word
						console.log("Wob match term:", "^" + word);
						if (wob.name.toLowerCase().match("^" + word)) {
							// Assign matches to object properties, to
							// ensure each value is distinct
							console.log("Matched wob:", wob.name);
							completions[wob.name] = true;
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

				if (matches.length && prevMatchesIndex < wordList.length - 1) {
					matches = matches.map((match) => {
						var start = command.indexOf(wordList[prevMatchesIndex]);
						return command.substring(0,  command.indexOf(wordList[prevMatchesIndex])) + match;
					});
				}

				return matches;
			});
	}

	getWobs(locationId: number) {
		return this.http.get(Urls.worldWob + locationId + "/contents")
			.toPromise()
			.then((response: Response) => {
				var data: InfoList = response.json();
				return data;
			},
			this.handleServerError.bind(this));
	}
}
