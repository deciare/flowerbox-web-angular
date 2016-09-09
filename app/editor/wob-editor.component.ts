/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs/Subscription";

import { SessionService } from "../session/session.service";

@Component({
	moduleId: module.id,
	selector: "wob-editor",
	styleUrls: [
		"./wob-editor.component.css"
	],
	templateUrl: "./wob-editor.component.html"
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

	protected isInherited(value: any): boolean {
		return value.sourceId !== this.wobId;
	}

	protected refocus(id: string) {
		var element : JQuery = $(`#${id}`);

		if (!element.length) {
			// If selector matched no elements, it may be unfocusable. Bail.
			return;
		}

		// Obtain the current cursor position of the field.
		var pos = (<HTMLInputElement>element.focus().get(0)).selectionStart;

		// After DOM updates, reset the cursor to that position.
		setTimeout(() => {
			// Re-run the query, as the originally selected element may no
			// longer exist.
			(<HTMLInputElement>$(`#${id}`).focus().get(0)).setSelectionRange(pos, pos);
		}, 0);
	}
}
