/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

import { Subject } from "rxjs/Subject";
import { Subscription } from "rxjs/Subscription";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/distinctUntilChanged";

import { BaseModel } from "../models/base";
import { DefaultPermissionsModel, PermissionsModel, WobInfoModel } from "../models/wob";
import { Permissions } from "../types/permission";
import { Property } from "../types/wob";
import { Urls } from "../shared/urls";

import { WobService } from "../api/wob.service";

@Component({
	moduleId: module.id,
	selector: "generic-property-editor",
	template: ``
})
export class GenericPropertyEditorComponent implements OnChanges, OnDestroy, OnInit {
	private _objectURL: string;

	draftUpdate: Subject<Property>;
	draftUpdateSubscription: Subscription;
	message: string;

	@Input()
	admin: boolean;

	@Input()
	property: Property;

	@Input()
	wobId: number;

	@Output()
	propertyChange: EventEmitter<Property>;

	@Output()
	propertyDelete: EventEmitter<Property>;

	constructor(
		protected domSanitizer: DomSanitizer,
		protected wobService: WobService
	) {
		this.draftUpdate = new Subject<Property>();
		this.propertyChange = new EventEmitter<Property>();
		this.propertyDelete = new EventEmitter<Property>();
	}

	get objectURL(): string {
		return <string>this.domSanitizer.bypassSecurityTrustUrl(this._objectURL);
	}

	set objectURL(value: string) {
		if (this._objectURL !== undefined) {
			Property.revokeObjectURL(this._objectURL);
		}
		this._objectURL = value;
	}

	protected fixType(value: any): any {
		// If value is not a string, it is already the correct primitive type;
		// don't touch it.
		if (typeof value !== "string") {
			return value;
		}

		// If the value is numeric, convert it to a number; the server is
		// type-sensitive.
		var numericValue = +value;
		if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
			return numericValue;
		}

		// If value appears to be boolean, convert it to an actual boolean
		// value.
		if (value === "true") {
			return true;
		}
		else if (value === "false") {
			return false;
		}
		// If value appears to be a keyword, convert it to an actual keyword.
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

	/**
	 * Should be called when the value of the property is changed. Triggers
	 * observables and output event bindings to let observers and other
	 * components know when this property's value has changed.
	 */
	protected pushChange() {
		this.draftUpdate.next(this.property);
		this.propertyChange.emit(this.property);
	}

	/**
	 * Should be called when the value of the property is changed. Triggers
	 * observables and output event bindings to let observers and other
	 * components know when this property's value has changed.
	 */
	protected pushDelete() {
		this.propertyDelete.emit(this.property);
	}

