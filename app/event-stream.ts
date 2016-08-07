import { ModelBase } from "./model-base";

export class EventStream extends ModelBase {
	public log: EventStreamItem[];
}

export class EventStreamItem {
	public timestamp: number;
	public tag: string;
	public type: string;
	public items: any[];

	// These are possible values for the "type" member.
	public static TypeCommand = "command";
	public static TypeError = "error";
	public static TypeOutput = "output";
}

// Rich text with a wob reference.
export class WobRef {
	public rich: string;
	public text: string;
	public id: number;
}
