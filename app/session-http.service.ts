import { Injectable } from "@angular/core";
import { ConnectionBackend, Headers, Http, Request, RequestOptions, RequestOptionsArgs, Response, ResponseOptions, ResponseType } from "@angular/http";
import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import "rxjs/add/operator/do";
import { SessionService } from "./session.service";

@Injectable()
export class SessionHttp extends Http {
	constructor(
		backend: ConnectionBackend,
		defaultOptions: RequestOptions,
		private sessionService: SessionService
	) {
		super(backend, defaultOptions);
	}

	private logoutIfSessionError(response: Response) {
		var data = response.json();
		// If response indicates session is not valid...
		if (!data.success &&
			(
				data.error.match(/Missing bearer token/) ||
				data.error.match(/Token validation error/)
			)
		) {
			// Invalidate our session
			this.sessionService.logout();
		}
	}

	private mergeAuthorizationHeader(options: RequestOptionsArgs): RequestOptionsArgs {
		// If options have already been set, overwrite Authorization header
		// with our token
		if (options) {
			options.headers.set("Authorization", this.sessionService.token);
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

	delete(url: string, options?: RequestOptionsArgs): Observable<Response> {
		// Contact server only if session is valid
		if (this.sessionService.isLoggedIn()) {
			// Insert authorization header into the request
			options = this.mergeAuthorizationHeader(options);
			// Call corresponding superclass method
			return super.delete(url, options)
				// Intercept server response without observer
				.do(this.logoutIfSessionError.bind(this));
		}
		else {
			return this.notLoggedInResponse();
		}
	}


	get(url: string, options?: RequestOptionsArgs): Observable<Response> {
		// Contact server only if session is valid
		if (this.sessionService.isLoggedIn()) {
			// Insert authorization header into the request
			options = this.mergeAuthorizationHeader(options);
			// Call corresponding superclass method
			return super.get(url, options)
				// Intercept server response without observer
				.do(this.logoutIfSessionError.bind(this));
		}
		else {
			return this.notLoggedInResponse();
		}
	}

	post(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
		// Contact server only if session is valid
		if (this.sessionService.isLoggedIn()) {
			// Insert authorization header into the request
			options = this.mergeAuthorizationHeader(options);
			// Call corresponding superclass method
			return super.post(url, body, options)
				// Intercept server response without observer
				.do(this.logoutIfSessionError.bind(this));
		}
		else {
			return this.notLoggedInResponse();
		}
	}

	put(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
		// Contact server only if session is valid
		if (this.sessionService.isLoggedIn()) {
			// Insert authorization header into the request
			options = this.mergeAuthorizationHeader(options);
			// Call corresponding superclass method
			return super.put(url, body, options)
				// Intercept server response without observer
				.do(this.logoutIfSessionError.bind(this));
		}
		else {
			return this.notLoggedInResponse();
		}
	}
}
