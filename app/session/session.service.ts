/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { Headers, Http, Response } from "@angular/http";
import { Cookie } from "ng2-cookies";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import "rxjs/add/operator/publishReplay";
import "rxjs/add/operator/toPromise";

import { WobInfoModel } from "../models/wob";
import { Urls } from "../shared/urls";

export class SessionEvent {
	type: string;
	player: WobInfoModel;

	constructor(type: string, player?: WobInfoModel) {
		this.type = type;
		this.player = player;
	}

	// Possible values for type
	static AdminLogin = "adminLogin";
	static AdminLogout = "adminLogout";
	static Login = "login";
	static Logout = "logout";
}

@Injectable()
export class SessionService {
	canHasAdmin: boolean;
	events: BehaviorSubject<SessionEvent>;
	adminToken: string;
	token: string;

	constructor(
		private http: Http
	) {
		this.canHasAdmin = false; // can this player authenticate as admin?

		// If authorization cookie exists, use that to initialise the token
		var authorization = Cookie.get("authorization");
		this.token = authorization ? authorization : undefined;

		// The observable stream should always begin in a logged-out state
		this.events = new BehaviorSubject<SessionEvent>(new SessionEvent(SessionEvent.Logout));

		// If player is already logged in, send login event
		if (this.isLoggedIn()) {
			this.getPlayerInfo()
				.then((player: WobInfoModel) => {
					this.events.next(new SessionEvent(SessionEvent.Login, player));
				});
		}
	}

	handleServerError(response: Response): Promise<void> {
		// console.debug("handleServerError", response);
		if (response.status) {
			var error = "";
			if (response.json) {
				error = "(" + response.json().error + ")";
			}
			return Promise.reject(`Server error: ${response.status} ${response.statusText} ${error}`);
		}
		else {
			return Promise.reject("Could not connect to server (SessionService).");
		}
	}

	isLoggedInAsAdmin() {
		return this.adminToken !== undefined;
	}

	isLoggedIn() {
		return this.token !== undefined;
	}

	getPlayerInfo(): Promise<WobInfoModel> {
		var headers = new Headers({
			"Authorization": this.token
		});

		return this.http.get(
				Urls.userPlayerInfo,
				{ headers: headers }
			)
			.toPromise()
			.then((response: Response) => {
				var data = response.json();

				// Is this player an administrator?
				this.http.get(
						Urls.wobGetProperty(data.id, "admin"),
						{ headers: headers }
					)
					.toPromise()
					.then((response: Response) => {
						var property = response.json();
						this.canHasAdmin = property.value;
					},
					(error) => {
						this.canHasAdmin = false;
					});

				if (data.success) {
					return Promise.resolve(data);
				}
				else {
					return Promise.reject(data.error);
				}
			},
			this.handleServerError.bind(this))
	}

	login(username: string, password: string, admin?: boolean): Promise<any> {
		admin = admin === undefined ? false : admin;

		return this.http.post(Urls.userLogin + username + (admin ? "?admin=true" : ""), {
				password: password
			})
			.toPromise()
			.then((response: Response): Promise<any> => {
				var data = response.json();
				var token = "Bearer " + data.token;

				if (data.success) {
					if (admin) {
						this.adminToken = token;
					}
					else {
						this.token = token;
						Cookie.set("authorization", token);
					}

					// Inform observers this session is logged in
					this.getPlayerInfo()
						.then((player: WobInfoModel) => {
							this.events.next(new SessionEvent(admin ? SessionEvent.AdminLogin : SessionEvent.Login, player));
						});

					return Promise.resolve("Login successful");
				}
				else {
					return Promise.reject(data.error);
				}
			},
			this.handleServerError.bind(this));
	}

	logout(admin?: boolean) {
		admin = admin === undefined ? false : admin;

		if (admin) {
			this.adminToken = undefined;
		}
		else {
			this.token = undefined;
			Cookie.delete("authorization");
		}

		// Inform observers this session is logged out
		this.events.next(new SessionEvent(admin ? SessionEvent.AdminLogout : SessionEvent.Logout));
	}
}
