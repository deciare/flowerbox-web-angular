/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ModelBase } from "../models/base";

// For returning one property on a wob.
export class Property extends ModelBase {
	constructor(id: number, name: string, value: any, perms?: number, sub?: string, isDraft?: boolean) {
		super(true);
		this.id = id;
		this.name = name;
		this.value = value;
		this.perms = perms;
		this.sub = sub;
		this.isDraft = isDraft === undefined ? false : isDraft;
	}

	public id: number;
	public name: string;
	public value: any;
	public perms: number;
	public sub: string;
	public isDraft: boolean;
}

export class PropertyList {
	public properties: Property[];
}

// For returning one verb on a wob.
export class Verb extends ModelBase {
	constructor(id: number, name: string, sigs: string[], code: string, perms?: number, isDraft?: boolean) {
		super(true);
		this.id = id;
		this.name = name;
		this.sigs = sigs.slice(); // copy array instead of using reference to it
		this.code = code;
		this.perms = perms;
		this.isDraft = isDraft === undefined ? false : isDraft;
	}

	public id: number;
	public name: string;
	public sigs: string[];
	public code: string;
	public perms: number;
	public isDraft: boolean;
}

export class VerbList {
	public verbs: Verb[];
}

// For returning the basic info about a wob.
export class WobInfo extends ModelBase {
	constructor(id: number, base: number, container: number,
			name: string, desc: string, globalid: string,
			owner: number, group: number, perms: number,
			properties?: AttachedItem[], verbs?: AttachedItem[]) {
		super(true);

		this.id = id;
		this.base = base;
		this.container = container;

		this.name = name;
		this.desc = desc;
		this.globalid = globalid;
		this.owner = owner;
		this.group = group;
		this.perms = perms;

		this.properties = properties;
		this.verbs = verbs;
	}

	// Intrinsic properties
	public id: number;
	public base: number;
	public container: number;
	public owner: number;
	public group: number;
	public perms: number;

	// Common named properties
	public name: string;
	public desc: string;
	public globalid: string;

	// List of properties and verbs, by wob ID.
	public properties: AttachedItem[];
	public verbs: AttachedItem[];
}

export class AttachedItem {
	constructor(sourceid: number, value: string) {
		this.sourceid = sourceid;
		this.value = value;
	}

	public sourceid: number;
	public value: string;
}

export class IdList {
	constructor(list: number[]) {
		this.list = list;
	}

	public list: number[];
}

export class WobInfoList {
	constructor(list: WobInfo[]) {
		this.list = list;
	}

	public list: WobInfo[];
}

// For returning a result of whether one wob is descended from another.
export class InstanceOfResult {
	constructor(id: number, isInstance: boolean) {
		this.id = id;
		this.isInstance = isInstance;
	}

	public id: number;
	public isInstance: boolean;
}

// For returning a list of InstanceOfResults
export class InstanceOfList extends ModelBase {
	constructor(list: InstanceOfResult[]) {
		super(true);
		this.list = list;
	}

	public list: InstanceOfResult[];
}

// For representing an intrinsic property in WobEditState,
export class Intrinsic {
	constructor(name: string, value: any, isDraft?: boolean) {
		this.name = name;
		this.value = value;
		this.isDraft = isDraft === undefined ? false : isDraft;
	}

	name: string;
	value: any;
	isDraft: boolean;
}

// For storing the wob editor's initial state.
export class WobEditState {
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
		intrinsics: Intrinsic[],
		properties: Property[],
		verbs: Verb[]
	};
	draft: {
		intrinsics: Intrinsic[],
		properties: Property[],
		verbs: Verb[]
	};
}
