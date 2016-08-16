/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Config } from "./config";

export class Urls {
	static termExec: string = Config.server + "terminal/command/";
	static termEvents: string = Config.server + "terminal/new-events/";
	static userLogin: string = Config.server + "user/login/";
	static userPlayerInfo: string = Config.server + "user/player-info/";
	static worldWob: string = Config.server + "world/wob/";

	static draftWob: string = "__draft_wob_";
	static draftProperty: string = "__property_";
	static draftVerb: string = "__verb_";

	static wobInfo(id: number): string {
		return Urls.worldWob + id + "/info";
	}

	static wobProperty(id: number, name?: string, sub?: string): string {
		return Urls.worldWob + id + "/property" + (name ? "/" + name : "") + (sub ? "/" + sub : "");
	}

	static wobPropertyDraft(id: number, name: string) {
		return "/property/" + Urls.draftWob + id + "/" + Urls.draftProperty + name;
	}

	static wobVerb(id: number, name?: string): string {
		return Urls.worldWob + id + "/verb" + (name ? "/" + name : "");
	}

	static wobVerbDraft(id: number, name: string) {
		return "/property/" + Urls.draftWob + id + "/" + Urls.draftVerb + name;
	}
}
