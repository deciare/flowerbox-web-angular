/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnChanges, SimpleChanges } from "@angular/core";

import { Property } from "../models/wob";
import { Urls } from "../shared/urls";

import { GenericPropertyEditorComponent } from "./generic-property-editor.component";

@Component({
	moduleId: module.id,
	selector: "audio-property-editor",
	styleUrls: [
		"./generic-property-editor.component.css"
	],
	templateUrl: "./audio-property-editor.component.html"
})
export class AudioPropertyEditorComponent extends GenericPropertyEditorComponent implements OnChanges {
	mediaType: string;

	ngOnChanges(changes: SimpleChanges) {
		this.mediaType = Urls.dataUriMediaType((<Property>changes["property"].currentValue).value);
	}
}
