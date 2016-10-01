/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
class PermissionBits {
	read: boolean;
	write: boolean;
	execute: boolean;

	constructor(flags: string) {
		this.read = flags.indexOf("r") != -1;
		this.write = flags.indexOf("w") != -1;
		this.execute = flags.indexOf("x") != -1;
	}

	toString(): string {
		var retval = "";

		if (this.read) {
			retval += "r";
		}
		if (this.write) {
			retval += "w";
		}
		if (this.execute) {
			retval += "x";
		}

		return retval;
	}
}

class MetaBits {
	sticky: boolean;

	constructor(flags: string) {
		this.sticky = flags.indexOf("s") != -1;
	}

	toString(): string {
		var retval = "";

		if (this.sticky) {
			retval += "s";
		}

		return retval;
	}
}

export class Permissions {
	_user: PermissionBits;
	_group: PermissionBits;
	_other: PermissionBits;
	_meta: MetaBits;

	constructor(perms: string) {
		var components: string[] = perms.split(":");
		this.user = components[0];
		this.group = components[1];
		this.other = components[2];
		this.meta = components[3];
	}

	get canUserRead(): boolean {
		return this._user.read;
	}
	set canUserRead(value: boolean) {
		this._user.read = value;
	}
	get canUserWrite(): boolean {
		return this._user.write;
	}
	set canUserWrite(value: boolean) {
		this._user.write = value;
	}
	get canUserExecute(): boolean {
		return this._user.execute;
	}
	set canUserExecute(value: boolean) {
		this._user.execute = value;
	}

	get user(): string {
		return this._user.toString();
	}
	set user(value: string) {
		this._user = new PermissionBits(value);
	}

	get canGroupRead(): boolean {
		return this._group.read;
	}
	set canGroupRead(value: boolean) {
		this._group.read = value;
	}
	get canGroupWrite(): boolean {
		return this._group.write;
	}
	set canGroupWrite(value: boolean) {
		this._group.write = value;
	}
	get canGroupExecute(): boolean {
		return this._group.execute;
	}
	set canGroupExecute(value: boolean) {
		this._group.execute = value;
	}

	get group(): string {
		return this._group.toString();
	}
	set group(value: string) {
		this._group = new PermissionBits(value);
	}

	get canOtherRead(): boolean {
		return this._other.read;
	}
	set canOtherRead(value: boolean) {
		this._other.read = value;
	}
	get canOtherWrite(): boolean {
		return this._other.write;
	}
	set canOtherWrite(value: boolean) {
		this._other.write = value;
	}
	get canOtherExecute(): boolean {
		return this._other.execute;
	}
	set canOtherExecute(value: boolean) {
		this._other.execute = value;
	}

	get other(): string {
		return this._other.toString();
	}
	set other(value: string) {
		this._other = new PermissionBits(value);
	}

	get isSticky(): boolean {
		return this._meta.sticky;
	}
	set isSticky(value: boolean) {
		this._meta.sticky = true;
	}
	get meta(): string {
		return this._meta.toString();
	}
	set meta(value: string) {
		this._meta = new MetaBits(value);
	}

	toString(): string {
		return this._user.toString() +
			":" + this._group.toString() +
			":" + this._other.toString() +
			":" + this._meta.toString();
	}
}
