/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, Input } from "@angular/core";
import { Headers, Http, Response } from "@angular/http";
import "rxjs/add/operator/toPromise";
import { Urls } from "./urls";
import { ScrollbackChunk } from "./scrollback";
import { SessionService } from "./session.service";
import { TagService } from "./tag.service";

///<reference path="../typings/globals/jquery/index.d.ts" />
///<reference path="../typings/globals/bootstrap/index.d.ts" />

@Component({
	moduleId: module.id,
	selector: "interactive-chunk",
	styleUrls: [
		"./interactive-chunk.component.css"
	],
	template: `<span id="{{tag}}" [ngSwitch]="chunk.type" class="pre-container" data-toggle="popover" data-placement="top" data-trigger="manual" (mouseover)="showPopover()" (mouseout)="hidePopover()">
		<span *ngSwitchCase="'wob'" class="{{chunk.type}} pre">{{chunk.text}}</span>
	</span>`,
	providers: [
		TagService
	]
})
export class InteractiveChunkComponent {
	private content: string;
	private popoverShown: boolean;
	private tag: string;

	@Input()
	chunk: ScrollbackChunk;

	constructor(
		private http: Http,
		private sessionService: SessionService,
		private tagService: TagService
	) {
		this.tag = "InteractiveChunk_" + this.tagService.makeTag(4);
	}

	hidePopover() {
		// Indicate that this popover should be hidden.
		this.popoverShown = false;
		// Hide the popover.
		$(`#${this.tag}`).popover("hide");
	}

	showPopover() {
		var headers = new Headers({
			"Authorization": this.sessionService.token,
			"Content-Type": "application/json"
		});
		var verbs: string[] = [];

		// Indicate that the popover should be shown, even though it may not
		// necessarily be visible at this time (i.e. if content is blank
		// because it hasn't yet been populated by server).
		this.popoverShown = true;

		switch(this.chunk.type) {
		case "wob":
			// Once a Bootstrap popover's content is set for the first time,
			// it can no longer be changed, so there's no point in getting new
			// data from the server each time; reuse cached value
			if (!this.content) {
				this.http.get(
						Urls.worldWob + this.chunk.interactive.id + " /info",
						{ headers: headers }
					)
					.toPromise()
					.then((response: Response) => {
						var data = response.json();
						if (data.verbs) {
							verbs = data.verbs.filter((verb) => {
								if (verb.value.charAt(0) != "$") {
									return true;
								}
							})
							.map((verb) => {
								return verb.value;
							});
						}

						// Cache response
						this.content = `
							<p>${data.desc}</p>
							<p><b>Verbs:</b> ${verbs.join(", ")}</p>
						`;

						// Set popover content
						$(`#${this.tag}`).popover({
							html: true,
							content: this.content,
							title: `${data.name} (#${data.id})`
						});

						// If this popover should still be shown, show it now.
						if (this.popoverShown) {
							$(`#${this.tag}`).popover("show");
						}
					});
			}
			else {
				$(`#${this.tag}`).popover("show");
			}
			break;
		}
	}
}
