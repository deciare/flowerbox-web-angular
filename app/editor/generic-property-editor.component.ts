/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { Property } from "../models/wob";
import { Urls } from "../shared/urls";

@Component({
	moduleId: module.id,
	selector: "generic-property-editor"
})
export class GenericPropertyEditorComponent {
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

	constructor() {
		this.propertyChange = new EventEmitter<Property>();
		this.deleteDraftClick = new EventEmitter<Event>();
		this.deleteClick = new EventEmitter<Event>();
		this.saveClick = new EventEmitter<Event>();
	}

	onFileChange(event: Event) {
		Urls.blobToDataUri((<HTMLInputElement>event.target).files[0])
			.then((dataUri: string) => {
				this.property.value = dataUri;
				this.propertyChange.emit(this.property.value);
			});
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
