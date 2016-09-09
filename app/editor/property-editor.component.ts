/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs/Subject";
import { Subscription } from "rxjs/Subscription";

import { WobInfoModel } from "../models/wob";
import { Property, EditState} from "../types/wob";

import { NewPropertyComponent, NewPropertyParams } from "./new-property.component";
import { GenericPropertyEditorComponent } from "./generic-property-editor.component";
import { AudioPropertyEditorComponent } from "./audio-property-editor.component";
import { ImagePropertyEditorComponent } from "./image-property-editor.component";
import { TextPropertyEditorComponent } from "./text-property-editor.component";
import { WobEditorComponent } from "./wob-editor.component";

import { SessionService } from "../session/session.service";
import { WobService } from "../api/wob.service";

@Component({
	moduleId: module.id,
	selector: "property-editor",
	styleUrls: [
		"wob-editor.component.css"
	],
	templateUrl: "./property-editor.component.html"
})
export class PropertyEditorComponent extends WobEditorComponent implements OnDestroy, OnInit {
	private draftUpdate: Subject<Property>;
	private routeDataSubscription: Subscription;
	private routeParentParamsSubscription: Subscription;

	asAdmin: boolean;
	intrinsics: Property[];
	message: string;
	properties: Property[];
	wobId: number;

	@ViewChild(NewPropertyComponent)
	newPropertyInput: NewPropertyComponent;

	@ViewChildren(AudioPropertyEditorComponent)
	audioPropertyInputs: QueryList<AudioPropertyEditorComponent>;

	@ViewChildren(ImagePropertyEditorComponent)
	imagePropertyInputs: QueryList<ImagePropertyEditorComponent>;

	@ViewChildren(TextPropertyEditorComponent)
	textPropertyInputs: QueryList<TextPropertyEditorComponent>;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private wobService: WobService,
		sessionService: SessionService
	) {
		super(sessionService);
		this.asAdmin = false;
	}

	private onEditStateChange(data: any): void {
		var wobEditState: EditState = data["wobEditState"];

		this.intrinsics = [];
		this.properties = [];
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
			this.appendOrReplaceProperty(intrinsic);
		});
		wobEditState.draft.properties.forEach((property) => {
			this.appendOrReplaceProperty(property);
		});
	}

	private appendOrReplaceProperty(newItem: Property, oldItem?: Property) {
		var foundIndex: number;
		var arrName = newItem.isIntrinsic ? "intrinsics" : "properties";
		var findName = oldItem ? oldItem.name : newItem.name;

		// Check whether a corresponding applied property exists in
		// array.
		if ((foundIndex = this[arrName].findIndex((value) => {
				return value.name == findName;
			})) != -1
		) {
			// If so, replace that property with draft version.
			this[arrName][foundIndex] = newItem;
		}
		else {
			// If not, append draft property to end of array
			this[arrName].push(newItem);
		}
	}

	ngOnInit() {
		this.routeDataSubscription = this.route.data.subscribe(this.onEditStateChange.bind(this));

		this.routeParentParamsSubscription = this.route.parent.params.subscribe((params) => {
			this.asAdmin = params["admin"] == "true" ? true : false;
		});

		// Prepare Observable through which will be notified whenever a form
		// field changes, and subscribe to it.
		this.draftUpdate = new Subject<Property>();
	}

	ngOnDestroy() {
		this.routeDataSubscription.unsubscribe();
		this.routeParentParamsSubscription.unsubscribe();
	}

	onChange(newValue: Property, oldValue: Property) {
		// Replace old property in list with new one.
		this.appendOrReplaceProperty(newValue, oldValue);

		// Refocus the form field after the template change.
		this.refocus(newValue.name);
	}

	onDelete(property: Property) {
		var foundIndex = this.properties.findIndex((value) => {
			return value.name === property.name;
		});
		if (foundIndex != -1) {
			this.properties.splice(foundIndex, 1);
		}
		else {
			console.warn("Couldn't find property to delete:", property);
		}
	}

	reloadAsAdmin() {
		this.router.navigate([ "/wob", this.wobId, { admin: true }, "properties" ]);
	}

	newDraft(param: NewPropertyParams) {
		if (param.name && param.name.trim() != "") {
			// Create form field for the new property.
			var newProperty = new Property(
				// New property belongs to the wob being edited
				this.wobId,
				// User provides name
				param.name,
				// Empty value
				"",
				// Is an intrinsic property?
				false,
				// Is a draft?
				true,
				// TODO: permissions
				undefined,
				undefined
			);

			// Set new property's type, if needed.
			switch(param.type) {
			case "audio":
				newProperty.setAsAudio();
				break;
			case "image":
				newProperty.setAsImage();
				break;
			case "video":
				newProperty.setAsVideo();
				break;
			}

			// Add new property to the list.
			this.properties.push(newProperty);

			// Focus the newly created field.
			setTimeout(() => {
				$(`#${param.name}`).focus();
			}, 0);
		}
	}

	newDraftPrompt() {
		this.newPropertyInput.open();
	}

	saveAll() {
		var allInputs: GenericPropertyEditorComponent[] = [];

		console.log("saveAll");
		allInputs = allInputs.concat(
			this.audioPropertyInputs.toArray(),
			this.imagePropertyInputs.toArray(),
			this.textPropertyInputs.toArray()
		);
		allInputs.forEach((input) => {
			input.save();
		});
	}
}
