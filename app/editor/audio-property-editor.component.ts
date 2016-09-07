/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

import { Urls } from "../shared/urls";
import { Property } from "../types/wob";

import { GenericPropertyEditorComponent } from "./generic-property-editor.component";

@Component({
	moduleId: module.id,
	selector: "audio-property-editor",
	styleUrls: [
		"./generic-property-editor.component.css"
	],
	templateUrl: "./audio-property-editor.component.html"
})
export class AudioPropertyEditorComponent extends GenericPropertyEditorComponent {
	constructor(
		domSanitizer: DomSanitizer
	) {
		super(domSanitizer);
	}
}
