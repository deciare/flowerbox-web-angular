/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs/Subscription";

import { Verb, WobEditState } from "../models/wob";

import { VerbformEditorComponent } from "./verbform-editor.component";
import { WobEditorComponent } from "./wob-editor.component";

import { SessionService } from "../session/session.service";

@Component({
	moduleId: module.id,
	selector: "verb-editor",
	styleUrls: [
		"./wob-editor.component.css",
		"./verb-editor.component.css"
	],
	templateUrl: "./verb-editor.component.html"
})
export class VerbEditorComponent extends WobEditorComponent implements OnDestroy, OnInit {
	private routeDataSubscription: Subscription;
	private routeParentParamsSubscription: Subscription;
	private routeParamsSubscription: Subscription;

	asAdmin: boolean;
	message: string;
	selectedVerb: Verb;
	selectedVerbform: string;
	verbs: Verb[];
	wobId: number;

	@ViewChild(VerbformEditorComponent)
	verbformEditor: VerbformEditorComponent;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		sessionService: SessionService
	) {
		super(sessionService);
		this.asAdmin = false;
	}

	ngOnInit() {
		this.routeDataSubscription = this.route.data.subscribe(this.onWobEditStateChange.bind(this));

		this.routeParentParamsSubscription = this.route.parent.params.subscribe((params) => {
			this.asAdmin = params["admin"] == "true" ? true : false;
		});

		this.routeParamsSubscription = this.route.params.subscribe((params) => {
			var selectedVerb = this.verbs.find((verb) => {
				return verb.name == params["verb"];
			});
			this.selectedVerb = selectedVerb ? selectedVerb : this.verbs[0];
		});
	}

	ngOnDestroy() {
		this.routeDataSubscription.unsubscribe();
		this.routeParentParamsSubscription.unsubscribe();
		this.routeParamsSubscription.unsubscribe();
	}

	private onWobEditStateChange(data: any) {
		var wobEditState: WobEditState = data["wobEditState"];

		this.verbs = [];
		this.wobId = wobEditState.id;

		// Iterate through applied properties
		wobEditState.applied.verbs.forEach((verb) => {
			// Create array of properties that are currently applied
			verb.isDraft = false;
			this.verbs.push(verb);
		});

		// For each draft that exists for an intrinsic or property, overwrite
		// what's displayed on the form with the draft version.
		wobEditState.draft.verbs.forEach((verb) => {
			this.useDraft(verb);
		});
	}

	private replaceField(verb: Verb) {
		var foundIndex: number;

		// Check whether a corresponding applied property exists in
		// array.
		if ((foundIndex = this.verbs.findIndex((value) => {
				return value.name == verb.name;
			})) != -1
		) {
			// If so, replace that property with draft version.
			this.verbs[foundIndex] = verb;
		}
		else {
			// If not, append draft property to end of array
			this.verbs.push(verb);
		}
	}

	private useApplied(verb: Verb) {
		verb.isDraft = false;
		this.replaceField(verb);
	}

	private useDraft(verb: Verb) {
		verb.isDraft = true;
		this.replaceField(verb);
	}

	selectVerbform(sig: string) {
		this.selectedVerbform = sig;
		this.verbformEditor.open(sig);
	}

	reloadAsAdmin() {
		this.router.navigate([ "/wob", this.wobId, { admin: true }, "verbs" ]);
	}

	updateVerbform(sig: string) {
		var foundIndex = this.selectedVerb.sigs.findIndex((value) => {
			return value == this.selectedVerbform;
		});

		this.selectedVerb.sigs[foundIndex] = sig;
	}
}
