export class ScrollbackChunk {
	text: string;
	type: string;
	interactive: any;

	constructor(type: string, text: string, interactive?: any) {
		this.type = type;
		this.text = text;
		this.interactive = interactive;
	}
}

export class ScrollbackLine {
	chunks: ScrollbackChunk[];
	timestamp: Date;

	constructor(chunk: any, timestamp?: Date) {
		if (chunk instanceof Array) {
			this.chunks = chunk;
		}
		else if (chunk instanceof ScrollbackChunk) {
			this.chunks = [ chunk ];
		}
		else {
			console.error("ScrollbackLine constructor: invaild chunk", chunk);
		}

		this.timestamp = timestamp;
	}
}
