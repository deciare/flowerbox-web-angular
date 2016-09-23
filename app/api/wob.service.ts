/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { Response, ResponseContentType } from "@angular/http";
import "rxjs/add/operator/toPromise";

import { BaseModel } from "../models/base";
import { Urls } from "../shared/urls";
import { PropertyModel, VerbModel, InstanceOfModelList, PermissionsModel, WobInfoModel, WobInfoModelList } from "../models/wob";
import { Permissions } from "../types/permission";
import { EditState, Property, Verb } from "../types/wob";

import { SessionHttp } from "../session/session-http.service";
import { SessionService } from "../session/session.service";

@Injectable()
export class WobService {
	constructor(
		private http: SessionHttp,
		private sessionService: SessionService
	) {
	}

	private handleResponse(response: Response, isDraft?: boolean): Promise<any> {
		console.log(response);
		var contentType = response.headers ? response.headers.get("Content-Type") : undefined;

		if (!contentType || contentType.startsWith("application/json")) {
			let data: any = response.json();

			if (data.success) {
				if (
					data.id !== undefined &&
					data.name !== undefined &&
					data.value !== undefined
				) {
					if (isDraft) {
						// Response contains a property draft.
						return Promise.resolve(new Property(
							data.id,
							data.name,
							data.value.value,
							false,
							true,
							data.value.perms,
							data.value.perms
						));
					}
					else {
						// Response contains a Property.
						return Promise.resolve(new Property(
							data.id,
							data.name,
							data.value,
							false,
							false,
							data.perms,
							data.permseffective
						));
					}
				}
				else if (
					data.id !== undefined &&
					data.name !== undefined &&
					(
						data.sigs !== undefined ||
						data.code !== undefined
					)
				) {
					// Response contains a Verb.
					return Promise.resolve(new Verb(
						data.id,
						data.name,
						data.sigs,
						data.code,
						isDraft,
						data.perms,
						data.permseefective
					));
				}
				else {
					return Promise.resolve(data);
				}
			}
			else {
				return this.handleDataError(data.error);
			}
		}
		else if (
			contentType.startsWith("audio/") ||
			contentType.startsWith("image/") ||
			contentType.startsWith("video/")
		) {
			let metadata = JSON.parse(response.headers.get("X-Property-Metadata"));
			try {
				let data: Blob = response.blob();
				return Promise.resolve(new Property(
					metadata.id,
					metadata.name,
					data,
					isDraft,
					metadata.perms,
					metadata.permseffective
				));
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

	getContents(id: number, admin?: boolean): Promise<WobInfoModelList>{
		return this.http.get(Urls.worldWob + id + "/contents", {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getEditState(id: number, admin?: boolean): Promise<EditState> {
		var state: EditState = new EditState(id);
		var draftBlobPromises: Promise<Property>[] = [];
		var propertyPromises: Promise<Property>[] = [];
		var verbPromises: Promise<Verb>[] = [];

		// Get info about this wob
		return this.getInfo(id)
			.then((data: WobInfoModel) => {
				// Set intrinsic properties
				state.applied.intrinsics = [
					new Property(id, "base", data.base, true, false, undefined, undefined),
					new Property(id, "container", data.container, true, false, undefined, undefined),
					new Property(id, "owner", data.owner, true, false, undefined, undefined),
					new Property(id, "group", data.group, true, false, undefined, undefined),
					new Property(id, "perms", data.perms, true, false, undefined, undefined)
				];

				// Expect a promise to resolve with info about each property
				data.properties.forEach((property) => {
					if (property.blobmimetype) {
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
					.then((player: WobInfoModel) => {
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
							// If this is a property draft...
							if (typeof draft.value[key] === "string" && draft.value[key].startsWith(Urls.draftBlob)) {
								// If this draft's value is a Blob, the Blob
								// content was stored in a separate property.
								// Add it to the list of draft Blobs that need
								// to be retrieved.
								draftBlobPromises.push(this.getBinaryPropertyDraft(id, key.substring(Urls.draftProperty.length)));
							}
							state.draft.properties.push(new Property(
								// Wob ID
								id,
								// Property name minus prefix
								key.substring(Urls.draftProperty.length),
								// Value
								draft.value[key].value,
								// Is intrinsic property?
								false,
								// Is a draft?
								true,
								// Permissions
								draft.value[key].perms,
								// Effective permissions (same as permissions,
								// which may be undefined)
								draft.value[key].perms
							));
						}
						else if (key.startsWith(Urls.draftVerb)) {
							// If this is a verb draft...
							state.draft.verbs.push(new Verb(
								// Wob ID
								id,
								// Verb name minus prefix
								key.substring(Urls.draftVerb.length),
								// Verbforms
								draft.value[key].sigs,
								// Code
								draft.value[key].code,
								// Is a draft?
								true,
								// TODO: Permissions
								undefined,
								undefined
							));
						}
						else if (key.startsWith(Urls.draftIntrinsic)) {
							// If this is a draft for an intrinsic property...
							state.draft.intrinsics.push(new Property(
								// Wob ID
								id,
								// Intrinsic property name minus prefix
								key.substring(Urls.draftIntrinsic.length),
								// Value
								draft.value[key],
								// Is an intrinsic property?
								true,
								// Is a draft?
								false,
								// TODO: Permissions
								undefined,
								undefined
							));
						}
					}
				}

				// Return a promise that resolves after all Blobs associated
				// with drafts have been retrieved.
				return Promise.all(draftBlobPromises);
			})
			.then((draftBlobProperties: Property[]) => {
				// For each Blob corresponding to a property draft...
				draftBlobProperties.forEach((draftBlobProperty) => {
					// Find the property draft associaed with the Blob.
					var foundIndex = state.draft.properties.findIndex((value) => {
						// If a property draft is associated witha Blob, then
						// the value of the draft will equal the name of the
						// property where the Blob is stored.
						return value.value == draftBlobProperty.name;
					});

					// Replace the value of the found property draft with th
					// Blob.
					state.draft.properties[foundIndex].value = draftBlobProperty.value;
				});

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

	deleteIntrinsicDraft(id: number | string, name: string): Promise<BaseModel> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
				return this.http.delete(Urls.worldWob + player.id + Urls.wobGetIntrinsicDraft(id, name)).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	deleteProperty(id: number | string, name: string, admin?: boolean): Promise<BaseModel> {
		return this.http.delete(Urls.wobGetProperty(id, name), {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	deleteBinaryPropertyDraft(id: number | string, name: string): Promise<BaseModel> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
				// Delete the property draft.
				return this.http.delete(Urls.worldWob + player.id + Urls.wobGetPropertyDraft(id, name))
					.toPromise()
					.then(
						(response: Response) => {
							// Delete the Blob property associated with this draft.
							return this.deleteProperty(player.id, Urls.draftBlob + id + "_" + name);
						},
						this.handleServerError.bind(this)
					);
			})
	}

	deletePropertyDraft(id: number | string, name: string): Promise<BaseModel> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
				return this.http.delete(Urls.worldWob + player.id + Urls.wobGetPropertyDraft(id, name)).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	deleteVerb(id: number | string, name: string, admin: boolean): Promise<BaseModel> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
				return this.http.delete(Urls.wobGetVerb(id, name), {
					admin: admin
				}).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	deleteVerbDraft(id: number | string, name: string): Promise<BaseModel> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
				return this.http.delete(Urls.worldWob + player.id + Urls.wobGetVerbDraft(id, name)).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getInfo(id: number | string, admin?: boolean): Promise<WobInfoModel> {
		return this.http.get(Urls.wobInfo(id), {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setIntrinsics(id: number, intrinsics: any, admin?: boolean): Promise<BaseModel> {
		return this.http.put(Urls.wobInfo(id), intrinsics, {
			admin: admin
		})
		.toPromise()
		.then(
			this.handleResponse.bind(this),
			this.handleServerError.bind(this)
		);
	}

	setIntrinsic(id: number, name: string, value: any, admin?: boolean): Promise<BaseModel> {
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

	getIntrinsicDraft(id: number, name: string): Promise<Property> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
				return this.http.get(Urls.worldWob + player.id + Urls.wobGetIntrinsicDraft(id, name)).toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setIntrinsicDraft(id: number, name: string, value: any): Promise<BaseModel> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
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

	instanceOf(ids: number | number[] | string | string[], ancestorId: number | string): Promise<InstanceOfModelList> {
		var idStr = ids instanceof Array ? ids.join(",") : ids;
		return this.http.get(Urls.wobInstanceOf(idStr, ancestorId))
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getBinaryProperty(id: number | string, name: string, admin?: boolean): Promise<Property> {
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

	setBinaryProperty(id: number, name: string, value: any, admin?: boolean): Promise<BaseModel> {
		// If value is a data URI, it needs to be converted into a Blob.
		if (!(value instanceof Blob)) {
			value = JSON.stringify(value);
		}

		return this.http.putFormData(Urls.wobSetBinaryProperties(id), {
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
	 * @param {number} id - ID of wob whose property to set
	 * @param {any} properties - As descibed above
	 */
	setProperties(id: number, properties: any, admin?: boolean): Promise<BaseModel> {
		return this.http.putFormData(Urls.wobSetProperties(id), properties, {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setProperty(id: number, name: string, value: any, admin?: boolean): Promise<BaseModel> {
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

	getBinaryPropertyDraft(id: number | string, name: string): Promise<Property> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
				return this.http.get(Urls.wobGetProperty(player.id, Urls.draftBlob + id + "_" + name), {
						responseType: ResponseContentType.Blob
					})
					.toPromise();
			})
			.then(
				(response: Response) => {
					return this.handleResponse(response, true);
				},
				this.handleServerError.bind(this)
			);
	}

	getPropertyDraft(id: number, name: string): Promise<PropertyModel> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
				return this.http.get(Urls.worldWob + player.id + Urls.wobGetPropertyDraft(id, name)).toPromise();
			})
			.then(
				(response: Response) => {
					return this.handleResponse(response, true);
				},
				this.handleServerError.bind(this)
			);
	}

	setBinaryPropertyDraft(id: number, name: string, value: any, perms?: string): Promise<BaseModel> {
		var blobPropertyName = Urls.draftBlob + id + "_" + name;

		// If value is a data URI, it needs to be converted into a Blob.
		if (!(value instanceof Blob)) {
			value = JSON.stringify(value);
		}

		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
				// Create a property for storing this Blob.
				return this.http.putFormData(Urls.wobSetBinaryProperties(player.id), {
						[blobPropertyName]: {
							value: value,
							perms: perms
						}
					})
					.toPromise();
			})
			.then(
				(response: Response) => {
					// Create a property draft that indicates that a Blob
					// property corresponding to this draft exists.
					return this.setPropertyDraft(id, name, blobPropertyName);
				},
				this.handleServerError.bind(this)
			);
	}

	setPropertyDraft(id: number, name: string, value: any, perms?: string): Promise<BaseModel> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
				return this.http.put(Urls.worldWob + player.id +  Urls.wobSetDrafts(id),
					{
						[Urls.draftProperty + name]: {
							value: value,
							perms: perms
						}
					})
					.toPromise();
			})
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	getPropertyPermissions(id: number | string, name: string): Promise<PermissionsModel> {
		return this.http.get(Urls.wobPropertyPermissions(id, name))
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setPropertyPermissions(id: number | string, name: string, perms: string, admin?: boolean): Promise<PermissionsModel> {
		return this.http.put(Urls.wobPropertyPermissions(id, name), {
				perms: perms
			}, {
				admin: admin
			})
			.toPromise()
			.then(
				// TODO: If setPropertyPermissions() is called from
				// setProperty(), what happens to the response indicating what
				// the current permissions are? (Since setProperty returns a
				// Promise<BaseModel> and not Promise<Permissions>.)
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

	setVerbs(id: number, verbs: any, admin?: boolean): Promise<BaseModel> {
		return this.http.put(Urls.wobSetVerbs(id), verbs, {
				admin: admin
			})
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}

	setVerb(id: number, name: string, sigs: string[], code: string, admin?: boolean): Promise<BaseModel> {
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
			.then((player: WobInfoModel) => {
				return this.http.get(Urls.worldWob + player.id + Urls.wobGetVerbDraft(id, name)).toPromise();
			})
			.then(
				(response: Response) => {
					return this.handleResponse(response, true);
				},
				this.handleServerError.bind(this)
			);
	}

	setVerbDraft(id: number, name: string, sigs: string[], code: string): Promise<BaseModel> {
		return this.sessionService.getPlayerInfo()
			.then((player: WobInfoModel) => {
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
