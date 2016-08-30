/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, ViewEncapsulation } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs/Subscription";

import { SessionService } from "../session/session.service";

@Component({
	moduleId: module.id,
	selector: "wob-editor",
	encapsulation: ViewEncapsulation.None,
	styleUrls: [
		"./wob-editor.component.css"
	],
	template: `
		<nav>
			<a [routerLink]="['properties']" routerLinkActive="active">Properties</a>
			<a [routerLink]="['verbs']" routerLinkActive="active">Verbs</a>
		</nav>
		<router-outlet></router-outlet>
	`
})
export class WobEditorComponent {
	protected wobId: number;

	constructor(
		protected sessionService: SessionService
	) {
		// Dependency injection only; no code
	}

	protected canHasAdmin(): boolean {
		return this.sessionService.canHasAdmin;
	}

	protected fixType(value: any): any {
		// If the value is numeric, convert it to a number; the server is
		// type-sensitive.
		var numericValue = +value;
		if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
			return numericValue;
		}
		// If value appears to be boolean, conver it to an actual boolean value.
		else if (value === "true") {
			return true;
		}
		else if (value === "false") {
			return false;
		}
		else if (value === "null") {
			return null;
		}
		else if (value === "undefined") {
			return undefined;
		}
		// If no primitive type matched, return the original value.
		else {
			return value;
		}
	}

	protected isInherited(value: any): boolean {
		return value.id !== this.wobId;
	}

	protected refocus(id: string) {
		// Obtain the current cursor position of the field.
		var pos = (<HTMLInputElement>$(`#${id}`).focus().get(0)).selectionStart;

		// After DOM updates, reset the cursor to that position.
		setTimeout(() => {
			(<HTMLInputElement>$(`#${id}`).focus().get(0)).setSelectionRange(pos, pos);
		}, 0);
	}
}
