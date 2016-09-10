/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Response } from "@angular/http";

import { VerbModel } from "../models/wob";
import { Tag } from "../shared/tag";
import { Urls } from "../shared/urls";

enum BlobType {
	Audio,
	Image,
	Video
}

class Metadata {
	isDraft: boolean;
	name: string;
	perms: number;
	permsEffective: number;
	sourceId: number;

	/**
	 * @constructor
	 * @param {number} sourceId - Wob ID on which this item is defined.
	 * @param {string} name - Name of this item.
	 * @param {boolean} isDraft - (optional) true if this item is a draft.
	 * @param {number} perms - (optional) Permissions.
	 * @param {number} permsEffective - (optional) Permissions currently in
	 *   effect.
	 */
	constructor(sourceId: number, name: string, isDraft?: boolean, perms?: number, permsEffective?: number) {
		this.sourceId = sourceId;
		this.name = name;
		this.isDraft = isDraft === undefined ? false : isDraft;
		this.perms = perms;
		this.permsEffective = permsEffective;
	}
}

export class Property extends Metadata {
	/**
	 * Convenience function for dealing with prefixing window.URL as
	 * window.webkitURL if needed. Otherwise identical to
	 * window.URL.revokeObjectURL().
	 *
	 * @param {string} objectURL - Object URL to revoke.
	 */
	static revokeObjectURL(objectURL: string): void {
		var urlCreator = window.URL || (<any>window).webkitURL;
		urlCreator.revokeObjectURL(objectURL);
	}

	private _blobType: BlobType;
	private _blobValue: Blob;
	private _isIntrinsic: boolean;
	private _value: string;

	/**
	 * @constructor
	 * @param {number} sourceId - Wob ID on which this property is defined.
	 * @param {string} name - Name of this property.
	 * @param {any} value - Value of this property.
	 * @param {boolean} isDraft - (optional) true if this property is a draft.
	 * @param {number} perms - (optional) Permissions.
	 * @param {number} permsEffective - (optional) Permissions currently in
	 *   effect.
	 */
	constructor(sourceId: number, name: string, value: any, isIntrinsic?: boolean, isDraft?: boolean, perms?: number, permsEffective?: number) {
		super(sourceId, name, isDraft, perms, permsEffective);
		this.value = value;
		this._isIntrinsic = isIntrinsic === undefined ? false : isIntrinsic;
	}

	/**
	 * Marks this Property as containing a Blob. If a non-Blob value is
	 * currently set, it will be unset and replaced with an empty Blob.
	 */
	private setAsBlob() {
		if (this._blobValue === undefined) {
			this._blobValue = new Blob([]);
		}
		this._value = undefined;
	}

	/**
	 * @return {boolean} true if this Property contains a Blob value, and a
	 *   blob type is also set.
	 */
	get isBlob(): boolean {
		if (this._blobValue !== undefined) {
			if (this._blobType === undefined) {
				console.warn("Property \"" + this.name + "\" _blobValue is defined, but _blobType is not. Unrecognised Blob content?");
				return false;
			}
			else {
				return true;
			}
		}
	}

	/**
	 * @return {boolean} true if this Property contains a Blob that is audio
	 *   data.
	 */
	get isAudio(): boolean {
		return this._blobType == BlobType.Audio;
	}

	/**
	 * @return {boolean} true if this Property contains a Blob that is image
	 *   data.
	 */
	get isImage(): boolean {
		return this._blobType == BlobType.Image;
	}

	/**
	 * @return {boolean} true if this Property represents an intrinsic value
	 *   of a wob, such as ID, permissions or ownership information.
	 */
	get isIntrinsic(): boolean {
		return this._isIntrinsic;
	}

	/**
	 * @return {boolean} true if this Property contains a Blob that is video
	 *   data.
	 */
	get isVideo(): boolean {
		return this._blobType == BlobType.Video;
	}

	/**
	 * @return {any} This property's value.
	 */
	get value(): any {
		if (this.isBlob) {
			return this._blobValue;
		}
		else {
			return this._value;
		}
	}

	/**
	 * Sets this property's value. If the input value is a Blob, then a blob
	 * type is automatically set based on the Blob's media type.
	 */
	set value(value: any) {
		if (typeof(value) === "object" && value instanceof Blob) {
			this._blobValue = value;
			if ((<Blob>value).type.startsWith("audio/")) {
				this.setAsAudio();
			}
			else if ((<Blob>value).type.startsWith("image/")) {
				this.setAsImage();
			}
			else if ((<Blob>value).type.startsWith("video/")) {
				this.setAsVideo();
			}
		}
		else {
			this._blobType = undefined;
			this._blobValue = undefined;
			this._value = value;
		}
	}

