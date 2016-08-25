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
	static worldWob: string = Config.server + "world/wob/";

	static draftWob: string = "__draft_wob_";
	static draftIntrinsic: string = "__intrinsic_";
	static draftProperty: string = "__property_";
	static draftVerb: string = "__verb_";

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
}
