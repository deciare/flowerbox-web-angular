/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";

import { Permissions } from "../types/permission";
import { Property, Verb } from "../types/wob";

import { PermissionEditorComponent } from "./permission-editor.component";

@Component({
	moduleId: module.id,
	selector: "permissions",
	styleUrls: [
		"./wob-editor.component.css"
	],
	templateUrl: "./permissions.component.html"
})
export class PermissionsComponent {
	@Input()
	inherited: boolean;

	@Input()
	item: Property | Verb;

	@Output()
	permissionsChange: EventEmitter<Permissions>;

	@ViewChild(PermissionEditorComponent)
	editor: PermissionEditorComponent;

	constructor() {
		this.permissionsChange = new EventEmitter<Permissions>();
	}

	onPermissionsChange(item: Property | Verb) {
		this.item = item;
		this.permissionsChange.emit(item.perms);
	}
}
