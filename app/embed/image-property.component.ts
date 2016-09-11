/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

import { Property } from "../types/wob";

import { BlobPropertyComponent } from "./blob-property.component";

import { WobService } from "../api/wob.service";

// export class ImageChunk {
// 	alt: string;
// 	float: string;
// 	propertyName: string;
// 	wobId: number;
//
// 	constructor(wobId: number, propertyName: string, alt?: string, float?: string) {
// 		this.wobId = wobId;
// 		this.propertyName = propertyName;
// 		this.alt = alt;
// 		this.float = float;
// 	}
// }

@Component({
	moduleId: module.id,
	selector: "img-property",
	templateUrl: "./image-property.component.html"
})
export class ImagePropertyComponent extends BlobPropertyComponent implements OnChanges, OnDestroy {
	constructor(
		sanitizer: DomSanitizer,
		wobService: WobService
	) {
		super(sanitizer, wobService);
	}

	handleProperty(property: Property) {
		if (property.isImage) {
			this.objectURL = property.createObjectURL();
			this.load.emit(this.objectURL);
		}
		else {
			console.warn("ImagePropertyComponent: #" + this.wobId + "." + this.propertyName + " does not contain an image");
		}
	}
}
