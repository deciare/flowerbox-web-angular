/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { Headers, Http, Response } from "@angular/http";
import { Cookie } from "ng2-cookies/ng2-cookies";
import "rxjs/add/operator/toPromise";
import { Urls } from "./urls";

@Injectable()
export class SessionService {
	token: string;

	constructor(
		private http: Http
	) {
		// If authorization cookie exists, use that to initialise the token
		var authorization = Cookie.get("authorization");
		this.token = authorization ? authorization : undefined;
	}

	handleServerError(response: Response): Promise<void> {
		//console.debug("handleServerError", response);
		if (response.status) {
			return Promise.reject(`Server error: ${response.status} ${response.statusText}`);
		}
		else {
			return Promise.reject("Could not connect to server.");
		}
	}

	isLoggedIn() {
		return this.token !== undefined;
	}

	getPlayerInfo(): Promise<any> {
		var headers = new Headers({
			"Authorization": this.token,
			"Content-Type": "application/json"
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
				console.log(response);
				var data = response.json();
				if (data.success) {
					this.token = "Bearer " + data.token;
					Cookie.set("authorization", "Bearer " + data.token);
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
	}
}
