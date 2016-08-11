import { Injectable } from "@angular/core";
import { Response } from "@angular/http";
import "rxjs/add/operator/toPromise";

import { Urls } from "./urls";
import { WobInfo, WobInfoList } from "./wob.ts";

import { SessionHttp } from "./session-http.service";

@Injectable()
export class WobService {
	constructor(
		private http: SessionHttp
	) {
	}

	private handleResponse(response: Response): Promise<any> {
		var data = response.json();

		if (data.success) {
			return Promise.resolve(data);
		}
		else {
			return this.handleDataError(data.error);
		}
	}

	private handleDataError(error: string): Promise<void> {
		return Promise.reject(`Data error: ${error}`);
	}

	private handleServerError(response: Response): Promise<void> {
		// console.debug("AutocompleteService.handleServerError:", response);
		if (response.status) {
			return Promise.reject(`Server error: ${response.status} ${response.statusText}`);
		}
		else {
			return Promise.reject("Could not connect to server (WobService).");
		}
	}

	getContents(id: number): Promise<any /* WobInfoList | string */>{
		return this.http.get(Urls.worldWob + id + "/contents")
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getInfo(id: number): Promise<any /* WobInfo | string */> {
		return this.http.get(Urls.wobInfo(id))
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}
}