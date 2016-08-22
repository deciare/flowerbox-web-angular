/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs/Subscription";

import { WobEditState } from "../models/wob";

@Component({
	selector: "verb-editor",
	template: `
		<div>Verb editor</div>
	`
})
export class VerbEditorComponent implements OnDestroy, OnInit {
	routeDataSubscription: Subscription;
	wobEditState: WobEditState;
	wobEditStateString: string;

	constructor(
		private route: ActivatedRoute
	) {
	}

	ngOnInit() {
		this.routeDataSubscription = this.route.data.subscribe((data: WobEditState) => {
			this.wobEditState = data;
			this.wobEditStateString = JSON.stringify(this.wobEditState);
			console.log(this.wobEditState);
		});
	}

	ngOnDestroy() {
		this.routeDataSubscription.unsubscribe();
	}
}
