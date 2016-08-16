/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, ViewEncapsulation } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs/Subscription";

@Component({
	moduleId: module.id,
	selector: "wob-editor",
	encapsulation: ViewEncapsulation.None,
	template: `
		<nav>
			<a [routerLink]="['properties']" routerLinkActive="active">Properties</a>
			<a [routerLink]="['verbs']" routerLinkActive="active">Verbs</a>
		</nav>
		<router-outlet></router-outlet>
	`
})
export class WobEditorComponent {
	routeParamsSubscription: Subscription;

	constructor(
		private route: ActivatedRoute
	) {
	}
}
