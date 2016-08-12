import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs/Subscription";

import { WobEditState } from "./wob";

@Component({
	selector: "property-editor",
	template: `
		<div>Property editor {{wobEditStateString}}</div>
	`
})
export class PropertyEditorComponent implements OnDestroy, OnInit {
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
