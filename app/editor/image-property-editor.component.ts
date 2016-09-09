/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

import { GenericPropertyEditorComponent } from "./generic-property-editor.component";

import { WobService } from "../api/wob.service";

@Component({
	moduleId: module.id,
	selector: "image-property-editor",
	styleUrls: [
		"./generic-property-editor.component.css",
		"./image-property-editor.component.css"
	],
	templateUrl: "./image-property-editor.component.html"
})
export class ImagePropertyEditorComponent extends GenericPropertyEditorComponent {
	constructor(
		domSanitizer: DomSanitizer,
		wobService: WobService
	) {
		super(domSanitizer, wobService);
	}
}
