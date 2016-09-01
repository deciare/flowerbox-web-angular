/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs/Subject";
import { Subscription } from "rxjs/Subscription";
import "rxjs/add/operator/debounceTime";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/withLatestFrom";

import { ModelBase } from "../models/base";
import { Verb, WobEditState } from "../models/wob";

import { VerbformEditorComponent } from "./verbform-editor.component";
import { WobEditorComponent } from "./wob-editor.component";

import { SessionService } from "../session/session.service";
import { WobService } from "../api/wob.service";

// Silence warnings about ace coming from non-TypeScript file.
declare var ace;

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
	private draftUpdateSubscription: Subscription;
	private editor: any;
	private ignoreCodeChanges: boolean;
	private routeDataSubscription: Subscription;
	private routeParentParamsSubscription: Subscription;

	asAdmin: boolean;
	draftUpdate: Subject<Verb>;
	message: string;
	selectedVerb: Verb;
	selectedSignature: string;
	verbDrafts: Map<string, Verb>;
	verbs: Map<string, Verb>;
	wobId: number;

	@ViewChild(VerbformEditorComponent)
	verbformEditor: VerbformEditorComponent;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private wobService: WobService,
		sessionService: SessionService
	) {
		super(sessionService);
		this.asAdmin = false;
		this.draftUpdate = new Subject<Verb>();
		this.verbDrafts = new Map<string, Verb>();
		this.verbs = new Map<string, Verb>();
	}

	ngOnInit() {
		this.draftUpdateSubscription = this.draftUpdate
			.debounceTime(1000)
			.subscribe(this.saveDraft.bind(this));

		this.routeDataSubscription = this.route.data.withLatestFrom(this.route.params).subscribe((values) => {
			var wobEditState = values[0]["wobEditState"];
			var verbName = values[1]["verb"];

			this.onWobEditStateChange(wobEditState)
				.then(() => {
					// If specified verb exists, select it. Otherwise, use first
					// verb in list.
					if (verbName === undefined) {
						verbName = this.verbs.values().next().value.name;
					}

					// If a draft of the selected verb exists, prefer the draft.
					if (this.verbDrafts.has(verbName)) {
						this.selectedVerb = this.verbDrafts.get(verbName);
					}
					else if (this.verbs.has(verbName)) {
						this.selectedVerb = this.verbs.get(verbName)
					}

					// Initialise editor if needed.
					if (!this.editor) {
						this.editor = ace.edit("editor");
						this.editor.$blockScrolling = Infinity;
						this.editor.setTheme("ace/theme/monokai");
						this.editor.getSession().setMode("ace/mode/javascript");
						this.editor.on("change", (event: Event) => {
							if (!this.ignoreCodeChanges) {
								this.onCodeChange(this.editor.getValue());
							}
						});
					}
					// Avoid triggering draft creation when setting new code
					// as a direct result of navigating to different verbs.
					var compositeCode = this.compositeVerb.code;
					this.ignoreCodeChanges = true;
					this.editor.setValue(compositeCode ? compositeCode : "", -1);
					this.ignoreCodeChanges = false;
					this.editor.scrollToLine(1);
				});
		});

		this.routeParentParamsSubscription = this.route.parent.params.subscribe((params) => {
			this.asAdmin = params["admin"] == "true" ? true : false;
		});
	}

	ngOnDestroy() {
		this.draftUpdateSubscription.unsubscribe();
		this.routeDataSubscription.unsubscribe();
		this.routeParentParamsSubscription.unsubscribe();
	}

	private onWobEditStateChange(wobEditState: WobEditState): Promise<void> {
		this.verbDrafts.clear();
		this.verbs.clear();
		this.wobId = wobEditState.id;

		// Iterate through applied properties
		wobEditState.applied.verbs.forEach((verb) => {
			// Create array of properties that are currently applied
			verb.isDraft = false;
			this.verbs.set(verb.name, verb);
		});

		// For each draft that exists for an intrinsic or property, overwrite
		// what's displayed on the form with the draft version.
		wobEditState.draft.verbs.forEach((verb) => {
			verb.isDraft = true;
			this.verbDrafts.set(verb.name, verb);
		});

		// Indicate that WobEditState has been processed.
		return Promise.resolve();
	}

	/**
	 * If the selected verb is not a draft, then return the selected verb.
	 * If the selected verb is a draft, but the draft contains only signatures
	 * or only code, then available portions of the draft are combined with
	 * portions of the applied verb to create a composite verb.
	 *
	 * Changes made to this verb are silently discarded. Changes that need to
	 * persist should be made to selectedVerb instead.
	 */
	get compositeVerb(): Verb {
		var retval: Verb;

		// Create a Verb object based on selectedVerb, instead of setting
		// retval = selectedVerb, to avoid making any changes to selectedVerb
		retval = new Verb(
			this.selectedVerb.id,
			this.selectedVerb.name,
			this.selectedVerb.sigs,
			this.selectedVerb.code,
			undefined,
			this.selectedVerb.isDraft
		);

		if (this.selectedVerb.isDraft) {
			if (this.selectedVerb.sigs === undefined) {
				retval.sigs = this.verbs.get(this.selectedVerb.name).sigs;
			}
			else if (this.selectedVerb.code === undefined) {
				retval.code = this.verbs.get(this.selectedVerb.name).code;
			}
		}

		return retval;
	}

	addSignature() {
		this.editSignature(this.selectedVerb.name + " __new__");
	}

	editSignature(sig: string) {
		this.selectedSignature = sig;
		this.verbformEditor.open(sig);
	}

	removeSignature(sig: string) {
		this.selectedSignature = sig;
		var foundIndex = this.selectedVerb.sigs.findIndex((value) => {
			return value == sig;
		});
		this.selectedVerb.sigs.splice(foundIndex, 1);
		this.onSignatureChange(null);
	}

	deleteVerbDraft(): Promise<ModelBase> {
		if (this.selectedVerb.isDraft) {
			// Delete draft from local data model.
			this.selectedVerb = this.verbs.get(this.selectedVerb.name);
			this.verbDrafts.delete(this.selectedVerb.name);

			// Delete draft from server.
			return this.wobService.deleteVerbDraft(
					this.wobId,
					this.selectedVerb.name
				)
				.then((data: ModelBase) => {
					this.message = "Deleted verb draft";
					return data;
				});
		}
	}

	onCodeChange(code: string) {
		// If the selected verb is not a draft, create a new draft with the
		// modified code instead of the applied version of the verb.
		if (!this.selectedVerb.isDraft) {
			this.verbDrafts.set(this.selectedVerb.name, new Verb(
				this.wobId,
				this.selectedVerb.name,
				undefined,
				code,
				undefined,
				true
			));
			this.selectedVerb = this.verbDrafts.get(this.selectedVerb.name);
		}
		// Otherwise, just modify the existing draft's code.
		else {
			this.selectedVerb.code = code;
		}

		// Notify observers draft has been updated.
		this.draftUpdate.next(this.selectedVerb);
	}

	onSignatureChange(sig: string) {
		// If the selected verb is not a draft, create a new draft and modify
		// the draft instead of the applied version of the verb.
		if (!this.selectedVerb.isDraft) {
			this.verbDrafts.set(this.selectedVerb.name, new Verb(
				this.wobId,
				this.selectedVerb.name,
				this.selectedVerb.sigs,
				undefined,
				undefined,
				true
			));
			this.selectedVerb = this.verbDrafts.get(this.selectedVerb.name);
		}
		// Otherwise, base sigs on the applied version of the verb.
		else if (this.selectedVerb.sigs === undefined) {
			this.selectedVerb.sigs = this.verbs.get(this.selectedVerb.name).sigs;
		}

		// Find existing verbform that was being edited
		var foundIndex = this.selectedVerb.sigs.findIndex((value) => {
			return value == this.selectedSignature;
		});

		if (foundIndex == -1 && sig !== null) {
			// If no existing verbfom matching the signature that was supplied
			// to editSignature(), then a new verbform is being added.
			// Confirm new verbform doesn't conflict with any existing one.
			var newfoundIndex = this.selectedVerb.sigs.findIndex((value) => {
				return value == sig;
			});
			if (newfoundIndex != -1) {
				// New verbform conflicts with existing verbform.
				return;
			}

			// Append new verbform.
			this.selectedVerb.sigs.push(sig);
		}
		else {
			if (sig === null) {
				// Delete existing verbform.
				delete this.selectedVerb.sigs[foundIndex];
			}
			else {
				// Replace existing verbform.
				this.selectedVerb.sigs[foundIndex] = sig;
			}
		}

		// Notify observers draft has been updated.
		this.draftUpdate.next(this.selectedVerb);
	}

	reloadAsAdmin() {
		this.router.navigate([ "/wob", this.wobId, { admin: true }, "verbs" ]);
	}

	saveDraft(): Promise<ModelBase> {
		if (this.selectedVerb.isDraft) {
			return this.wobService.setVerbDraft(
					this.selectedVerb.id,
					this.selectedVerb.name,
					this.selectedVerb.sigs,
					this.selectedVerb.code
				)
				.then((data: ModelBase) => {
					this.message = "Saved draft";
					return data;
				});
		}
	}

	saveVerb(): Promise<ModelBase> {
		return this.wobService.setVerb(
				this.wobId,
				this.selectedVerb.name,
				this.compositeVerb.sigs,
				this.compositeVerb.code,
				this.asAdmin
			)
			.then((data: ModelBase) => {
				this.message = "Saved verb";
				// Delete draft corresponding to verb that was just saved.
				return this.deleteVerbDraft();
			})
			.then((data: ModelBase) => {
				this.message += " and deleted draft";
				return data;
			});
	}
}
