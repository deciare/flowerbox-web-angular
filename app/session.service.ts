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

import { WobInfo } from "./wob";
import { Urls } from "./urls";

export class SessionEvent {
	type: string;
	player: WobInfo;

	constructor(type: string, player?: WobInfo) {
		this.type = type;
		this.player = player;
	}

	// Possible values for type
	static Login = "login";
	static Logout = "logout";
}

@Injectable()
export class SessionService {
	private observer: Observer<any>;

	events: Observable<any>;
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
			return Promise.reject(`Server error: ${response.status} ${response.statusText}`);
		}
		else {
			return Promise.reject("Could not connect to server (SessionService).");
		}
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

	login(username: string, password: string): Promise<any> {
		return this.http.post(Urls.userLogin + username, {
				password: password
			})
			.toPromise()
			.then((response: Response): Promise<any> => {
				var data = response.json();
				if (data.success) {
					this.token = "Bearer " + data.token;
					Cookie.set("authorization", "Bearer " + data.token);

					// Inform observers this session is logged in
					this.getPlayerInfo()
						.then((player: WobInfo) => {
							this.observer.next(new SessionEvent(SessionEvent.Login, player));
						});

					return Promise.resolve("Login successful");
				}
				else {
					return Promise.reject(data.error);
				}
			},
			this.handleServerError.bind(this));
	}

	logout() {
		this.token = undefined;
		Cookie.delete("authorization");

		// Inform observers this session is logged out
		this.observer.next(new SessionEvent(SessionEvent.Logout));
	}
}
