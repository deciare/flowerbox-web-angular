/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { AfterViewInit, Component, EventEmitter, Output } from "@angular/core";

import { Tag } from "../shared/tag";

import { Permissions } from "../types/permission";
import { Property, Verb } from "../types/wob";

@Component({
	moduleId: module.id,
	selector: "permission-editor",
	styleUrls: [
		"./wob-editor.component.css",
		"./permission-editor.component.css"
	],
	templateUrl: "./permission-editor.component.html"
})
export class PermissionEditorComponent implements AfterViewInit {
	private domId: string;
	private element: JQuery;
	private item: Property | Verb;

	@Output()
	permissionsChange: EventEmitter<Property | Verb>;

	constructor() {
		this.domId = "permission-editor-" + Tag.makeTag(4);
		this.permissionsChange = new EventEmitter<Property>();
	}

	private isProperty() {
		return this.item instanceof Property;
	}

	private isVerb() {
		return this.item instanceof Verb;
	}

	ngAfterViewInit() {
		this.element = $(`#${this.domId}`);
	}

	onSubmit() {
		this.item.perms = this.item.permsEffective;
		this.permissionsChange.emit(this.item);
		this.element.modal("hide");
	}

	open(item: Property | Verb) {
		if (item instanceof Property) {
			this.item = new Property(
				item.sourceId,
				item.name,
				item.value,
				false,
				item.isDraft,
				item.perms ? item.perms.toString() : undefined,
				item.permsEffective ? item.permsEffective.toString() : undefined
			);
		}
		else if (item instanceof Verb) {
			this.item = new Verb(
				item.sourceId,
				item.name,
				item.sigs.map((sig) => {
					return sig.value;
				}),
				item.code,
				item.isDraft,
				item.perms ? item.perms.toString() : undefined,
				item.permsEffective ? item.permsEffective.toString() : undefined
			);
		}
		this.element.modal();
	}
}