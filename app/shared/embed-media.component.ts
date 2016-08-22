/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { Headers, Http, Response } from "@angular/http";
import "rxjs/add/operator/toPromise";
import { SessionService } from "../session/session.service";
import { Urls } from "../shared/urls";

@Component({
	moduleId: module.id,
	selector: "embed-media",
	template: `<!--
		--><span *ngIf="!hidden">
			<span [ngSwitch]="type">
				<span *ngSwitchCase="'image'">
					<img *ngIf="data" [src]="data" [alt]="alt" />
				</span>
			</span>
		</span><!--
	-->`
})
export class EmbedMediaComponent implements OnInit, OnChanges {
	private data: string;

	@Input()
	alt: string;

	@Input()
	hidden: boolean;

	@Input()
	type: string;

	@Input()
	url: string;

	@Output()
	load: EventEmitter<string>;

	constructor(
		private http: Http,
		private sessionService: SessionService
	) {
		this.load = new EventEmitter<string>();
	}

	ngOnInit() {
		this.process();
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes["url"].currentValue != changes["url"].previousValue ||
			changes["type"].currentValue != changes["type"].previousValue)
		{
			this.process();
		}
	}

	process() {
		// Skip processing if URL is invalid
		if (!this.url) {
			return;
		}

		switch(this.type) {
		case "image":
			this.getImageWithAuthorization();
			break;
		}
	}

	toDataUrl(raw: any): Promise<string> {
		return new Promise((resolve, reject) => {
			var reader = new FileReader();
			reader.onloadend = function() {
				resolve(reader.result);
			};
			reader.readAsDataURL(raw);
		});
	}

	/**
	 * Get an image from the server and convert it into a dat: URL.
	 * Images can't be loaded directly from the server via a regular <img> tag
	 * because an <img> tag wouldn't supply the requisite Authorization header.
	 */
	getImageWithAuthorization() {
		var headers = new Headers({
			"Authorization": this.sessionService.token
		});

		// FIXME: Angular 2 doesn't yet implement retrieving a response as
		// blob, so use XMLHttpRequest directly for now.
		var request = new XMLHttpRequest();
		request.open("GET", this.url, true);
		request.setRequestHeader("Authorization", this.sessionService.token);
		request.responseType = "blob";

		return new Promise((resolve, reject) => {
				request.onload = function(event) {
					resolve(request);
				};
				request.onerror = function(event) {
					reject(request);
				};
				request.send();
			})
			.then((response: any) => {
				var contentType = response.getResponseHeader("Content-Type");
				var isImage: boolean = contentType.startsWith("image/");

				if (isImage) {
					this.toDataUrl(response.response)
						.then((response: string) => {
							this.data = response;
							this.load.emit(this.data);
						});
				}
			},
			(errorResponse: any) => {
				this.data = "";
				this.load.emit(this.data);
			});
	}
}
