/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { Response } from "@angular/http";
import "rxjs/add/operator/toPromise";

import { ModelBase } from "../models/base";
import { Urls } from "../shared/urls";
import { Property, Verb, InstanceOfList, WobEditState, WobInfo, WobInfoList } from "../models/wob";

import { SessionHttp } from "../session/session-http.service";
import { SessionService } from "../session/session.service";

@Injectable()
export class WobService {
	constructor(
		private http: SessionHttp,
		private sessionService: SessionService
	) {
	}

	private handleResponse(response: Response): Promise<any> {
		// console.debug("WobService.handleResponse:", response);
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
		// console.debug("WobService.handleServerError:", response);
		if (response.status) {
			var error = "";
			if (response.json) {
				error = "(" + response.json().error + ")";
			}
			return Promise.reject(`Server error: ${response.status} ${response.statusText} ${error}`);
		}
		else {
			return Promise.reject("Could not connect to server (WobService).");
		}
	}

	getContents(id: number, admin?: boolean): Promise<WobInfoList>{
		return this.http.get(Urls.worldWob + id + "/contents", {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getEditState(id: number, admin?: boolean): Promise<WobEditState> {
		var state: WobEditState = new WobEditState(id);
		var propertyPromises: Promise<any>[] = [];
		var verbPromises: Promise<any>[] = [];

		// Get info about this wob
		return this.getInfo(id)
			.then((data: WobInfo) => {
				// Expect a promise to resolve with info about each property
				data.properties.forEach((property) => {
					propertyPromises.push(
						this.getProperty(id, property.value, admin)
							.catch((error) => {
								// If a property cannot be fetched, it's a
								// security error; move along
								return null;
							})
					);
				});
				// Expect a promise to resolve with info about each verb
				data.verbs.forEach((verb) => {
					verbPromises.push(this.getVerb(id, verb.value, admin));
				});

				// Obtain player's draft for this wob, if any
				return this.sessionService.getPlayerInfo()
					.then((player: WobInfo) => {
						return this.getProperty(player.id, Urls.draftWob + id);
					})
					.then((draft: Property) => {
						// If draft exists, pass it on to the next then
						return draft;
					},
					(error: any) => {
						// If draft does not exist, pass undefined to the next
						// then
						return undefined;
					});
			})
			.then((draft: Property) => {
				// If a draft was found...
				if (draft) {
					// Populate state with all properties and verbs found in
					// the draft
					for (let key in draft.value) {
						if (key.startsWith(Urls.draftProperty)) {
							state.draft.properties.push(new Property(
								// Wob ID
								id,
								// Property name minus prefix
								key.substring(Urls.draftProperty.length),
								// Value
								draft.value[key],
								// Sub-property
								undefined,
								// Draft status
								true
							));
						}
						else if (key.startsWith(Urls.draftVerb)) {
							state.draft.verbs.push(new Verb(
								// Wob ID
								id,
								// Verb name minus prefix
								key.substring(Urls.draftVerb.length),
								// Verbforms
								draft.value[key].sigs,
								// Code
								draft.value[key].code,
								// Draft status
								Verb.StatusDraft
							));
						}
					}
				}

				// Return a promise that resolves after all properties and
				// verbs have been retrieved
				return Promise.all([
						Promise.all(propertyPromises),
						Promise.all(verbPromises)
					]);
			})
			.then((values) => {
				// Add each applied property to the edit state
				values[0].forEach((property: Property) => {
					if (!property) {
						// Some properties may be missing due to security
						// constraints; simply skip those.
						return;
					}

					// Exclude drafts, event stream, and administrative
					// properties from being shown in the property editor
					if (!property.name.startsWith(Urls.draftWob) &&
						property.name != "eventstream" &&
						property.name != "pwhash" &&
						property.name != "admin"
					) {
						state.applied.properties.push(property);
					}
				});
				// Add each applied verb to the edit state
				values[1].forEach((verb: Verb) => {
					state.applied.verbs.push(verb);
				});

				return state;
			});
	}

	deleteProperty(id: number | string, name: string, admin?: boolean): Promise<ModelBase> {
		return this.http.delete(Urls.wobGetProperty(id, name), {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	deletePropertyDraft(id: number | string, name: string): Promise<ModelBase> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfo) => {
				return this.http.delete(Urls.worldWob + player.id + Urls.wobGetPropertyDraft(id, name)).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getInfo(id: number | string, admin?: boolean): Promise<WobInfo> {
		return this.http.get(Urls.wobInfo(id), {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	instanceOf(ids: number | number[] | string | string[], ancestorId: number | string): Promise<InstanceOfList> {
		var idStr = ids instanceof Array ? ids.join(",") : ids;
		return this.http.get(Urls.wobInstanceOf(idStr, ancestorId))
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getProperty(id: number | string, name: string, admin?: boolean): Promise<Property> {
		return this.http.get(Urls.wobGetProperty(id, name), {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setBinaryProperty(id: number, name: string, value: string, admin?: boolean): Promise<ModelBase> {
		return this.http.putFormData(Urls.wobSetBinaryProperties(id), {
				[name]: JSON.stringify(value)
			}, {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	/**
	 * Sets one or more properties based on an input object. The input object
	 * has the form:
	 *
	 *   {
	 *     nameOfProperty: valueOfProperty,
	 *     nameOfOtherProperty: valueOfOtherProperty,
	 *     ...
	 *   }
	 *
	 * Where nameOfProperty is a string, and valueOfProperty is any object,
	 * string, number, or boolean.
	 *
	 * @params id (number) ID of wob whose property to set
	 * @params properties (any) As descibed above
	 */
	setProperties(id: number, properties: any, admin?: boolean): Promise<ModelBase> {
		return this.http.put(Urls.wobSetProperties(id), properties, {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setProperty(id: number, name: string, value: string, admin?: boolean): Promise<ModelBase> {
		return this.http.put(Urls.wobSetProperties(id), {
				[name]: value
			}, {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getPropertyDraft(id: number, name: string): Promise<Property> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfo) => {
				return this.http.get(Urls.worldWob + player.id + Urls.wobGetPropertyDraft(id, name)).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setPropertyDraft(id: number, name: string, value: string): Promise<ModelBase> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfo) => {
				return this.http.put(Urls.worldWob + player.id +  Urls.wobSetDrafts(id),
					{
						[Urls.draftProperty + name]: value
					})
					.toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getVerb(id: number, name: string, admin?: boolean): Promise<Verb> {
		return this.http.get(Urls.wobGetVerb(id, name), {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setVerb(id: number, name: string, value: string, admin?: boolean): Promise<ModelBase> {
		return this.http.putFormData(Urls.wobSetVerbs(id), {
				[name]: JSON.stringify(value)
			}, {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getVerbDraft(id: number, name: string): Promise<Verb> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfo) => {
				return this.http.get(Urls.worldWob + player.id + Urls.wobGetVerbDraft(id, name)).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setVerbDraft(id: number, name: string, sigs: string[], code: string): Promise<ModelBase> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfo) => {
				return this.http.put(Urls.worldWob + player.id + Urls.wobSetDrafts(id), {
					[Urls.draftVerb + name]: {
						sigs: sigs,
						code: code
					}
				}).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}
}
