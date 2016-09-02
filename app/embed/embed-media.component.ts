/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { Response, ResponseContentType } from "@angular/http";
import "rxjs/add/operator/toPromise";

import { Urls } from "../shared/urls";

import { SessionHttp } from "../session/session-http.service";

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
		private http: SessionHttp
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
			this.getImage();
			break;
		}
	}

	toDataUrl(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			var reader = new FileReader();
			reader.onloadend = function() {
				resolve(reader.result);
			};
			reader.readAsDataURL(blob);
		});
	}

	/**
	 * Get an image from the server and convert it into a dat: URL.
	 * Images can't be loaded directly from the server via a regular <img> tag
	 * because an <img> tag wouldn't supply the requisite Authorization header.
	 */
	getImage() {
		return this.http.get(this.url, {
				responseType: ResponseContentType.Blob
			})
			.toPromise()
			.then((response: Response) => {
				var contentType = response.headers.get("Content-Type");

				if (contentType.startsWith("image/")) {
					this.toDataUrl(response.blob())
						.then((dataUrl: string) => {
							this.data = dataUrl;
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
