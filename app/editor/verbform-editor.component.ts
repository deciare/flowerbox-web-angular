/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { Tag } from "../shared/tag";

@Component({
	moduleId: module.id,
	selector: "verbform-editor",
	styleUrls: [
		"./wob-editor.component.css",
		"./verb-editor.component.css",
		"./verbform-editor.component.css"
	],
	templateUrl: "./verbform-editor.component.html"
})
export class VerbformEditorComponent {
	private objects: string[] = [
		"none",
		"self",
		"any"
	];
	private prepositions: any = {
		"__invalid__":	[ "(not selected)" ],
		"with":			[ "with", "using" ],
		"at":			[ "at", "to", "toward" ],
		"in":			[ "in", "inside", "into", "within" ],
		"on":			[ "on", "on top of", "onto", "upon", "above", "over" ],
		"from":			[ "from", "out of", "from inside" ],
		"through":		[ "through" ],
		"under":		[ "under", "underneath", "beneath" ],
		"behind":		[ "behind" ],
		"infrontof":	[ "in front of" ],
		"beside":		[ "beside" ],
		"for":			[ "for", "about" ],
		"is":			[ "is" ],
		"as":			[ "as" ],
		"around":		[ "around" ],
		"off":			[ "off", "off of", "away from" ]
	};

	private domId: string;
	private verbform: string[];


	@Output()
	save: EventEmitter<string>;

	constructor() {
		this.save = new EventEmitter<string>();
		this.domId = "verbform-editor-" + Tag.makeTag(3);
	}

	isFieldApplicable(index: number, allowPlaceholderPrep?: boolean): boolean {
		if (index == 0) {
			// The name of the verb is always applicable.
			return true;
		}

		if (index % 2) {
			// Odd-numbered indeces are objects. Objects are only applicable if
			// the preceding preposition is applicable.
			return this.verbform[index - 1] !== "__invalid__";
		}
		else {
			// Even-numbered indeces are prepositions. Prepositions are
			// applicable when they are either:
			//  - Not blank
			//  - A placeholder, and allowPlaceholderPrep is true, and the
			//    previous preposition is not also a placeholder
			if (this.verbform[index] !== "__invalid__" ||
				(
					allowPlaceholderPrep &&
					this.verbform[index - 2] !== "__invalid__"
				)
			) {
				return true;
			}
			else {
				return false;
			}
		}
	}

	onSubmit() {
		var output = [];

		// Append fields to the output verbform until the first invalid field
		// is encountered.
		for (let i = 0; i < this.verbform.length; i++) {
			if (this.isFieldApplicable(i)) {
				output.push(this.verbform[i]);
			}
			else {
				break;
			}
		}

		this.save.emit(output.join(" "));
	}

	open(verbform: string) {
		$(`#${this.domId}`).modal();
		this.verbform = verbform.split(" ");

		// If the verbformt hat was passed in doesn't use all available slots,
		// pad it with placeholder slots.
		for (let i = this.verbform.length; i < 6; i++) {
			this.verbform.push(i % 2 ? "none" : "__invalid__");
		}
	}
}