import { ModelBase } from "./model-base";

export class HearLog extends ModelBase {
	public log: HearLogItem[];
}

export class HearLogItem {
	public timestamp: number;
	public tag: string;
	public type: string;
	public items: any[];

	// These are possible values for the "type" member.
	public static TypeOutput = "output";
	public static TypeCommand = "command";
}

// Rich text with a wob reference.
export class WobRef {
	public rich: string;
	public text: string;
	public id: number;
}
