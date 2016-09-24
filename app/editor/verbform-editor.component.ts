/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { AfterViewInit, Component, EventEmitter, Output } from "@angular/core";

import { Tag } from "../shared/tag";
import { VerbSignature } from "../types/wob";

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
export class VerbformEditorComponent implements AfterViewInit {
	private objects: any = {
		"__invalid__":	"(not selected)",
		"none":			"none",
		"self":			"self",
		"any":			"any"
	};
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
	private element: JQuery;
	private verbform: VerbSignature;

	@Output()
	save: EventEmitter<VerbSignature>;

	constructor() {
		this.save = new EventEmitter<VerbSignature>();
		this.domId = "verbform-editor-" + Tag.makeTag(3);
	}

	ngAfterViewInit() {
		this.element = $(`#${this.domId}`);
	}

	onSubmit() {
		var output = [];

		// Append fields to the output verbform until the first invalid field
		// is encountered.
		for (let i = 0; i < this.verbform.words.length; i++) {
			if (this.verbform.words[i] == "__invalid__") {
				break;
			}
			output.push(this.verbform.words[i]);
		}

		this.save.emit(new VerbSignature(output.join(" ")));
		this.element.modal("hide");
	}

	open(verbform: VerbSignature) {
		this.element.modal();
		this.verbform = new VerbSignature(verbform.words.map((word, index) => {
			if (word === undefined || word === null || word === "") {
				return "__invalid__";
			}
			else {
				return word;
			}
		}).join(" "));
	}
}