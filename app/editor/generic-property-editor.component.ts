/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

import { Property } from "../types/wob";
import { Urls } from "../shared/urls";

import { SessionService } from "../session/session.service";

@Component({
	moduleId: module.id,
	selector: "generic-property-editor",
	template: ``
})
export class GenericPropertyEditorComponent implements OnChanges, OnDestroy {
	private _objectURL: string;

	@Input()
	property: Property;

	@Output()
	propertyChange: EventEmitter<Property>;

	@Output()
	deleteDraftClick: EventEmitter<Event>;

	@Output()
	deleteClick: EventEmitter<Event>;

	@Output()
	saveClick: EventEmitter<Event>;

	constructor(
		protected domSanitizer: DomSanitizer
	) {
		this.propertyChange = new EventEmitter<Property>();
		this.deleteDraftClick = new EventEmitter<Event>();
		this.deleteClick = new EventEmitter<Event>();
		this.saveClick = new EventEmitter<Event>();
	}

	get objectURL(): string {
		return <string>this.domSanitizer.bypassSecurityTrustUrl(this._objectURL);
	}

	set objectURL(value: string) {
		if (this._objectURL !== undefined) {
			Property.revokeObjectURL(this._objectURL);
		}
		this._objectURL = value;
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes["property"].currentValue.isBlob) {
			this.objectURL = changes["property"].currentValue.createObjectURL();
		}
	}

	ngOnDestroy() {
		if (this._objectURL !== undefined) {
			Property.revokeObjectURL(this._objectURL);
		}
	}

	onFileChange(event: Event) {
		this.property.value = (<HTMLInputElement>event.target).files[0];
		this.objectURL = this.property.createObjectURL();
		this.propertyChange.emit(this.property.value);
	}

	onModelChange(event: Event) {
		this.property.value = event;
		this.propertyChange.emit(this.property.value);
	}

	onDeleteDraftClick(event: Event) {
		this.deleteDraftClick.emit(event);
	}

	onDeleteClick(event: Event) {
		this.deleteClick.emit(event);
	}

	onSaveClick(event: Event) {
		this.saveClick.emit(event);
	}
}
