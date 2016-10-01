/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Config } from "../config";

export class Urls {
	static termExec: string = Config.server + "terminal/command/";
	static termEvents: string = Config.server + "terminal/new-events/";
	static userLogin: string = Config.server + "user/login/";
	static userPlayerInfo: string = Config.server + "user/player-info/";
	static worldDefaultPerms: string = Config.server + "world/default-perms/";
	static worldWob: string = Config.server + "world/wob/";

	static draftBlob: string = "__draft_blob_";
	static draftWob: string = "__draft_wob_";
	static draftIntrinsic: string = "__intrinsic_";
	static draftProperty: string = "__property_";
	static draftVerb: string = "__verb_";

	static blobToDataUri(blob: Blob | File): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			var reader = new FileReader();
			reader.onloadend = function() {
				resolve(reader.result);
			};
			reader.readAsDataURL(blob);
		});
	}

	static blobToObjectUrl(blob: Blob | File): string {
		var urlCreator = window.URL || (<any>window).webkitURL;
		return urlCreator.createObjectURL(blob);
	}

	static dataUriMediaType(dataUri: string): string {
		return dataUri ? dataUri.split(',')[0].split(':')[1].split(';')[0] : undefined;
	}

	static objectUrlToBlob(objectUrl: string): Promise<Blob> {
		return new Promise((resolve, reject) => {
			var xhr = new XMLHttpRequest();
			xhr.open("GET", objectUrl, true);
			xhr.responseType = "blob";
			xhr.onload = function (event) {
				if (this.status == 200) {
					resolve(this.response);
				}
				else {
					reject(this.status + " " + this.statusText)
				}
			};
			xhr.send();
		});
	}

	static revokeObjectUrl(objectUrl: string) {
		var urlCreator = window.URL || (<any>window).webkitURL;
		urlCreator.revokeObjectURL(objectUrl);
	}

	// Thanks to https://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata/5100158#5100158
	static dataUriToBlob(dataUri: string) {
		var byteString: string;

		// Convert base64/URLencoded data component to raw binary data.
		if (dataUri.split(',')[0].indexOf('base64') >= 0) {
			byteString = atob(dataUri.split(',')[1]);
		}
		else {
			byteString = decodeURIComponent(dataUri.split(',')[1]);
		}

		// Write bytes of the string to a typed array.
		var buffer = new ArrayBuffer(byteString.length);
		var ia = new Uint8Array(buffer);
		for (let i = 0; i < byteString.length; i++) {
			ia[i] = byteString.charCodeAt(i);
		}

		return new Blob([buffer], {
			type: Urls.dataUriMediaType(dataUri)
		});
	}

	static wobInfo(id: number | string): string {
		return Urls.worldWob + id + "/info";
	}

	static wobInstanceOf(ids: number | string, ancestorId: number | string): string {
		return Urls.worldWob + ids + "/instanceof/" + ancestorId;
	}

	static wobGetIntrinsicDraft(id: number | string, name: string) {
		return "/property/" + Urls.draftWob + id + "/sub/" + Urls.draftIntrinsic + name;
	}

	static wobGetProperty(id: number | string, name: string, sub?: string): string {
		return Urls.worldWob + id + "/property/" + name + (sub ? "/" + sub : "");
	}

	static wobPropertyPermissions(id: number | string, name: string): string {
		return Urls.worldWob + id + "/property/" + name + "/perms";
	}

	static wobSetBinaryProperties(id: number | string) {
		return Urls.worldWob + id + "/properties/binary";
	}

	static wobSetProperties(id: number | string) {
		return Urls.worldWob + id + "/properties";
	}

	static wobGetPropertyDraft(id: number | string, name: string) {
		return "/property/" + Urls.draftWob + id + "/sub/" + Urls.draftProperty + name;
	}

	static wobGetVerb(id: number | string, name: string): string {
		return Urls.worldWob + id + "/verb/" + name;
	}

	static wobSetVerbs(id: number | string): string {
		return Urls.worldWob + id + "/verbs";
	}

	static wobGetVerbDraft(id: number | string, name: string) {
		return "/property/" + Urls.draftWob + id + "/sub/" + Urls.draftVerb + name;
	}

	static wobSetDrafts(id: number | string) {
		return "/property/" + Urls.draftWob + id + "/subs";
	}

	static defaultPermissions(type: string) {
		return Urls.worldDefaultPerms + type;
	}
}