	/**
	 * Creates an objectURL for the Blob value of this property. The created URL
	 * is unique for each invocation of this method. It is the caller's
	 * responsibility to call window.revokeObjectURL once it is no longer needed.
	 *
	 * @return {string} Object URL.
	 */
	createObjectURL(): string {
		if (this.isBlob) {
			let urlCreator = window.URL || (<any>window).webkitURL;
			return urlCreator.createObjectURL(this._blobValue);
		}
		else {
			console.warn("Requested object URL for Property \"" + this.name + "\", whose value is not a Blob");
		}
	}

	/**
	 * Make this Property appear to contain audio data. This should usually not
	 * be necessary, as setting the Property's value automatically sets its
	 * media type as well.
	 */
	setAsAudio() {
		this.setAsBlob();
		this._blobType = BlobType.Audio;
	}

	/**
	 * Make this Property appear to contain image data. This should usually not
	 * be necessary, as setting the Property's value automatically sets its
	 * media type as well.
	 */
	setAsImage() {
		this.setAsBlob();
		this._blobType = BlobType.Image;
	}

	/**
	 * Make this Property appear to contain video data. This should usually not
	 * be necessary, as setting the Property's value automatically sets its
	 * media type as well.
	 */
	setAsVideo() {
		this.setAsBlob();
		this._blobType = BlobType.Video;
	}
}

export class VerbSignature {
	id: string;
	indirectObj: string;
	indirectObj2: string;
	isInherited?: boolean;
	obj: string;
	prep: string;
	prep2: string;
	verb: string;

	/**
	 * @constructor
	 * @param {string} value - A verbform string.
	 * @param {boolean} isInherited - (optional) true if this verbform was
	 *   inherited from an ancestor wob. (Default: false)
	 */
	constructor(value: string, isInherited?: boolean) {
		// Generate random ID for uniquely identifying this signature within a
		// verb.
		this.id = Tag.makeTag(4);
		this.isInherited = isInherited === undefined ? false : isInherited;
		this.value = value;
	}

	/**
	 * @return {string} The verbform string.
	 */
	get value(): string {
		return (this.verb === null || this.verb === undefined) ? this.verb : this.words.join(" ").trim();
	}

	/**
	 * @param {string} value - A verbform string.
	 */
	set value(value: string) {
		if (value === null || value === undefined) {
			this.verb = value;
			this.obj = value;
			this.prep = value;
			this.indirectObj = value;
			this.prep2 = value;
			this.indirectObj2 = value;
		}
		else {
			let pieces = value.split(" ");

			this.verb = pieces[0];
			this.obj = pieces[1];
			this.prep = pieces[2];
			this.indirectObj = pieces[3];
			this.prep2 = pieces[4];
			this.indirectObj2 = pieces[5];
		}
	}

	/**
	 * @return {string} The verbform string split into an array of words.
	 */
	get words(): string[] {
		return (this.verb === null || this.verb === undefined) ? <any>this.verb : [
			this.verb,
			this.obj,
			this.prep,
			this.indirectObj,
			this.prep2,
			this.indirectObj2
		];
	}

	/**
	 * @param {string[]} value - An array of words that will be parsed into a
	 *   verbform string.
	 */
	set words(value: string[]) {
		this.verb = value[0];
		this.obj = value[1];
		this.prep = value[2];
		this.indirectObj = value[3];
		this.prep2 = value[4];
		this.indirectObj2 = value[5];
	}
}

export class Verb extends Metadata {
	sigsApplied: VerbSignature[];
	sigsDraft: VerbSignature[];
	codeApplied: string;
	codeDraft: string;

	/**
	 * Converts an array of VerbSignature objects into an array of strings, for
	 * use with server APIs that expect an array of strings.
	 *
	 * @param {VerbSignature[]} sigs - Array of VerbSignature objects.
	 * @return {string[]} - Array of strings, where each element is a verbform
	 *   string.
	 */
	static sigsAsStringArray(sigs: VerbSignature[]): string[] {
		return sigs ? sigs.map((sig) => {
			return sig.value;
		}) : undefined;
	}

	/**
	 * @constructor
	 * @param {number} sourceId - Wob ID on which this verb is defined.
	 * @param {string} name - Name of this verb.
	 * @param {string[]} sigs - Array of strings, where each element is a
	 *   verbform string.
	 * @param {string} code - Petal code for this verb.
	 * @param {boolean} isDraft - (optional) true if the sigsDraft and codeDraft
	 *   properties of the new Verb should be set insead of the sigsApplied and
	 *   codeApplied properties. (Default: false)
	 * @param {number} perms - (optional) Permissions.
	 * @param {number} permsEffective - (optional) Permissions currently in
	 *   effect.
	 */
	constructor(sourceId: number, name: string, sigs: string[], code: string, isDraft?: boolean, perms?: number, permsEffective?: number) {
		super(sourceId, name, isDraft, perms, permsEffective);

		if (this.isDraft) {
			if (sigs && sigs.length) {
				this.sigsDraft = [];
				sigs.forEach((sig) => {
					this.sigsDraft.push(new VerbSignature(sig));
				});
			}
			this.codeDraft = code;
		}
		else {
			if (sigs && sigs.length) {
				this.sigsApplied = [];
				sigs.forEach((sig) => {
					this.sigsApplied.push(new VerbSignature(sig));
				});
			}
			this.code = code;
		}
	}

