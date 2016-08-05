import { Component, Input } from "@angular/core";
import { Http, Response } from "@angular/http";
import "rxjs/add/operator/toPromise";
import { Urls } from "./urls";
import { ScrollbackChunk } from "./scrollback";
import { TagService } from "./tag.service";

///<reference path="../typings/globals/jquery/index.d.ts" />
///<reference path="../typings/globals/bootstrap/index.d.ts" />

@Component({
	moduleId: module.id,
	selector: "interactive-chunk",
	styleUrls: [
		"./interactive-chunk.component.css"
	],
	template: `<span id="{{tag}}" [ngSwitch]="chunk.type" class="pre-container" data-toggle="popover" data-placement="top" data-trigger="hover" (mouseover)="getContent()">
		<span *ngSwitchCase="'wob'" class="{{chunk.type}} pre">{{chunk.text}}</span>
	</span>`,
	providers: [
		TagService
	]
})
export class InteractiveChunkComponent {
	private content: string;
	private tag: string;

	@Input()
	chunk: ScrollbackChunk;

	constructor(
		private http: Http,
		private tagService: TagService
	) {
		this.tag = "InteractiveChunk_" + this.tagService.makeTag(4);
	}

	getContent() {
		switch(this.chunk.type) {
		case "wob":
			// Once a Bootstrap popover's content is set for the first time,
			// it can no longer be changed, so there's no point in getting new
			// data from the server each time; reuse cached value
			if (!this.content) {
				this.http.get(Urls.worldWob + this.chunk.interactive.id + " /property/desc")
					.toPromise()
					.then((response: Response) => {
						// Cache response
						this.content = response.json().value.value;

						// Set popover content
						$(`#${this.tag}`).popover({
							content: this.content,
							title: this.chunk.text
						});

						// Show the popover. It didn't auto-show the first time
						// it was hovered because the content was blank at
						// the time.
						$(`#${this.tag}`).popover("show");
					});
			}
			break;
		}
	}
}