	ngOnInit() {
		this.draftUpdateSubscription = this.draftUpdate
			.debounceTime(500)
			.distinctUntilChanged((x, y) => {
				return x.value !== y.value
			})
			.subscribe(this.saveDraft.bind(this));
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes["property"].currentValue.isBlob) {
			this.objectURL = changes["property"].currentValue.createObjectURL();
		}
	}

	ngOnDestroy() {
		this.draftUpdateSubscription.unsubscribe();
		if (this._objectURL !== undefined) {
			Property.revokeObjectURL(this._objectURL);
		}
	}

	onFileChange(event: Event) {
		// Update property value, and mark changed property as a draft.
		this.property.value = (<HTMLInputElement>event.target).files[0];
		this.property.isDraft = true;

		// Update object URL so that correct data is shown in template.
		this.objectURL = this.property.createObjectURL();

		this.pushChange();
	}

	onValueChange(event: string) {
		// Update property value, and mark the changed property as a draft.
		this.property.value = event;
		this.property.isDraft = true;

		this.pushChange();
	}

	onPermissionsChange(event: Permissions) {
		// Update property permissions, and mark the changed property as a
		// draft.
		this.property.isDraft = true;
		if (event === undefined) {
			// Permissions were unset; query default permissions from server
			this.wobService.getDefaultPermissions("property")
				.then((perms: DefaultPermissionsModel) => {
					this.property.perms = undefined;
					this.property.permsEffective = new Permissions(perms.perms);
					this.pushChange();

					// Ensure that changes propagate downward to
					// PermissionEditorComponent by changing the this.property
					// reference to trigger Angular's lifecycle hooks.
					this.property = Property.from(this.property);
				});
		}
		else {
			// Explicit permissions were set.
			this.property.perms = event;
			this.property.permsEffective = event;
			this.pushChange();

			// Ensure that changes propagate downward to
			// PermissionEditorComponent by changing the this.property
			// reference to trigger Angular's lifecycle hooks.
			this.property = Property.from(this.property);
		}
	}

	onDeleteDraftClick(event: Event) {
		this.deleteDraft();
	}

	onDeleteClick(event: Event) {
		this.delete();
	}

	onSaveClick(event: Event) {
		this.save();
	}

	delete(): Promise<BaseModel> {
		if (this.property.isIntrinsic) {
			console.warn("Can't delete intrinsic property:", this.property.name);
			return Promise.reject<BaseModel>("Can't delete intrinsic property");
		}
		else {
			return this.wobService.deleteProperty(this.wobId, this.property.name, this.admin)
				.then((data: BaseModel) => {
					this.message = "Deleted property " + this.property.name;
					this.pushDelete();

					return data;
				},
				(error) => {
					this.message = "Could not delete property: " + error;
				});
		}
	}

	deleteDraft(): Promise<BaseModel> {
		var deleteDraftPromise: Promise<BaseModel>;

		if (this.property.isIntrinsic) {
			deleteDraftPromise = this.wobService.deleteIntrinsicDraft(this.wobId, this.property.name)
		}
		else if (this.property.isBlob) {
			deleteDraftPromise = this.wobService.deleteBinaryPropertyDraft(this.wobId, this.property.name);
		}
		else {
			deleteDraftPromise = this.wobService.deletePropertyDraft(this.wobId, this.property.name)
		}

		return deleteDraftPromise
			.then((data: BaseModel) => {
				this.message = "Discarded draft of " + this.property.name;
				// Attempt to retrieve applied version of property whose draft
				// was just deleted.
				if (this.property.isIntrinsic) {
					return this.wobService.getInfo(this.wobId)
						.then((info: WobInfoModel) => {
							return new Property(
								this.wobId,					// wob ID
								this.property.name,			// name
								info[this.property.name],	// value
								true,						// is intrinsic?
								false,						// is draft?
								undefined,					// permissions don't
								undefined					// apply to intrinsics
							);
						});
				}
				else if (this.property.isBlob) {
					return this.wobService.getBinaryProperty(this.wobId, this.property.name, this.admin);
				}
				else {
					return this.wobService.getProperty(this.wobId, this.property.name, this.admin);
				}
			})
			.then(
				(property: Property) => {
					this.message += " and restored applied value";
					this.property = property;
					this.pushChange();

					return new BaseModel(true);
				},
				(error) => {
					this.message = " Could not discard draft: " + error;
					this.pushDelete();
				}
			);
	}

	save(): Promise<BaseModel> {
		var savePromise: Promise<BaseModel>;

		// All <input type="text"> values are strings, but the server may expect
		// other types.
		this.property.value = this.fixType(this.property.value);

		if (this.property.isIntrinsic) {
			// Save the given value as an applied intrinsic property.
			savePromise = this.wobService.setIntrinsic(this.wobId, this.property.name, this.property.value, this.admin)
		}
		else if (this.property.isBlob) {
			savePromise = this.wobService.setBinaryProperty(this.wobId, this.property.name, this.property.value, this.admin)
		}
		else {
			savePromise = this.wobService.setProperty(this.wobId, this.property.name, this.property.value, this.admin)
		}

		return savePromise
			.then((data: BaseModel) => {
				this.message = "Saved " + this.property.name;

				if (this.property.perms) {
					return this.wobService.setPropertyPermissions(this.wobId, this.property.name, this.property.perms.toString(), this.admin);
				}
			})
			.then((permissions: PermissionsModel) => {
				if (permissions) {
					this.property.perms = new Permissions(permissions.perms);
					this.property.permsEffective = new Permissions(permissions.permseffective);
				}
				// Delete the corresponding property draft, if any.
				return this.deleteDraft();
			})
			.then(
				(data: BaseModel) => {
					this.message += " and deleted draft";
					return data;
				},
				(error) => {
					this.message = "Could not save property: " + error;
				}
			);
	}

	saveDraft(): Promise<BaseModel> {
		var saveDraftPromise: Promise<BaseModel>;

		// All <input type="text"> values are strings, but the server may expect
		// other types.
		this.property.value = this.fixType(this.property.value);

		if (this.property.isIntrinsic) {
			saveDraftPromise = this.wobService.setIntrinsicDraft(this.wobId, this.property.name, this.property.value)
		}
		else if (this.property.isBlob) {
			saveDraftPromise = this.wobService.setBinaryPropertyDraft(this.wobId, this.property.name, this.property.value, this.property.perms ? this.property.perms.toString() : undefined)
		}
		else {
			saveDraftPromise = this.wobService.setPropertyDraft(this.wobId, this.property.name, this.property.value, this.property.perms ? this.property.perms.toString() : undefined)
		}

		return saveDraftPromise
			.then(
				(data: BaseModel) => {
					this.message = "Saved draft";

					return data;
				},
				(error) => {
					this.message = "Could not save draft: " + error;
				}
			);
	}
}
