/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { Response, ResponseContentType } from "@angular/http";
import "rxjs/add/operator/toPromise";

import { ModelBase } from "../models/base";
import { Urls } from "../shared/urls";
import { Property, Verb, InstanceOfList, Intrinsic, WobEditState, WobInfo, WobInfoList } from "../models/wob";

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
		var blobType;
		var contentType = response.headers.get("Content-Type");

		if (contentType.startsWith("application/json")) {
			let data: any = response.json();

			if (data.success) {
				return Promise.resolve(data);
			}
			else {
				return this.handleDataError(data.error);
			}
		}
		else if (contentType.startsWith("audio/")) {
			blobType = "audio";
		}
		else if (contentType.startsWith("image/")) {
			blobType = "image";
		}
		else if (contentType.startsWith("video/")) {
			blobType="video";
		}

		if (blobType) {
			let metadata = JSON.parse(response.headers.get("X-Property-Metadata"));
			try {
				let data: Blob = response.blob();
				return Urls.blobToDataUri(data)
					.then((dataUri: string) => {
						return new Property(
							metadata.id,
							metadata.name,
							dataUri,
							undefined,
							undefined,
							undefined,
							blobType
						);
					});
			}
			catch(error) {
				// Retrieving blob may fail if XMLHttpRequest.responseType was
				// set incorrectly.
				console.error("WobService.handleResponse():", error);
				return Promise.reject(error);
			}
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
				// Set intrinsic properties
				state.applied.intrinsics = [
					new Intrinsic("base", data.base),
					new Intrinsic("container", data.container),
					new Intrinsic("owner", data.owner),
					new Intrinsic("group", data.group),
					new Intrinsic("perms", data.perms)
				];

				// Expect a promise to resolve with info about each property
				data.properties.forEach((property) => {
					// FIXME: "image" property is a special case until
					//        server API can identify property content type
					if (property.value == "image") {
						propertyPromises.push(
							this.getBinaryProperty(id, property.value, admin)
								.catch((error) => {
									// If a property cannot be fetched, it's a
									// security error; move along
									return null;
								})
						);
					}
					else {
						propertyPromises.push(
							this.getProperty(id, property.value, admin)
								.catch((error) => {
									// If a property cannot be fetched, it's a
									// security error; move along
									return null;
								})
						);
					}
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
							let blobType;

							if (typeof draft.value[key] === "string" && draft.value[key].startsWith("data:")) {
								let contentType = Urls.dataUriMediaType(draft.value[key]);

								if (contentType.startsWith("audio/")) {
									blobType = "audio";
								}
								else if (contentType.startsWith("image/")) {
									blobType = "image";
								}
								else if (contentType.startsWith("video/")) {
									blobType = "video/";
								}
							}
							state.draft.properties.push(new Property(
								// Wob ID
								id,
								// Property name minus prefix
								key.substring(Urls.draftProperty.length),
								// Value
								draft.value[key],
								// TODO: Permissions
								undefined,
								// Sub-property
								undefined,
								// Draft status
								true,
								// Type of blob data this is, if it is one
								blobType
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
								// TODO: Permissions
								undefined,
								// Draft status
								false
							));
						}
						else if (key.startsWith(Urls.draftIntrinsic)) {
							state.draft.intrinsics.push(new Intrinsic(
								// Intrinsic property name minus prefix
								key.substring(Urls.draftIntrinsic.length),
								// Value
								draft.value[key]
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
			.then((values: [ Property[], Verb[] ]) => {
				// Add each applied property to the edit state
				values[0].forEach((property: Property) => {
					if (!property) {
						// Some properties may be missing due to security
						// constraints; simply skip those.
						return;
					}

					// Exclude drafts, event stream, and properties that are
					// not meant to be edited directly from being shown in
					// the property editor.
					if (!property.name.startsWith(Urls.draftWob) &&
						property.name != "eventstream" &&
						property.name != "pwhash"
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

	deleteIntrinsicDraft(id: number | string, name: string): Promise<ModelBase> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfo) => {
				return this.http.delete(Urls.worldWob + player.id + Urls.wobGetIntrinsicDraft(id, name)).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
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

	deleteVerb(id: number | string, name: string, admin: boolean): Promise<ModelBase> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfo) => {
				return this.http.delete(Urls.wobGetVerb(id, name), {
					admin: admin
				}).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	deleteVerbDraft(id: number | string, name: string): Promise<ModelBase> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfo) => {
				return this.http.delete(Urls.worldWob + player.id + Urls.wobGetVerbDraft(id, name)).toPromise();
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

	setIntrinsics(id: number, intrinsics: any, admin?: boolean): Promise<ModelBase> {
		return this.http.put(Urls.wobInfo(id), intrinsics, {
			admin: admin
		})
		.toPromise()
		.then(
			this.handleResponse.bind(this),
			this.handleServerError.bind(this)
		);
	}

	setIntrinsic(id: number, name: string, value: any, admin?: boolean): Promise<ModelBase> {
		return this.http.put(Urls.wobInfo(id), {
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

	getIntrinsicDraft(id: number, name: string): Promise<Intrinsic> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfo) => {
				return this.http.get(Urls.worldWob + player.id + Urls.wobGetIntrinsicDraft(id, name)).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setIntrinsicDraft(id: number, name: string, value: any): Promise<ModelBase> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfo) => {
				return this.http.put(Urls.worldWob + player.id +  Urls.wobSetDrafts(id),
					{
						[Urls.draftIntrinsic + name]: value
					})
					.toPromise();
			})
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

	getBinaryProperty(id: number | string, name: string, admin?: boolean): Promise<Blob> {
		return this.http.get(Urls.wobGetProperty(id, name), {
				responseType: ResponseContentType.Blob,
				admin: admin
			})
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

	setBinaryProperty(id: number, name: string, value: any, admin?: boolean): Promise<ModelBase> {
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

	setProperty(id: number, name: string, value: any, admin?: boolean): Promise<ModelBase> {
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

	setPropertyDraft(id: number, name: string, value: any): Promise<ModelBase> {
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

	setVerbs(id: number, verbs: any, admin?: boolean): Promise<ModelBase> {
		return this.http.put(Urls.wobSetVerbs(id), verbs, {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setVerb(id: number, name: string, sigs: string[], code: string, admin?: boolean): Promise<ModelBase> {
		return this.http.put(Urls.wobSetVerbs(id), {
				[name]: {
					sigs: sigs,
					code: code
				}
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
