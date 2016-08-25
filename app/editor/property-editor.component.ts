/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs/Subject";
import { Subscription } from "rxjs/Subscription";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/distinctUntilChanged";

import { ModelBase } from "../models/base";
import { Intrinsic, Property, WobEditState, WobInfo } from "../models/wob";

import { SessionService } from "../session/session.service";
import { WobService } from "../api/wob.service";

@Component({
	moduleId: module.id,
	selector: "property-editor",
	templateUrl: "./property-editor.component.html"
})
export class PropertyEditorComponent implements OnDestroy, OnInit {
	private draftUpdate: Subject<Intrinsic | Property>;
	private draftUpdateSubscription: Subscription;
	private routeDataSubscription: Subscription;
	private routeParentParamsSubscription: Subscription;

	asAdmin: boolean;
	wobId: number;
	intrinsics: Intrinsic[];
	properties: Property[];
	message: string;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private sessionService: SessionService,
		private wobService: WobService
	) {
		this.asAdmin = false;
		this.intrinsics = [];
		this.properties = [];
	}

	private canHasAdmin(): boolean {
		return this.sessionService.canHasAdmin;
	}

	private fixType(value: any): any {
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

	private isInherited(value: any): boolean {
		return !this.isIntrinsic(value) && value.id !== this.wobId;
	}

	private isIntrinsic(value: any): boolean {
		return value instanceof Intrinsic;
	}

	private onWobEditStateChange(data: WobEditState): void {
		var wobEditState: WobEditState = data["wobEditState"];

		this.wobId = wobEditState.id;

		// Iterate through applied intrinsic properties
		wobEditState.applied.intrinsics.forEach((intrinsic) => {
			// Create array of properties that are currently applied
			intrinsic.isDraft = false;
			this.intrinsics.push(intrinsic);
		});

		// Iterate through applied properties
		wobEditState.applied.properties.forEach((property) => {
			// Create array of properties that are currently applied
			property.isDraft = false;
			this.properties.push(property);
		});

		// For each draft that exists for an intrinsic or property, overwrite
		// what's displayed on the form with the draft version.
		wobEditState.draft.intrinsics.forEach((intrinsic) => {
			this.useDraft(intrinsic);
		});
		wobEditState.draft.properties.forEach((property) => {
			this.useDraft(property);
		});
	}

	private replaceField(item: Intrinsic | Property) {
		var foundIndex: number;
		var arrName = this.isIntrinsic(item) ? "intrinsics" : "properties";

		// Check whether a corresponding applied property exists in
		// array.
		if ((foundIndex = this[arrName].findIndex((value) => {
				return value.name == item.name;
			})) != -1
		) {
			// If so, replace that property with draft version.
			this[arrName][foundIndex] = item;
		}
		else {
			// If not, append draft property to end of array
			this[arrName].push(item);
		}
	}

	private useApplied(item: Intrinsic | Property) {
		item.isDraft = false;
		this.replaceField(item);
	}

	private useDraft(item: Intrinsic | Property) {
		item.isDraft = true;
		this.replaceField(item);
	}

	ngOnInit() {
		this.routeDataSubscription = this.route.data.subscribe(this.onWobEditStateChange.bind(this));

		this.routeParentParamsSubscription = this.route.parent.params.subscribe((params) => {
			this.asAdmin = params["admin"] == "true" ? true : false;
		});

		// Prepare Observable through which will be notified whenever a form
		// field changes, and subscribe to it.
		this.draftUpdate = new Subject<Property>();
		this.draftUpdateSubscription = this.draftUpdate
			.debounceTime(1000)
			.distinctUntilChanged()
			.subscribe(this.saveDraft.bind(this));
	}

	ngOnDestroy() {
		this.routeDataSubscription.unsubscribe();
		this.routeParentParamsSubscription.unsubscribe();
		this.draftUpdateSubscription.unsubscribe();
	}

	onChange(property: any, newValue: string) {
		var arrName: string;
		var propertyDraft: Intrinsic | Property;

		if (property.isDraft) {
			// If the form field that was modified represents a property draft,
			// simply update the draft with the new value.
			property.value = newValue;
		}
		else {
			// Otherwise, create a draft version of the same property.
			if (this.isIntrinsic(property)) {
				arrName = "intrinsics";
				propertyDraft = new Intrinsic(
					property.name,
					newValue,
					true
				);
			}
			else {
				arrName = "properties";
				propertyDraft = new Property(
					this.wobId,
					property.name,
					newValue,
					property.perms,
					undefined,
					true
				);
			}

			// Replace the form field with one represending the draft property.
			this.useDraft(propertyDraft);

			// draftUpdate should receive a copy of the draft instead of the
			// applied property.
			property = propertyDraft;

			// Refocus the form field after the template change.
			this.refocus(property.name);
		}

		// Notify observer that property has been changed.
		this.draftUpdate.next(property);
	}

	refocus(id: string) {
		// Obtain the current cursor position of the field.
		var pos = (<HTMLInputElement>$(`#${id}`).focus().get(0)).selectionStart;

		// After DOM updates, reset the cursor to that position.
		setTimeout(() => {
			(<HTMLInputElement>$(`#${id}`).focus().get(0)).setSelectionRange(pos, pos);
		}, 0);
	}

	reloadAsAdmin() {
		this.router.navigate([ '/wob', this.wobId, { admin: true } ]);
	}

	delete(property: Intrinsic | Property): Promise<any> {
		if (this.isIntrinsic(property)) {
			return Promise.reject("Can't delete intrinsic property");
		}
		else {
			return this.wobService.deleteProperty(this.wobId, property.name, this.asAdmin)
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
	}

	deleteDraft(property: Intrinsic | Property): Promise<any> {
		var deleteDraftPromise: Promise<ModelBase>;

		if (this.isIntrinsic(property)) {
			deleteDraftPromise = this.wobService.deleteIntrinsicDraft(this.wobId, property.name)
		}
		else {
			deleteDraftPromise = this.wobService.deletePropertyDraft(this.wobId, property.name)
		}

		return deleteDraftPromise
			.then((data: ModelBase) => {
				this.message = "Discarded draft of " + property.name;
				// Attempt to retrieve applied version of property whose draft
				// was just deleted.
				if (this.isIntrinsic(property)) {
					return this.wobService.getInfo(this.wobId)
						.then((info: WobInfo) => {
							return new Intrinsic(property.name, info[property.name]);
						});
				}
				else {
					return this.wobService.getProperty(this.wobId, property.name, this.asAdmin);
				}
			})
			.then((property: Property) => {
				// If draft successfully retrieved, replace the form field with
				// the applied version of the same property.
				this.useApplied(property);

				// Refocus form field after it is replaced
				this.refocus(property.name);

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
				// New property belongs to the wob being edited
				this.wobId,
				// User provides name
				name,
				// Empty value
				"",
				// Default permission: inherit server default
				undefined,
				// No sub-property
				undefined,
				// Is a draft
				true
			));

			// Focus the newly created field.
			setTimeout(() => {
				$(`#${name}`).focus();
			}, 0);
		}
	}

	saveAll(): Promise<any> {
		var saveIntrinsicsPromise: Promise<ModelBase>;
		var savePropertiesPromise: Promise<ModelBase>;
		var toDelete: any[] = [];

		// Generate list of intrinsic properties to save.
		var intrinsicsObj = {};
		this.intrinsics.forEach((intrinsic: Intrinsic) => {
			intrinsicsObj[intrinsic.name] = this.fixType(intrinsic.value);

			// Draft properties should be deleted after the saveAll() completes
			if (intrinsic.isDraft) {
				toDelete.push(intrinsic);
			}
		});
		saveIntrinsicsPromise = this.wobService.setIntrinsics(this.wobId, intrinsicsObj, this.asAdmin);

		// Generate list of properties to save.
		var propertiesObj = {};
		this.properties.forEach((property: Property) => {
			propertiesObj[property.name] = this.fixType(property.value);

			// Draft properties should be deleted after the saveAll() completes
			if (property.isDraft) {
				toDelete.push(property);
			}
		});
		savePropertiesPromise = this.wobService.setProperties(this.wobId, propertiesObj, this.asAdmin);

		return Promise.all([ saveIntrinsicsPromise, savePropertiesPromise ])
			.then((data: ModelBase[]) => {
				this.message = "All properties saved";
				toDelete.forEach((item: Intrinsic | Property) => {
					return this.deleteDraft(item);
				});
			},
			(error) => {
				this.message = "Could not save all properties: " + error;
			});
	}

	save(property: Intrinsic | Property): Promise<any> {
		var savePromise: Promise<ModelBase>;

		// All form fields are strings, but server may expect other type.
		property.value = this.fixType(property.value);

		if (this.isIntrinsic(property)) {
			// Save the given value as an applied intrinsic property.
			savePromise = this.wobService.setIntrinsic(this.wobId, property.name, property.value, this.asAdmin)
		}
		else {
			// Save the given value as an applied property.
			savePromise = this.wobService.setProperty(this.wobId, property.name, property.value, this.asAdmin)
		}

		return savePromise
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

	saveDraft(property: Intrinsic | Property): Promise<any> {
		var saveDraftPromise: Promise<ModelBase>;

		// All form fields are strings, but server may expect other type.
		property.value = this.fixType(property.value);

		if (this.isIntrinsic(property)) {
			saveDraftPromise = this.wobService.setIntrinsicDraft(this.wobId, property.name, property.value)
		}
		else {
			saveDraftPromise = this.wobService.setPropertyDraft(this.wobId, property.name, property.value)
		}

		return saveDraftPromise
			.then((data: ModelBase) => {
				this.message = "Saved draft of " + property.name;
			},
			(error) => {
				this.message = "Could not save draft: " + error;
			});
	}
}
