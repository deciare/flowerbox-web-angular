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

	constructor(sourceId: number, name: string, value: any, isIntrinsic?: boolean, isDraft?: boolean, perms?: number, permsEffective?: number) {
		super(sourceId, name, isDraft, perms, permsEffective);
		this.value = value;
		this._isIntrinsic = isIntrinsic === undefined ? false : isIntrinsic;
	}

	private setAsBlob() {
		if (this._blobValue === undefined) {
			this._blobValue = new Blob([]);
		}
		this._value = undefined;
	}

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

	get isAudio(): boolean {
		return this._blobType == BlobType.Audio;
	}

	get isImage(): boolean {
		return this._blobType == BlobType.Image;
	}

	get isIntrinsic(): boolean {
		return this._isIntrinsic;
	}

	get isVideo(): boolean {
		return this._blobType == BlobType.Video;
	}

	get value(): any {
		if (this.isBlob) {
			return this._blobValue;
		}
		else {
			return this._value;
		}
	}

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

	constructor(value: any, isInherited?: boolean) {
		// Generate random ID for uniquely identifying this signature within a
		// verb.
		this.id = Tag.makeTag(4);
		this.isInherited = isInherited === undefined ? false : isInherited;
		this.value = value;
	}

	get value(): string {
		return [
			this.verb,
			this.obj,
			this.prep,
			this.indirectObj,
			this.prep2,
			this.indirectObj2
		].join(" ");
	}

	set value(value) {
		var pieces = value.split(" ");

		this.verb = pieces[0];
		this.obj = pieces[1];
		this.prep = pieces[2];
		this.indirectObj = pieces[3];
		this.prep2 = pieces[4];
		this.indirectObj2 = pieces[5];
	}
}

export class Verb extends Metadata {
	sigs: VerbSignature[];
	sigsDraft: VerbSignature[];
	code: string;
	codeDraft: string;

	constructor(sourceId: number, name: string, sigs: string[], code: string, isDraft?: boolean, perms?: number, permsEffective?: number) {
		super(sourceId, name, isDraft, perms, permsEffective);

		if (sigs && sigs.length) {
			this.sigs = [];
			sigs.forEach((sig) => {
				this.sigs.push(new VerbSignature(sig));
			});
		}
		this.code = code;
	}

	get hasApplied(): boolean {
		return this.hasCode || this.hasSigs;
	}

	get hasCode(): boolean {
		return this.code !== undefined;
	}

	get hasCodeDraft(): boolean {
		return this.codeDraft !== undefined;
	}

	get hasDraft(): boolean {
		return this.hasCodeDraft || this.hasSigsDraft;
	}

	get hasSigs(): boolean {
		return this.sigs !== undefined;
	}

	get hasSigsDraft(): boolean {
		return this.sigsDraft !== undefined;
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
		verbs: VerbModel[]
	};
	draft: {
		intrinsics: Property[],
		properties: Property[],
		verbs: VerbModel[]
	};
}
