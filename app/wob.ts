/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ModelBase } from "./model-base";

// For returning one property on a wob.
export class Property extends ModelBase {
	constructor(id: number, name: string, value: any, sub?: string, status?: string) {
		super(true);
		this.id = id;
		this.name = name;
		this.value = value;
		this.sub = sub;
		this.status = status ? status : Property.StatusApplied;
	}

	public id: number;
	public name: string;
	public value: any;
	public sub: string;
	public status: string;

	// Possible values for status
	public static StatusApplied = "applied";
	public static StatusDraft = "draft";
}

export class PropertyList {
	public properties: Property[];
}

// For returning one verb on a wob.
export class Verb extends ModelBase {
	constructor(id: number, name: string, sigs: string[], code: string, status?: string) {
		super(true);
		this.id = id;
		this.name = name;
		this.sigs = sigs;
		this.code = code;
		this.status = status ? status : Verb.StatusApplied;
	}

	public id: number;
	public name: string;
	public sigs: string[];
	public code: string;
	public status: string;

	// Possible values for status
	public static StatusApplied = "applied";
	public static StatusDraft = "draft";
}

export class VerbList {
	public verbs: Verb[];
}

// For returning the basic info about a wob.
export class WobInfo extends ModelBase {
	constructor(id: number, base: number, container: number,
			name: string, desc: string, globalid: string,
			properties?: AttachedItem[], verbs?: AttachedItem[]) {
		super(true);

		this.id = id;
		this.base = base;
		this.container = container;

		this.name = name;
		this.desc = desc;
		this.globalid = globalid;

		this.properties = properties;
		this.verbs = verbs;
	}

	// Intrinsic properties
	public id: number;
	public base: number;
	public container: number;

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

export class InstanceOfResult {
	constructor(id: number, isInstance: boolean) {
		this.id = id;
		this.isInstance = isInstance;
	}

	public id: number;
	public isInstance: boolean;
}

export class InstanceOfList extends ModelBase {
	constructor(list: InstanceOfResult[]) {
		super(true);
		this.list = list;
	}

	public list: InstanceOfResult[];
}

export class WobEditState {
	constructor(id: number) {
		this.id = id;
		this.applied = {
			properties: [],
			verbs: []
		};
		this.draft = {
			properties: [],
			verbs: []
		}
	}

	id: number;
	applied: {
		properties: Property[],
		verbs: Verb[]
	};
	draft: {
		properties: Property[],
		verbs: Verb[]
	};
}
