/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { Headers, Http, Response } from "@angular/http";
import { Cookie } from "ng2-cookies/ng2-cookies";
import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import "rxjs/add/operator/toPromise";

import { WobInfo } from "../models/wob";
import { Urls } from "../shared/urls";

export class SessionEvent {
	type: string;
	player: WobInfo;

	constructor(type: string, player?: WobInfo) {
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
	private observer: Observer<any>;

	events: Observable<any>;
	adminToken: string;
	token: string;

	constructor(
		private http: Http
	) {
		// If authorization cookie exists, use that to initialise the token
		var authorization = Cookie.get("authorization");
		this.token = authorization ? authorization : undefined;
		this.events = new Observable<any>((observer) => {
			this.observer = observer;
		});
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

	getPlayerInfo(): Promise<WobInfo> {
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
						.then((player: WobInfo) => {
							this.observer.next(new SessionEvent(admin ? SessionEvent.AdminLogin : SessionEvent.Login, player));
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
		this.observer.next(new SessionEvent(admin ? SessionEvent.AdminLogout : SessionEvent.Logout));
	}
}
