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
import { EditState, Verb, VerbSignature } from "../types/wob";

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
	draftUpdate: Subject<Verb>;
	message: string;
	selectedVerb: Verb;
	selectedSignature: VerbSignature;
	verbs: { [propName: string]: Verb; }
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
		this.draftUpdate = new Subject<Verb>();
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
					if (verbName === undefined || !this.verbs[verbName]) {
						verbName = this.firstVerb.name;
					}
					this.selectedVerb = this.verbs[verbName];

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
					this.ignoreCodeChanges = true;
					this.editor.setValue(this.selectedVerb.code, -1);
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
		this.verbs = Object.create(null);
		this.wobId = wobEditState.id;

		// Iterate through applied verbs to create array of known verbs
		wobEditState.applied.verbs.forEach((verb) => {
			this.verbs[verb.name] = verb;
		});

		// For each draft that exists for a verb, merge that draft with the
		// applied version of the same verb. If no applied version of the verb
		// exists, append the draft to the end of the array.
		wobEditState.draft.verbs.forEach((verb) => {
			if (this.verbs[verb.name]) {
				this.verbs[verb.name].mergeDraft(verb);
			}
			else {
				this.verbs[verb.name] = verb;
			}
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

	get firstVerb(): Verb {
		var verb: Verb;
		for (let key in this.verbs) {
			verb = this.verbs[key];
			break;
		}
		return verb;
	}

	addSignature() {
		this.editSignature(new VerbSignature(this.selectedVerb.name + " __new__"));
	}

	editSignature(sig: VerbSignature) {
		this.selectedSignature = sig;
		this.verbformEditor.open(sig);
	}

	removeSignature(sig: VerbSignature) {
		this.selectedSignature = sig;
		var foundIndex = this.selectedVerb.sigs.findIndex((value) => {
			return value.id == sig.id;
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
		if (this.verbs[name]) {
			return this.navigateToVerb(name);
		}

		// Create new verb draft.
		this.verbs[name] = new Verb(
			this.wobId,	// wob ID
			name,		// verb name
			[],			// signatures
			"",			// code
			true,		// is draft
			undefined,	// default permissions
			undefined
		);
		this.selectedVerb = this.verbs[name];
		this.verbsChanged();

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
		if (this.selectedVerb.hasCodeDraft) {
			// Unset code draft.
			this.selectedVerb.codeDraft = undefined;

			// Update editor contents from server.
			this.wobService.getVerb(
					this.wobId,
					this.selectedVerb.name
				)
				.then((verb: Verb) => {
					this.verbs[verb.name].mergeApplied(verb);

					// Avoid triggering creation of a draft when resetting the
					// contents of the editor in response to deleting a draft.
					this.ignoreCodeChanges = true;
					this.editor.setValue(verb.code, -1);
					this.ignoreCodeChanges = false;
					this.editor.scrollToLine(0);
				});

			// If verbforms draft is also unset, delete the draft for this verb.
			if (!this.selectedVerb.hasSigsDraft) {
				return this.deleteVerbDraft();
			}
			// Otherwise, save draft with undefined code.
			else {
				return this.saveVerbDraft();
			}
		}
	}

	deleteSigsDraft(): Promise<BaseModel> {
		if (this.selectedVerb.hasSigsDraft) {
			// Unset verbforms draft.
			this.selectedVerb.sigsDraft = undefined;

			// Update signatures from server.
			this.wobService.getVerb(
					this.wobId,
					this.selectedVerb.name
				)
				.then((verb: Verb) => {
					this.verbs[verb.name].mergeApplied(verb);
				});

			// If code draft is also unset, delete the draft for this verb.
			if (!this.selectedVerb.hasCodeDraft) {
				return this.deleteVerbDraft();
			}
			// Otherwise, save draft with undefined signatures.
			else {
				return this.saveVerbDraft();
			}
		}
	}

	deleteVerbDraft(): Promise<BaseModel> {
		// Delete draft from server.
		return this.wobService.deleteVerbDraft(
				this.wobId,
				this.selectedVerb.name
			)
			.then((data: BaseModel) => {
				// Delete draft from local data model.
				this.verbs[this.selectedVerb.name].clearDraft();
				this.verbsChanged();

				// If an applied version of this verb exists, display the
				// applied version.
				if (!this.selectedVerb.hasApplied) {
					this.navigateToVerb(this.firstVerb.name);
				}

				this.message = "Deleted verb draft";
				return data;
			});
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

				// Also delete verb draft from server.
				return this.deleteVerbDraft();
			})
			.catch((data: BaseModel) => {
				// Failing to delete the draft is okay, since one may not exist;
				// move on to the next step.
				return data;
			})
			.then((data: BaseModel) => {
				// Delete verb from local data model.
				delete this.verbs[verbName];
				this.verbsChanged();

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
		// Update value of code draft.
		this.selectedVerb.codeDraft = code;

		// Notify observers draft has been updated.
		this.draftUpdate.next(this.selectedVerb);
	}

	onSignatureChange(sig: VerbSignature) {
		// If this verb doens't currently have a signatures draft, base our
		// draft on the verb's applied signatures.
		if (!this.selectedVerb.hasSigsDraft) {
			this.selectedVerb.sigsDraft = this.selectedVerb.sigsApplied;
		}

		// Find existing verbform that was being edited
		var foundIndex = this.selectedVerb.sigs.findIndex((value) => {
			return value.id == this.selectedSignature.id;
		});

		if (foundIndex == -1 && sig !== null && sig.value !== null) {
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

			// Append new verbform as a draft.
			this.selectedVerb.sigsDraft.push(sig);
		}
		else {
			if (sig === null || sig.value === null) {
				// Delete existing verbform
				delete this.selectedVerb.sigsDraft[foundIndex];
			}
			else {
				// Replace existing verbform.
				this.selectedVerb.sigsDraft[foundIndex] = sig;
			}
		}

		// Notify observers draft has been updated.
		this.draftUpdate.next(this.selectedVerb);
	}

	reloadAsAdmin() {
		this.router.navigate([ "/wob", this.wobId, { admin: true }, "verbs" ]);
	}

	saveCode(): Promise<BaseModel> {
		var savedVerb: Verb;

		if (!this.selectedVerb.hasCodeDraft) {
			// Nothing to do if there is not currently a code draft.
			return;
		}

		// Get the latest version of this verb from the server to ensure we
		// don't inadvertently overwrite signatures with an older version.
		return this.wobService.getVerb(
				this.wobId,
				this.selectedVerb.name
			)
			.then(
				(verb: Verb) => {
					this.message = "Got latest verb from server";
					// Saving means this verb is now directly associated with
					// our object rather than inherited.
					verb.sourceId = this.wobId;
					// Use our code instead of the server's.
					verb.code = this.selectedVerb.code;

					// Save the updated verb.
					savedVerb = verb;
					return this.wobService.setVerb(
						verb.sourceId,
						verb.name,
						Verb.sigsAsStringArray(verb.sigs),
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
					savedVerb = new Verb(
						this.wobId,
						this.selectedVerb.name,
						undefined,
						this.selectedVerb.code,
						false,
						undefined,
						undefined
					);
					return this.wobService.setVerb(
						savedVerb.sourceId,
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
				this.verbs[this.selectedVerb.name].mergeApplied(savedVerb);
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
		if (this.selectedVerb.hasDraft) {
			return this.wobService.setVerbDraft(
					this.wobId,
					this.selectedVerb.name,
					Verb.sigsAsStringArray(this.selectedVerb.sigsDraft),
					this.selectedVerb.codeDraft
				)
				.then((data: BaseModel) => {
					this.message = "Saved draft";
					return data;
				});
		}
	}

	saveSigs(): Promise<BaseModel> {
		var savedVerb: Verb;

		if (!this.selectedVerb.hasSigsDraft) {
			// Nothing to do if there is not currently a signatures draft.
			return;
		}

		// Get the latest version of this verb from the server to ensure we
		// don't inadvertently overwrite code with an older version.
		return this.wobService.getVerb(
				this.selectedVerb.sourceId,
				this.selectedVerb.name
			)
			.then(
				(verb: Verb) => {
					this.message = "Got latest verb from server";
					// Saving means this verb is now directly associated with
					// our object rather than inherited.
					verb.sourceId = this.wobId;
					// Use our signatures instead of the server's.
					verb.sigs = this.selectedVerb.sigs;

					// Save the updated verb.
					savedVerb = verb;
					return this.wobService.setVerb(
						verb.sourceId,
						verb.name,
						Verb.sigsAsStringArray(verb.sigs),
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
					savedVerb = new Verb(
						this.wobId,
						this.selectedVerb.name,
						Verb.sigsAsStringArray(this.selectedVerb.sigs),
						undefined,
						false,
						undefined,
						undefined
					);
					return this.wobService.setVerb(
						savedVerb.sourceId,
						savedVerb.name,
						Verb.sigsAsStringArray(savedVerb.sigs),
						undefined,
						this.asAdmin
					);
				}
			)
			.then((data: BaseModel) => {
				this.message += ", saved new signatures";

				// After successful save to server, update local data model.
				this.verbs[this.selectedVerb.name].mergeApplied(savedVerb);
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
				Verb.sigsAsStringArray(this.selectedVerb.sigs),
				this.selectedVerb.code,
				this.asAdmin
			)
			.then((data: BaseModel) => {
				this.message = "Saved verb";
				// Update local data model for applied verbs to match the verb
				// that was just saved.
				this.verbs[this.selectedVerb.name] = new Verb(
					this.wobId,
					this.selectedVerb.name,
					Verb.sigsAsStringArray(this.selectedVerb.sigs),
					this.selectedVerb.code,
					false,
					undefined,
					undefined
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
