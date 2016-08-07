import { Config } from "./config";

export class Urls {
	static termExec: string = Config.server + "terminal/command/";
	static termEvents: string = Config.server + "terminal/new-events/";
	static userLogin: string = Config.server + "user/login/";
	static worldWob: string = Config.server + "world/wob/";
}
