/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { AfterViewInit, Component, Input, ViewEncapsulation } from "@angular/core";
import { Headers, Http, Response } from "@angular/http";
import "rxjs/add/operator/toPromise";
import { Urls } from "./urls";
import { ScrollbackChunk } from "./scrollback";
import { SessionService } from "./session.service";
import { TagService } from "./tag.service";
import { EmbedMediaComponent } from "./embed-media.component";

///<reference path="../typings/globals/jquery/index.d.ts" />
///<reference path="../typings/globals/bootstrap/index.d.ts" />

@Component({
	moduleId: module.id,
	selector: "interactive-chunk",
	encapsulation: ViewEncapsulation.None, // styles from this component also apply to child components
	styleUrls: [
		"./interactive-chunk.component.css"
	],
	templateUrl: "./interactive-chunk.component.html",
	directives: [
		EmbedMediaComponent
	],
	providers: [
		TagService
	]
})
export class InteractiveChunkComponent implements AfterViewInit{
	private content: string;
	private title: string;
	private popoverShown: boolean;
	private tag: string;
	private element: JQuery;
	private popoverImageUrl: string;
	private imageData: string;

	@Input()
	chunk: ScrollbackChunk;

	constructor(
		private http: Http,
		private sessionService: SessionService,
		private tagService: TagService
	) {
		this.tag = "InteractiveChunk_" + this.tagService.makeTag(4);
	}

	ngAfterViewInit() {
		this.element = $(`#${this.tag}`);
	}

	hidePopover() {
		// Indicate that this popover should be hidden.
		this.popoverShown = false;
		// Hide the popover.
		this.element.popover("hide");
	}

	replacePopover(options: PopoverOptions) {
		// Hide the previous popover. We won't be able to hide it
		// after re-initialisation because we will no longer have
		// a reference to that instance of the popover.
		this.element.popover("hide");

		// Create a new popover and initialise it with updated content.
		this.element.data("bs.popover", null).popover(options);
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

		// If content for this popover has never been loaded before, show a
		// placeholder while making a request to the server.
		if (!this.content) {
			this.element.popover({
				content: "Loading..."
			}).popover("show");
		}
		// Otherwise, show a popover using cached content, plus indicate that
		// updated content is being loaded from the server
		else {
			this.element.data("bs.popover", null).popover({
				content: this.content,
				html: true,
				title: this.title + " (updating...)",
			}).popover("show");
		}

		switch(this.chunk.type) {
		case "wob":
			// Once a Bootstrap popover's content is set for the first time,
			// it can no longer be changed, so there's no point in getting new
			// data from the server each time; reuse cached value
			this.http.get(
					Urls.wobInfo(this.chunk.interactive.id),
					{ headers: headers }
				)
				.toPromise()
				.then((response: Response) => {
					var data = response.json();
					var imageProperty = data.properties.find((element) => {
						return element.value == "image";
					});

					// If object has images, fetch the image.
					if (imageProperty !== undefined) {
						this.popoverImageUrl = Urls.wobProperty(data.id, "image");
					}

					// If object has verbs, list non-system verbs.
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
					this.title = `${data.name} (#${data.id})`;

					// If an image was previously cached for this element,
					// reuse it.
					if (this.imageData) {
						this.content = `
							<img src="${this.imageData}" />
						` + this.content;
					}

					// Replace popover withupdated content.
					this.replacePopover({
						content: this.content,
						html: true,
						title: this.title
					});

					// If this popover should still be shown, show it now.
					if (this.popoverShown) {
						this.element.popover("show");
					}
				});
			break;
		}
	}

	setPopoverImage(data: string) {
		// Cache image data.
		this.imageData = data;

		// Prepend the image to the popover's content.
		this.content = `
			<img src="${this.imageData}" />
		` + this.content;
		this.replacePopover({
			content: this.content,
			html: true,
			title: this.title
		});

		// Show the popover if it is supposed to be visible.
		if (this.popoverShown) {
			this.element.popover("show");
		}
	}
}
