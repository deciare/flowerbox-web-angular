import { Injectable } from "@angular/core";
import { Response } from "@angular/http";
import "rxjs/add/operator/toPromise";

import { Urls } from "./urls";
import { WobEditState, WobInfo, WobInfoList } from "./wob";

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

	/*
	WobEditState {
		id: number,
		server: [
			properties: [
				{
					sourceId: number,
					name: string,
					value: any
				},
				...
			],
			verbs: [
				{
					sourceId: number,
					name: string,
					sigs: [
						string,
						...
					],
					code: string
				},
				...
			]
		],
		draft: [
			properties: [
				{
					sourceId: number,
					name: string,
					value: any
				},
				...
			],
			verbs: [
				{
					sourceId: number,
					name: string,
					sigs: [
						string,
						...
					],
					code: string
				},
				...
			]
		]
	}
	*/
	getEditState(id: number): Promise<any /**/> {
		var state: WobEditState = new WobEditState(id);
		var propertyPromises: Promise<any>[] = [];
		var verbPromises: Promise<any>[] = [];

		return this.getInfo(id)
			.then((data: WobInfo) => {
				// Expect a promise to resolve with info about each property
				data.properties.forEach((property) => {
					propertyPromises.push(this.getProperty(id, property.value));
				});
				// TODO: Pending server-side API implementation
				//Expect a promise to resolve with info about each verb

				// Return a promise that resolves after all properties and
				// verbs have been retrieved
				return Promise.all([
						Promise.all(propertyPromises),
						Promise.all(verbPromises)
					])
					.then((values) => {
						// Iterate through properties
						values[0].forEach((property) => {
							state.server.properties.push(property);
						});
						// Iterate through verbs
						values[1].forEach((verb) => {
							state.server.verbs.push(verb);
						});

						return state;
					});
			});
	}

	getInfo(id: number): Promise<any /* WobInfo | string */> {
		return this.http.get(Urls.wobInfo(id))
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getProperty(id: number, name: string): Promise<any> {
		return this.http.get(Urls.wobProperty(id, name))
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setProperty(id: number, name: string, value: string): Promise<any> {
		return this.http.putFormData(Urls.wobProperty(id), {
				[name]: JSON.stringify(value)
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}
}