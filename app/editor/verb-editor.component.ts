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
	verbDrafts: any;
	verbs: any;
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
						for (let key in this.verbs) {
							verbName = key;
							break;
						}
					}

					// If a draft of the selected verb exists, prefer the draft.
					if (this.verbDrafts[verbName]) {
						this.selectedVerb = this.verbDrafts[verbName];
					}
					else if (this.verbs[verbName]) {
						this.selectedVerb = this.verbs[verbName]
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
		this.verbDrafts = Object.create(null);
		this.verbs = Object.create(null);
		this.wobId = wobEditState.id;

		// Iterate through applied properties
		wobEditState.applied.verbs.forEach((verb) => {
			// Create array of properties that are currently applied
			verb.isDraft = false;
			this.verbs[verb.name] = verb;
		});

		// For each draft that exists for an intrinsic or property, overwrite
		// what's displayed on the form with the draft version.
		wobEditState.draft.verbs.forEach((verb) => {
			verb.isDraft = true;
			this.verbDrafts[verb.name] = verb;
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

		// If selectedVerb isn't yet available, return a meaningless placeholder
		// that won't result in any syntax errors.
		if (!this.selectedVerb) {
			return new Verb(0, "", [], "", undefined, true);
		}

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
				retval.sigs = this.verbs[this.selectedVerb.name].sigs;
			}
			else if (this.selectedVerb.code === undefined) {
				retval.code = this.verbs[this.selectedVerb.name].code;
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

	deleteCodeDraft() {
		if (this.selectedVerb.isDraft) {
			// Unset code draft.
			this.selectedVerb.code = undefined;

			// Update editor contents.
			this.wobService.getVerb(
					this.selectedVerb.id,
					this.selectedVerb.name
				)
				.then((verb: Verb) => {
					this.verbs[verb.name] = verb;

					// Avoid triggering creation of a draft when resetting the
					// contents of the editor in response to deleting a draft.
					this.ignoreCodeChanges = true;
					this.editor.setValue(verb.code, -1);
					this.ignoreCodeChanges = false;
					this.editor.scrollToLine(1);
				});

			// If verbforms draft is also unset, delete the draft for this verb.
			if (this.selectedVerb.sigs === undefined) {
				return this.deleteVerbDraft();
			}
			// Otherwise, save draft with undefined code.
			else {
				return this.saveDraft();
			}
		}
	}

	deleteSigsDraft(): Promise<ModelBase> {
		if (this.selectedVerb.isDraft) {
			// Unset verbforms draft.
			this.selectedVerb.sigs = undefined;

			// If code draft is also unset, delete the draft for this verb.
			if (this.selectedVerb.code === undefined) {
				return this.deleteVerbDraft();
			}
			// Otherwise, save draft with undefined signatures.
			else {
				return this.saveDraft();
			}
		}
	}

	deleteVerbDraft(): Promise<ModelBase> {
		if (this.selectedVerb.isDraft) {
			// Delete draft from local data model.
			this.selectedVerb = this.verbs[this.selectedVerb.name];
			delete this.verbDrafts[this.selectedVerb.name];

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
			this.verbDrafts[this.selectedVerb.name] = new Verb(
				this.wobId,
				this.selectedVerb.name,
				undefined,
				code,
				undefined,
				true
			);
			this.selectedVerb = this.verbDrafts[this.selectedVerb.name];
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
			this.verbDrafts[this.selectedVerb.name] = new Verb(
				this.wobId,
				this.selectedVerb.name,
				this.selectedVerb.sigs,
				undefined,
				undefined,
				true
			);
			this.selectedVerb = this.verbDrafts[this.selectedVerb.name];
		}
		// Otherwise, base sigs on the applied version of the verb.
		else if (this.selectedVerb.sigs === undefined) {
			this.selectedVerb.sigs = this.verbs[this.selectedVerb.name].sigs;
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

	saveCode(): Promise<ModelBase> {
		// Get the latest version of this verb from the server to ensure we
		// don't inadvertently overwrite the code with an older version.
		return this.wobService.getVerb(
				this.selectedVerb.id,
				this.selectedVerb.name
			)
			.then((verb: Verb) => {
				this.message = "Got latest verb from server";
				// Use our code instead of the server's.
				verb.code = this.selectedVerb.code;
				this.verbs[this.selectedVerb.name] = verb;

				// Save the updated verb.
				return this.wobService.setVerb(
					this.wobId,
					verb.name,
					verb.sigs,
					verb.code,
					this.asAdmin
				);
			})
			.then((data: ModelBase) => {
				this.message += ", saved new code";
				return this.deleteCodeDraft();
			})
			.then ((data: ModelBase) => {
				this.message += ", deleted code draft";
				return data;
			});
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

	saveSigs(): Promise<ModelBase> {
		// Get the latest version of this verb from the server to ensure we
		// don't inadvertently overwrite the code with an older version.
		return this.wobService.getVerb(
				this.selectedVerb.id,
				this.selectedVerb.name
			)
			.then((verb: Verb) => {
				this.message = "Got latest verb from server";
				// Use our signatures instead of the server's.
				verb.sigs = this.selectedVerb.sigs;
				this.verbs[this.selectedVerb.name] = verb;

				// Save the updated verb.
				return this.wobService.setVerb(
					this.wobId,
					verb.name,
					verb.sigs,
					verb.code,
					this.asAdmin
				);
			})
			.then((data: ModelBase) => {
				this.message += ", saved new signatures";
				return this.deleteSigsDraft();
			})
			.then ((data: ModelBase) => {
				this.message += ", deleted sigs draft";
				return data;
			});
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
