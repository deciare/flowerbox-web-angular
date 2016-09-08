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

import { BaseModel } from "../models/base";
import { VerbModel } from "../models/wob";
import { EditState } from "../types/wob";

import { AceConfigComponent } from "./ace-config.component";
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
	draftUpdate: Subject<VerbModel>;
	message: string;
	selectedVerb: VerbModel;
	selectedSignature: string;
	verbDrafts: any;
	verbs: any;
	wobId: number;

	@ViewChild(AceConfigComponent)
	aceConfig: AceConfigComponent;

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
		this.draftUpdate = new Subject<VerbModel>();
	}

	ngOnInit() {
		this.draftUpdateSubscription = this.draftUpdate
			.debounceTime(1000)
			.subscribe(this.saveVerbDraft.bind(this));

		this.routeDataSubscription = this.route.data.withLatestFrom(this.route.params).subscribe((values) => {
			var wobEditState = values[0]["wobEditState"];
			var verbName = values[1]["verb"];

			this.onEditStateChange(wobEditState)
				.then(() => {
					// If specified verb exists, select it. Otherwise, use first
					// verb in list.
					if (verbName === undefined ||
						(
							!this.verbDrafts[verbName] &&
							!this.verbs[verbName]
						)
					) {
						verbName = this.firstVerb.name;
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

						// Load editor configuration
						this.aceConfig.setEditor(this.editor);
						this.aceConfig.loadConfig();
					}
					// Avoid triggering draft creation when setting new code
					// as a direct result of navigating to different verbs.
					var compositeCode = this.compositeVerb.code;
					this.ignoreCodeChanges = true;
					this.editor.setValue(compositeCode ? compositeCode : "", -1);
					this.ignoreCodeChanges = false;
					this.editor.scrollToLine(0);
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

	private onEditStateChange(wobEditState: EditState): Promise<void> {
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
	 * Manually trigger change detection when content of verbs is changed.
	 * (Needed for pure pipe.)
	 */
	private verbsChanged() {
		this.verbs = Object.assign(Object.create(null), this.verbs);
	}

	/**
	 * Manually trigger change detection when content of verbDrafts is changed.
	 * (Needed for pure pipe.)
	 */
	private verbDraftsChanged() {
		this.verbDrafts = Object.assign(Object.create(null), this.verbDrafts);
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
	get compositeVerb(): VerbModel {
		var retval: VerbModel;

		// If selectedVerb isn't yet available, return a meaningless placeholder
		// that won't result in any syntax errors.
		if (!this.selectedVerb) {
			return new VerbModel(0, "", [], "", undefined, true);
		}

		// Create a Verb object based on selectedVerb, instead of setting
		// retval = selectedVerb, to avoid making any changes to selectedVerb
		retval = new VerbModel(
			this.selectedVerb.id,
			this.selectedVerb.name,
			this.selectedVerb.sigs,
			this.selectedVerb.code,
			undefined,
			this.selectedVerb.isDraft
		);

		if (this.selectedVerb.isDraft) {
			if (this.selectedVerb.sigs === undefined) {
				retval.sigs = this.verbs[this.selectedVerb.name] ? this.verbs[this.selectedVerb.name].sigs : [];
			}
			else if (this.selectedVerb.code === undefined) {
				retval.code = this.verbs[this.selectedVerb.name] ? this.verbs[this.selectedVerb.name].code : "";
			}
		}

		return retval;
	}

	get firstVerb(): VerbModel {
		var verb: VerbModel;
		for (let key in this.verbs) {
			verb = this.verbs[key];
			break;
		}
		return verb;
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

	addVerb() {
		var name = window.prompt("New verb name:");

		// Ignore blank name
		if (!name || name.trim() == "") {
			return;
		}

		// If there's an existing verb with this name, navigate to the existing
		// verb.
		if (this.verbs[name] || this.verbDrafts[name]) {
			return this.navigateToVerb(name);
		}

		// Create new verb draft.
		this.verbDrafts[name] = new VerbModel(
			this.wobId,	// wob ID
			name,		// verb name
			[],			// signatures
			"",			// code
			undefined,	// default permissions
			true		// is draft
		);
		this.selectedVerb = this.verbDrafts[name];
		this.verbDraftsChanged();

		this.saveVerbDraft()
			.then(() => {
				// Navigate to the newly created draft.
				//
				// Navigating from a route without a verb= parameter to a route
				// WITH a verb= parameter is considered a route change, and
				// causes a new WobEditState to be fetched from the server.
				//
				// Navigating before the server finishes saving the draft would
				// therefore result in new WobEditState missing the draft we
				// just created, causing navigation to fail.
				this.navigateToVerb(name);
			});
	}

	deleteCodeDraft(): Promise<BaseModel> {
		if (this.selectedVerb.isDraft) {
			// Unset code draft.
			this.selectedVerb.code = undefined;

			// Update editor contents.
			this.wobService.getVerb(
					this.selectedVerb.id,
					this.selectedVerb.name
				)
				.then((verb: VerbModel) => {
					this.verbs[verb.name] = verb;

					// Avoid triggering creation of a draft when resetting the
					// contents of the editor in response to deleting a draft.
					this.ignoreCodeChanges = true;
					this.editor.setValue(verb.code, -1);
					this.ignoreCodeChanges = false;
					this.editor.scrollToLine(0);
				});

			// If verbforms draft is also unset, delete the draft for this verb.
			if (this.selectedVerb.sigs === undefined) {
				return this.deleteVerbDraft();
			}
			// Otherwise, save draft with undefined code.
			else {
				return this.saveVerbDraft();
			}
		}
	}

	deleteSigsDraft(): Promise<BaseModel> {
		if (this.selectedVerb.isDraft) {
			// Unset verbforms draft.
			this.selectedVerb.sigs = undefined;

			// If code draft is also unset, delete the draft for this verb.
			if (this.selectedVerb.code === undefined) {
				return this.deleteVerbDraft();
			}
			// Otherwise, save draft with undefined signatures.
			else {
				return this.saveVerbDraft();
			}
		}
	}

	deleteVerbDraft(): Promise<BaseModel> {
		if (this.selectedVerb.isDraft) {
			// Delete draft from server.
			return this.wobService.deleteVerbDraft(
					this.wobId,
					this.selectedVerb.name
				)
				.then((data: BaseModel) => {
					// Delete draft from local data model.
					delete this.verbDrafts[this.selectedVerb.name];
					this.verbDraftsChanged();

					// If an applied version of this verb exists, display the
					// applied version.
					if (this.verbs[this.selectedVerb.name]) {
						this.selectedVerb = this.verbs[this.selectedVerb.name];
					}
					// Otherwise, navigate to the first still-existing verb.
					else {
						this.navigateToVerb(this.firstVerb.name);
					}

					this.message = "Deleted verb draft";
					return data;
				});
		}
	}

	deleteVerb(): Promise<BaseModel> {
		// Ensure target verb name remains available after object references
		// are deleted.
		var verbName = this.selectedVerb.name;

		// Delete verb from server.
		return this.wobService.deleteVerb(
				this.wobId,
				verbName,
				this.asAdmin
			)
			.then((data: BaseModel) => {
				this.message = "Deleted verb";

				// Delete verb from local data model.
				delete this.verbs[verbName];
				this.verbsChanged();

				// Also delete verb draft from server.
				return this.deleteVerbDraft();
			})
			.then((data: BaseModel) => {
				// Delete draft from local data model.
				delete this.verbDrafts[verbName];
				this.verbDraftsChanged();

				// Navigate to first still-existing verb.
				this.navigateToVerb(this.firstVerb.name);

				return data;
			});
	}

	navigateToVerb(name: string) {
		if (this.asAdmin) {
			this.router.navigate([ "/wob", this.wobId, { admin: true }, "verbs", { verb: name } ]);
		}
		else {
			this.router.navigate([ "/wob", this.wobId, "verbs", { verb: name } ]);
		}
	}

	onCodeChange(code: string) {
		// If the selected verb is not a draft, create a new draft with the
		// modified code instead of the applied version of the verb.
		if (!this.selectedVerb.isDraft) {
			this.verbDrafts[this.selectedVerb.name] = new VerbModel(
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
			this.verbDrafts[this.selectedVerb.name] = new VerbModel(
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

	saveCode(): Promise<BaseModel> {
		var savedVerb: VerbModel;

		if (this.selectedVerb.isDraft && this.selectedVerb.code === undefined) {
			// Nothing to do if there is not currently a code draft.
			return;
		}

		// Get the latest version of this verb from the server to ensure we
		// don't inadvertently overwrite signatures with an older version.
		return this.wobService.getVerb(
				this.selectedVerb.id,
				this.selectedVerb.name
			)
			.then(
				(verb: VerbModel) => {
					this.message = "Got latest verb from server";
					// Saving means this verb is now directly associated with
					// our object rather than inherited.
					verb.id = this.wobId;
					// Use our code instead of the server's.
					verb.code = this.selectedVerb.code;
					verb.isDraft = false;

					// Save the updated verb.
					savedVerb = verb;
					return this.wobService.setVerb(
						verb.id,
						verb.name,
						verb.sigs,
						verb.code,
						this.asAdmin
					);
				},
				(error) => {
					this.message = "Couldn't get latest verb from server";

					// Server didn't have an applied version of this verb.
					// Treat this like a new verb.
					//
					// Save the new verb without code.
					savedVerb = new VerbModel(
						this.wobId,
						this.selectedVerb.name,
						undefined,
						this.selectedVerb.code,
						undefined,
						false
					);
					return this.wobService.setVerb(
						savedVerb.id,
						savedVerb.name,
						undefined,
						savedVerb.code,
						this.asAdmin
					);
				}
			)
			.then((data: BaseModel) => {
				this.message += ", saved new code";

				// After successful save to server, update local data model.
				this.verbs[this.selectedVerb.name] = savedVerb;
				this.verbsChanged();

				return this.deleteCodeDraft();
			})
			.then ((data: BaseModel) => {
				// Reload selected verb from updated local data model to
				// ensure correct display of inheritance state.
				this.selectedVerb = this.verbs[this.selectedVerb.name];
				this.message += ", deleted code draft";
				return data;
			});
	}

	saveVerbDraft(): Promise<BaseModel> {
		if (this.selectedVerb.isDraft) {
			return this.wobService.setVerbDraft(
					this.selectedVerb.id,
					this.selectedVerb.name,
					this.selectedVerb.sigs,
					this.selectedVerb.code
				)
				.then((data: BaseModel) => {
					this.message = "Saved draft";
					return data;
				});
		}
	}

	saveSigs(): Promise<BaseModel> {
		var savedVerb: VerbModel;

		if (this.selectedVerb.isDraft && this.selectedVerb.sigs === undefined) {
			// Nothing to do if there is not currently a signatures draft.
			return;
		}

		// Get the latest version of this verb from the server to ensure we
		// don't inadvertently overwrite code with an older version.
		return this.wobService.getVerb(
				this.selectedVerb.id,
				this.selectedVerb.name
			)
			.then(
				(verb: VerbModel) => {
					this.message = "Got latest verb from server";
					// Saving means this verb is now directly associated with
					// our object rather than inherited.
					verb.id = this.wobId;
					// Use our signatures instead of the server's.
					verb.sigs = this.selectedVerb.sigs;
					verb.isDraft = false;

					// Save the updated verb.
					savedVerb = verb;
					return this.wobService.setVerb(
						verb.id,
						verb.name,
						verb.sigs,
						verb.code,
						this.asAdmin
					);
				},
				(error) => {
					this.message = "Couldn't get latest verb from server";

					// Server didn't have an applied version of this verb.
					// Treat this like a new verb.
					//
					// Save the new verb without code.
					savedVerb = new VerbModel(
						this.wobId,
						this.selectedVerb.name,
						this.selectedVerb.sigs,
						undefined,
						undefined,
						false
					);
					return this.wobService.setVerb(
						savedVerb.id,
						savedVerb.name,
						savedVerb.sigs,
						undefined,
						this.asAdmin
					);
				}
			)
			.then((data: BaseModel) => {
				this.message += ", saved new signatures";

				// After successful save to server, update local data model.
				this.verbs[this.selectedVerb.name] = savedVerb;
				this.verbsChanged();

				return this.deleteSigsDraft();
			})
			.then ((data: BaseModel) => {
				// Reload selected verb from updated local data model to
				// ensure correct display of inheritance state.
				this.selectedVerb = this.verbs[this.selectedVerb.name];

				this.message += ", deleted sigs draft";
				return data;
			});
	}

	saveVerb(): Promise<BaseModel> {
		return this.wobService.setVerb(
				this.wobId,
				this.selectedVerb.name,
				this.compositeVerb.sigs,
				this.compositeVerb.code,
				this.asAdmin
			)
			.then((data: BaseModel) => {
				this.message = "Saved verb";
				// Update local data model for applied verbs to match the verb
				// that was just saved.
				this.verbs[this.selectedVerb.name] = new VerbModel(
					this.wobId,
					this.selectedVerb.name,
					this.compositeVerb.sigs,
					this.compositeVerb.code,
					undefined,
					false
				);
				this.verbsChanged();

				// If the selected verb is not a draft, reload it from the
				// updated local data model. This is required to ensure that
				// correct data is displayed on the template (e.g. simply
				// saving an unmodified verb would still change its source ID,
				// and not reloading selectedVerb from the local data model
				// could cause it to be incorrectly displayed as inherited).
				if (!this.selectedVerb.isDraft) {
					this.selectedVerb = this.verbs[this.selectedVerb.name];
				}

				// Delete draft corresponding to verb that was just saved.
				return this.deleteVerbDraft();
			})
			.then((data: BaseModel) => {
				this.message += " and deleted draft";
				return data;
			});
	}
}
