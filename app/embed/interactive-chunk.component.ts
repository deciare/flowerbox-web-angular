/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { AfterViewInit, Component, EventEmitter, Input, Output, ViewEncapsulation } from "@angular/core";

import { Tag } from "../shared/tag";
import { Urls } from "../shared/urls";
import { WobInfoModel } from "../models/wob";

import { EmbedMediaComponent } from "./embed-media.component";

import { SessionService } from "../session/session.service";
import { WobService } from "../api/wob.service";

///<reference path="../typings/globals/jquery/index.d.ts" />
///<reference path="../typings/globals/bootstrap/index.d.ts" />

export class InteractiveChunk {
	id: number; // wob ID
	command: string; // command to execute on click
	float: string; // whether content should float to left or right of line
	text: string; // text to display inside chunk
	type: string; // type of chunk
	url: string; // URL of related content to display

	/**
	 * Interactive chunk of text for displaying rich elements in the terminal,
	 * such as wob references and images.
	 *
	 * @param {number} id -  Wob ID
	 * @param {string} type - Type of content (see static Type* properties)
	 * @param {string} text - Text to display inside chunk
	 * @param {any} extra - (optional) Content type-specific parameters
	 */
	constructor(id: number, type: string, text: string, extra?: any) {
		this.id = id;
		this.type = type;
		this.text = text;
		if (typeof extra === "object") {
			this.command = extra.command;
			this.float = extra.float;
			this.url = extra.url;
		}
	}

	// Possible values for type
	static TypeImage = "image";
	static TypeWob = "wob";
}

@Component({
	moduleId: module.id,
	selector: "interactive-chunk",
	encapsulation: ViewEncapsulation.None, // styles from this component also apply to child components
	styleUrls: [
		"./interactive-chunk.component.css"
	],
	templateUrl: "./interactive-chunk.component.html",
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
	chunk: InteractiveChunk;

	@Output()
	layout: EventEmitter<any>;

	constructor(
		private sessionService: SessionService,
		private wobService: WobService
	) {
		this.tag = "InteractiveChunk_" + Tag.makeTag(4);
		this.layout = new EventEmitter<any>();
	}

	private popoverPlacement(): string {
		var posY = this.element.offset().top - $(window).scrollTop();
		var viewHeight = $(window).height();

		if (posY < viewHeight / 2) {
			return "bottom";
		}
		else {
			return "top";
		}
	}

	ngAfterViewInit() {
		this.element = $(`#${this.tag}`);
	}

	/**
	 * Emits the "layout" event, to indicate that this chunk's impact on the
	 * document layout may have changed since the chunk was first inserted into
	 * the DOM. For example, if this chunk contained an image that was loaded
	 * asynchronously, the image may have made this chunk taller than it
	 * initially was.
	 */
	onLayout(event: any) {
		this.layout.emit(event);
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
		var verbs: string[] = [];

		// Indicate that the popover should be shown, even though it may not
		// necessarily be visible at this time (i.e. if content is blank
		// because it hasn't yet been populated by server).
		this.popoverShown = true;

		// If content for this popover has never been loaded before, show a
		// placeholder while making a request to the server.
		if (!this.content) {
			this.element.popover({
				content: this.sessionService.isLoggedIn() ? "Loading..." : "Log in to view details",
				placement: this.popoverPlacement()
			}).popover("show");
		}
		// Otherwise, show a popover using cached content, plus indicate that
		// updated content is being loaded from the server
		else {
			this.element.data("bs.popover", null).popover({
				content: this.content,
				html: true,
				title: this.title + (this.sessionService.isLoggedIn() ? " (updating...)" : " (cached)"),
				placement: this.popoverPlacement()
			}).popover("show");
		}

		switch(this.chunk.type) {
		case InteractiveChunk.TypeWob:
			// Once a Bootstrap popover's content is set for the first time,
			// it can no longer be changed, so there's no point in getting new
			// data from the server each time; reuse cached value
			this.wobService.getInfo(this.chunk.id)
				.then((data: WobInfoModel) => {
					var imageProperty = data.properties.find((element) => {
						return element.value == "image";
					});

					// If object has images, fetch the image.
					if (imageProperty !== undefined) {
						this.popoverImageUrl = Urls.wobGetProperty(data.id, "image");
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
					this.title = data.name + " (" + (data.globalid ? "@" + data.globalid + " · " : "") + "#" + data.id + ")";

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
						title: this.title,
						placement: this.popoverPlacement()
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
			title: this.title,
			placement: this.popoverPlacement()
		});

		// Show the popover if it is supposed to be visible.
		if (this.popoverShown) {
			this.element.popover("show");
		}
	}
}
