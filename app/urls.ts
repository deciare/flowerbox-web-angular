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

	static wobInfo(id: number): string {
		return Urls.worldWob + id + "/info";
	}

	static wobProperty(id: number, property: string): string {
		return Urls.worldWob + id + "/property/" + property;
	}
}
