/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs/Subscription";

import { Property, WobEditState } from "./wob";

import { WobService } from "./wob.service";

@Component({
	moduleId: module.id,
	selector: "property-editor",
	templateUrl: "./property-editor.component.html"
})
export class PropertyEditorComponent implements OnDestroy, OnInit {
	routeDataSubscription: Subscription;
	wobEditState: WobEditState;
	properties: Property[];

	constructor(
		private route: ActivatedRoute,
		private wobService: WobService
	) {
		this.properties = [];
	}

	private onWobEditStateChange(data: WobEditState): void {
		var foundIndex: number;

		// Record new wobEditState
		this.wobEditState = data[0];

		// Iterate through applied properties
		this.wobEditState.applied.properties.forEach((property) => {
			// Create array of properties that are currently applied
			property.status = Property.StatusApplied;
			this.properties.push(property);
		});

		// Iterate through draft properties
		this.wobEditState.draft.properties.forEach((property) => {
			// Check whether a corresponding applied property exists in
			// array.
			if ((foundIndex = this.properties.findIndex((value: Property) => {
					return value.name == property.name;
				})) != -1
			) {
				// If so, replace that property with draft version.
				this.properties[foundIndex] = property;
			}
			else {
				// If not, append draft property to end of array
				property.status = Property.StatusDraft;
				this.properties.push(property);
			}
		});
	}

	ngOnInit() {
		this.routeDataSubscription = this.route.data.subscribe(this.onWobEditStateChange.bind(this));
	}

	ngOnDestroy() {
		this.routeDataSubscription.unsubscribe();
	}

	save(property: Property): Promise<any> {
		return this.wobService.setProperty(this.wobEditState.id, property.name, property.value);
	}
}
