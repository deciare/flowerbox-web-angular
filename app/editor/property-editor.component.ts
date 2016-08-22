/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import { Subscription } from "rxjs/Subscription";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/distinctUntilChanged";

import { ModelBase } from "../models/base";
import { Property, WobEditState } from "../models/wob";

import { WobService } from "../api/wob.service";

@Component({
	moduleId: module.id,
	selector: "property-editor",
	templateUrl: "./property-editor.component.html"
})
export class PropertyEditorComponent implements OnDestroy, OnInit {
	routeDataSubscription: Subscription;
	wobId: number;
	properties: Property[];
	message: string;
	draftUpdateObserver: Observer<Property>;
	draftUpdateSubscription: Subscription;

	constructor(
		private route: ActivatedRoute,
		private wobService: WobService
	) {
		this.properties = [];
	}

	private onWobEditStateChange(data: WobEditState): void {
		var foundIndex: number;
		var wobEditState = data[0];

		this.wobId = wobEditState.id;

		// Iterate through applied properties
		wobEditState.applied.properties.forEach((property) => {
			// Create array of properties that are currently applied
			property.isDraft = false;
			this.properties.push(property);
		});

		// Iterate through draft properties
		wobEditState.draft.properties.forEach((property) => {
			// Check whether a corresponding applied property exists in
			// array.
			property.isDraft = true;
			if ((foundIndex = this.properties.findIndex((value: Property) => {
					return value.name == property.name;
				})) != -1
			) {
				// If so, replace that property with draft version.
				this.properties[foundIndex] = property;
			}
			else {
				// If not, append draft property to end of array
				this.properties.push(property);
			}
		});
	}

	ngOnInit() {
		this.routeDataSubscription = this.route.data.subscribe(this.onWobEditStateChange.bind(this));

		// Prepare Observable through which will be notified whenever a form
		// field changes, and subscribe to it.
		this.draftUpdateSubscription = new Observable<Property>((observer) => {
				this.draftUpdateObserver = observer;
			})
			.debounceTime(1000)
			.distinctUntilChanged()
			.subscribe(this.saveDraft.bind(this));
	}

	ngOnDestroy() {
		this.routeDataSubscription.unsubscribe();
		this.draftUpdateSubscription.unsubscribe();
	}

	onChange(property: Property, newValue: string) {
		if (property.isDraft) {
			// If the form field that was modified represents a property draft,
			// simply update the draft with the new value.
			property.value = newValue;
		}
		else {
			// Otherwise, create a draft version of the same property.
			var propertyDraft = new Property(
				property.id,
				property.name,
				newValue,
				undefined,
				true
			);

			// Replace the form field with one represending the draft property.
			var foundIndex = this.properties.findIndex((value: Property) => {
				return value.name == property.name;
			});
			this.properties[foundIndex] = propertyDraft;

			// draftUpdateObserver should receive a copy of the draft instead
			// of the applied property.
			property = propertyDraft;

			// Refocus the form field after the template change.
			var pos = (<HTMLInputElement>$(`#${property.name}`).focus().get(0)).selectionStart;
			setTimeout(() => {
				(<HTMLInputElement>$(`#${property.name}`).focus().get(0)).setSelectionRange(pos, pos);
			}, 0);
		}

		// Notify observer that property has been changed.
		this.draftUpdateObserver.next(property);
	}

	delete(property: Property): Promise<any> {
		return this.wobService.deleteProperty(this.wobId, property.name)
			.then((data: ModelBase) => {
				// Remove the property from the form.
				var foundIndex = this.properties.findIndex((value) => {
					return value.name == property.name;
				});
				if (foundIndex != -1) {
					this.properties.splice(foundIndex, 1);
				}
				this.message = "Deleted property " + property.name;
			},
			(error) => {
				this.message = "Could not delete property: " + error;
			});
	}

	deleteDraft(property: Property): Promise<any> {
		return this.wobService.deletePropertyDraft(this.wobId, property.name)
			.then((data: ModelBase) => {
				this.message = "Discarded draft of " + property.name;
				// Attempt to retrieve applied version of property whose draft
				// was just deleted.
				return this.wobService.getProperty(this.wobId, property.name);
			})
			.then((property: Property) => {
				// If draft successfully retrieved, replace the form field with
				// the applied version of the same property.
				property.isDraft = false;
				var foundIndex = this.properties.findIndex((value) => {
					return value.name == property.name;
				});
				if (foundIndex == -1) {
					this.properties.push(property);
				}
				else {
					this.properties[foundIndex] = property;
				}
				this.message += " and restored applied value";
			},
			(error) => {
				var foundIndex = this.properties.findIndex((value) => {
					return value.name == property.name;
				});
				this.properties.splice(foundIndex, 1);
				this.message = " Could not discard draft: " + error;
			});
	}

	newDraft() {
		var name = window.prompt("New property name:");
		if (name && name.trim() != "") {
			// Create form field for the new property.
			this.properties.push(new Property(
				this.wobId,
				name,
				"",
				undefined,
				true
			));

			// Focus the newly created field.
			setTimeout(() => {
				$(`#${name}`).focus();
			}, 0);
		}
	}

	saveAll(): Promise<any> {
		var propertiesObj = {};
		var toDelete: Property[] = [];
		this.properties.forEach((property: Property) => {
			propertiesObj[property.name] = property.value;

			// Draft properties should be deleted after the saveAll() completes
			if (property.isDraft) {
				toDelete.push(property);
			}
		},
		(error) => {
			this.message = error;
		});

		return this.wobService.setProperties(this.wobId, propertiesObj)
			.then((data: ModelBase) => {
				this.message = "All properties saved";
				toDelete.forEach((property: Property) => {
					return this.deleteDraft(property);
				});
			},
			(error) => {
				this.message = "Could not save all properties: " + error;
			});
	}

	save(property: Property): Promise<any> {
		// Save the current value of the form field as an applied property.
		return this.wobService.setProperty(this.wobId, property.name, property.value)
			.then((data: ModelBase) => {
				this.message = "Saved " + property.name;
				// Delete the corresponding property draft, if any.
				return this.deleteDraft(property);
			})
			.then((data: ModelBase) => {
				this.message += " and deleted draft";
			},
			(error) => {
				this.message = "Could not save property: " + error;
			});
	}

	saveDraft(property: Property): Promise<any> {
		return this.wobService.setPropertyDraft(this.wobId, property.name, property.value)
			.then((data: ModelBase) => {
				this.message = "Saved draft of " + property.name;
			},
			(error) => {
				this.message = "Could not save draft: " + error;
			});
	}
}
