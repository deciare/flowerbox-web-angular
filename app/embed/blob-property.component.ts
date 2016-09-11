/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

import { Property } from "../types/wob";

import { WobService } from "../api/wob.service";

@Component({})
export abstract class BlobPropertyComponent implements OnChanges, OnDestroy {
	protected objectURL: string;
	protected property: Property;

	@Input()
	wobId: number;

	@Input()
	propertyName: string;

	@Input()
	title: string;

	@Output()
	load: EventEmitter<any>;

	constructor(
		protected sanitizer: DomSanitizer,
		protected wobService: WobService
	) {
		this.load = new EventEmitter<any>();
	}

	get safeObjectURL(): string {
		return <string>this.sanitizer.bypassSecurityTrustUrl(this.objectURL);
	}

	ngOnChanges() {
		if (this.objectURL !== undefined) {
			Property.revokeObjectURL(this.objectURL);
		}

		this.wobService.getBinaryProperty(this.wobId, this.propertyName)
		 	.then((property: Property) => {
				this.handleProperty(property);
			});
	}

	ngOnDestroy() {
		if (this.objectURL !== undefined) {
			Property.revokeObjectURL(this.objectURL);
		}
	}

	abstract handleProperty(property: Property);
}