	/**
	 * @return {boolean} true if this Verb contains any applied components.
	 */
	get hasApplied(): boolean {
		return this.hasCodeApplied || this.hasSigsApplied;
	}

	/**
	 * @return {boolean} true if this Verb contains applied code.
	 */
	get hasCodeApplied(): boolean {
		return this.codeApplied !== undefined;
	}

	/**
	 * @return {boolean} true if this Verb contains applied signatures.
	 */
	get hasSigsApplied(): boolean {
		return this.sigsApplied !== undefined;
	}

	/**
	 * @return {boolean} true if this Verb contains any draft components.
	 */
	get hasDraft(): boolean {
		return this.hasCodeDraft || this.hasSigsDraft;
	}

	/**
	 * @return {boolean} true if this Verb contains draft code.
	 */
	get hasCodeDraft(): boolean {
		return this.codeDraft !== undefined;
	}

	/**
	 * @return {boolean} true if this Verb contains draft signatures.
	 */
	get hasSigsDraft(): boolean {
		return this.sigsDraft !== undefined;
	}

	/**
	 * @return {string} If draft code exists for this Verb, return the draft
	 *   code. Otherwise, return the applied code.
	 */
	get code(): string {
		if (this.hasCodeDraft) {
			return this.codeDraft;
		}
		else if (this.hasCodeApplied) {
			return this.codeApplied;
		}
		else {
			return "";
		}
	}

	/**
	 * If draft code exists for this Verb, sets the draft code. Otherwise, sets
	 * the applied code.
	 */
	set code(value: string) {
		if (this.hasCodeDraft) {
			this.codeDraft = value;
		}
		else {
			this.codeApplied = value;
		}
	}

	/**
	 * @return {VerbSignature[]} If draft signatures exist for this Verb,
	 *   return the draft signatures. Otherwise, return the applied code.
	 */
	get sigs(): VerbSignature[] {
		if (this.hasSigsDraft) {
			return this.sigsDraft;
		}
		else if (this.hasSigsApplied) {
			return this.sigsApplied;
		}
		else {
			return [];
		}
	}

	/**
	 * If draft signatures exist for this Verb, sets the draft signatures.
	 * Otherwise, sets the applied signaturse.
	 */
	set sigs(value: VerbSignature[]) {
		if (this.hasSigsDraft) {
			this.sigsDraft = value;
		}
		else {
			this.sigsApplied = value;
		}
	}

	/**
	 * Sets the applied code and applied signatures for this Verb to undefined.
	 */
	clearApplied() {
		this.sigsApplied = undefined;
		this.codeApplied = undefined;
	}

	/**
	 * Sets the draft code and draft signatures for this Verb to undefined.
	 */
	clearDraft() {
		this.sigsDraft = undefined;
		this.codeDraft = undefined;
	}

	/**
	 * Given another Verb, sets this Verb's source ID, applied code and applied
	 * signatures to equal the other Verb's source ID, applied code and applied
	 * signatures.
	 *
	 * @param {Verb} verb - Verb from which to copy applied properties.
	 */
	mergeApplied(verb: Verb) {
		this.sourceId = verb.sourceId;
		this.sigsApplied = verb.sigsApplied;
		this.codeApplied = verb.codeApplied;
	}

	/**
	 * Given another Verb, sets this Verb's draft code and draft signatures
	 * to equal the other Verb's draft code and draft signatures.
	 *
	 * @param {Verb} verb - Verb from which to copy draft properies.
	 */
	mergeDraft(verb: Verb) {
		this.sigsDraft = verb.sigsDraft;
		this.codeDraft = verb.codeDraft;
	}
}

// For storing the wob editor's initial state.
export class EditState {
	constructor(id: number) {
		this.id = id;
		this.applied = {
			intrinsics: [],
			properties: [],
			verbs: []
		};
		this.draft = {
			intrinsics: [],
			properties: [],
			verbs: []
		}
	}

	id: number;
	applied: {
		intrinsics: Property[],
		properties: Property[],
		verbs: Verb[]
	};
	draft: {
		intrinsics: Property[],
		properties: Property[],
		verbs: Verb[]
	};
}
