/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { ConnectionBackend, Headers, Http, Request, RequestOptions, RequestOptionsArgs, Response, ResponseOptions, ResponseType } from "@angular/http";
import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import "rxjs/add/operator/do";
import { SessionService } from "../session/session.service";

export interface SessionRequestOptionsArgs extends RequestOptionsArgs {
	admin?: boolean;
}

@Injectable()
export class SessionHttp extends Http {
	constructor(
		backend: ConnectionBackend,
		defaultOptions: RequestOptions,
		private sessionService: SessionService
	) {
		super(backend, defaultOptions);
	}

	private formDataFromBody(body: any): FormData {
		var formData = new FormData();

		for (let property in body) {
			if (body.hasOwnProperty(property)) {
				formData.append(property, body[property]);
			}
		}

		return formData;
	}

	private logoutIfSessionError(response: Response, options: SessionRequestOptionsArgs) {
		var data = response.json();
		// If response indicates session is not valid...
		if (response.status == 401) {
			// Invalidate our session
			this.sessionService.logout(options.admin);
		}
	}

	private mergeAuthorizationHeader(options: SessionRequestOptionsArgs): SessionRequestOptionsArgs {
		// If options have already been set, overwrite Authorization header
		// with our token
		if (options) {
			if (options.headers) {
				options.headers.set("Authorization", options.admin ? this.sessionService.adminToken : this.sessionService.token);
			}
			else {
				options = {
					headers: new Headers({
						"Authorization": options.admin ? this.sessionService.adminToken : this.sessionService.token
					}),
					admin: options.admin
				}
			}
		}
		// Otherwise, create a new options object with our token
		else {
			options = {
				headers: new Headers({
					"Authorization": this.sessionService.token
				})
			}
		}

		return options;
	}

	private notLoggedInResponse(): Observable<Response> {
		var responseOptions: ResponseOptions = new ResponseOptions({
			body: "Not logged in",
			type: ResponseType.Error,
			status: -1,
			statusText: "Not logged in"
		});

		return new Observable<Response>((observer: Observer<Response>) => {
			observer.error(new Response(responseOptions));
		});
	}

	private sendFormData(method: string, url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
		// Contact server only if session is valid
		if (this.sessionService.isLoggedIn()) {
			var observable: Observable<Response>;
			var xhr = new XMLHttpRequest();
			var formData = this.formDataFromBody(body);

			// Insert authorization header into the request
			options = this.mergeAuthorizationHeader(options);

			// Initialise async request, translate headers into XHR-compatible
			// form, and attach event handlers
			xhr.open(method, url, true);
			options.headers.forEach((values: string[], name: string) => {
				xhr.setRequestHeader(name, values.join(";"));
			});
			observable = this.wrapXhrEvents(xhr);

			// Upload body as multipart/form-data
			xhr.send(formData);

			// Return an Observable that notifies on XHR events
			return observable
				// Intercept server response without observer
				.do(undefined, (response: Response) => {
					this.logoutIfSessionError(response, options);
				});
		}
		else {
			return this.notLoggedInResponse();
		}
	}

	private wrapXhrEvents(xhr: XMLHttpRequest) {
		return new Observable<Response>((observer: Observer<Response>) => {
			xhr.onerror = (error: any) => {
				var responseOptions = new ResponseOptions({
					body: error,
					type: ResponseType.Error,
					status: xhr.status,
					statusText: xhr.statusText
				});
				var response = new Response(responseOptions);

				observer.error(response);
			};

			xhr.onload = (event: Event) => {
				var body = xhr.response ? xhr.response : xhr.responseText;
				var status = xhr.status === 0 ? (body ? 200 : 0) : xhr.status;
				var responseOptions = new ResponseOptions({
					body: body,
					type: ResponseType.Default,
					status: status,
					statusText: xhr.statusText ? xhr.statusText : "OK"
				});
				var response = new Response(responseOptions);

				// If status is between 200 and 299, request was successful.
				// Otherwise, request failed.
				response.ok = status >= 200 && status <= 299;
				if (response.ok) {
					observer.next(response);
					observer.complete();
				}
				else {
					observer.error(response);
				}
			};
		});
	}

	delete(url: string, options?: SessionRequestOptionsArgs): Observable<Response> {
		// Contact server only if session is valid
		if (this.sessionService.isLoggedIn()) {
			// Insert authorization header into the request
			options = this.mergeAuthorizationHeader(options);
			// Call corresponding superclass method
			return super.delete(url, options)
				// Intercept server response without observer
				.do(undefined, (response: Response) => {
					this.logoutIfSessionError(response, options);
				});
		}
		else {
			return this.notLoggedInResponse();
		}
	}


	get(url: string, options?: SessionRequestOptionsArgs): Observable<Response> {
		// Contact server only if session is valid
		if (this.sessionService.isLoggedIn()) {
			// Insert authorization header into the request
			options = this.mergeAuthorizationHeader(options);
			// Call corresponding superclass method
			return super.get(url, options)
				// Intercept server response without observer
				.do(undefined, (response: Response) => {
					this.logoutIfSessionError(response, options);
				});
		}
		else {
			return this.notLoggedInResponse();
		}
	}

	post(url: string, body: any, options?: SessionRequestOptionsArgs): Observable<Response> {
		// Contact server only if session is valid
		if (this.sessionService.isLoggedIn()) {
			// Insert authorization header into the request
			options = this.mergeAuthorizationHeader(options);
			// Call corresponding superclass method
			return super.post(url, body, options)
				// Intercept server response without observer
				.do(undefined, (response: Response) => {
					this.logoutIfSessionError(response, options);
				});
		}
		else {
			return this.notLoggedInResponse();
		}
	}

	postFormData(url: string, body: any, options?: SessionRequestOptionsArgs) : Observable<Response> {
		return this.sendFormData("POST", url, body, options);
	}

	put(url: string, body: any, options?: SessionRequestOptionsArgs): Observable<Response> {
		// Contact server only if session is valid
		if (this.sessionService.isLoggedIn()) {
			// Insert authorization header into the request
			options = this.mergeAuthorizationHeader(options);
			// Call corresponding superclass method
			return super.put(url, body, options)
				// Intercept server response without observer
				.do(undefined, (response: Response) => {
					this.logoutIfSessionError(response, options);
				});
		}
		else {
			return this.notLoggedInResponse();
		}
	}

	putFormData(url: string, body: any, options?: SessionRequestOptionsArgs) : Observable<Response> {
		return this.sendFormData("PUT", url, body, options);
	}
}