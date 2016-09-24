/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { BaseModel } from "../models/base";

// For returning one property on a wob.
export class PropertyModel extends BaseModel {
	constructor(id: number, name: string, value: any, perms?: number, permseffective?: number, sub?: string) {
		super(true);
		this.id = id;
		this.name = name;
		this.value = value;
		this.perms = perms;
		this.permseffective = permseffective;
		this.sub = sub;
	}

	public id: number;
	public name: string;
	public value: any;
	public perms: number;
	public permseffective: number;
	public sub: string;
}

export class PropertyModelList {
	public properties: PropertyModel[];
}

// For returning one verb on a wob.
export class VerbModel extends BaseModel {
	constructor(id: number, name: string, sigs: string[], code: string, perms?: number, isDraft?: boolean) {
		super(true);
		this.id = id;
		this.name = name;
		this.sigs = sigs ? sigs.slice() : undefined; // copy array instead of using reference to it
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

export class VerbModelList {
	public verbs: VerbModel[];
}

// For returning the basic info about a wob.
export class WobInfoModel extends BaseModel {
	constructor(id: number, base: number, container: number,
			name: string, desc: string, globalid: string,
			owner: number, group: number, perms: number,
			properties?: AttachedProperty[], verbs?: AttachedVerb[]) {
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
	public properties: AttachedProperty[];
	public verbs: AttachedVerb[];
}

export class AttachedItem {
	constructor(sourceid: number, value: string, perms?: number, permsEffective?: number) {
		this.sourceid = sourceid;
		this.value = value;
		this.perms = perms;
		this.permsEffective = permsEffective;
	}

	public sourceid: number;
	public value: string;
	public perms: number;
	public permsEffective: number;
}

export class AttachedProperty extends AttachedItem {
	constructor(sourceid: number, value: string, perms?: number, permsEffective?: number, blobmimetype?: string) {
		super(sourceid, value, perms, permsEffective);
		this.blobmimetype = blobmimetype;
	}

	public blobmimetype: string;
}

export class AttachedVerb extends AttachedItem {
	constructor(sourceid: number, value: string, perms?: number, permsEffective?: number) {
		super(sourceid, value, perms, permsEffective);
	}
}

export class IdList {
	constructor(list: number[]) {
		this.list = list;
	}

	public list: number[];
}

export class WobInfoModelList {
	constructor(list: WobInfoModel[]) {
		this.list = list;
	}

	public list: WobInfoModel[];
}

// For returning a result of whether one wob is descended from another.
export class InstanceOfModel {
	constructor(id: number, isInstance: boolean) {
		this.id = id;
		this.isInstance = isInstance;
	}

	public id: number;
	public isInstance: boolean;
}

// For returning a list of InstanceOfResults
export class InstanceOfModelList extends BaseModel {
	constructor(list: InstanceOfModel[]) {
		super(true);
		this.list = list;
	}

	public list: InstanceOfModel[];
}

// For returning permissions
export class PermissionsModel extends BaseModel {
	perms?: string;
	permseffective: string;
}
