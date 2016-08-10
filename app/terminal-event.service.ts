/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { Headers, Http, Response } from "@angular/http";
import { Observable } from "rxjs/observable";
import { Observer } from "rxjs/observer";
import "rxjs/add/operator/toPromise";
import { EventStream, EventStreamItem, WobRef } from "./event-stream";
import { SessionService } from "./session.service";
import { TagService } from "./tag.service";
import { Urls } from "./urls";


@Injectable()
export class TerminalEventService {
	private interval: any;
	private lastCheckTime: number;
	private observer: Observer<any>;
	private retryTimer: NodeJS.Timer;

	tag: string;

	output: Observable<EventStream>;

	constructor(
		private http: Http,
		private sessionService: SessionService,
		private tagService: TagService
	) {
		this.lastCheckTime = 0; // UNIX timestamp of most recent query to new-output
		this.output = Observable.create(this.awaitOutput.bind(this));
		this.tag = this.tagService.makeTag(); // Random tag for identifying commands submitted from this session
	}

	private handleResponse(response: Response): Promise<any> {
		// If we're here, that means we received a successful response from the
		// server. Retry checking the event stream immediately.
		this.retryOutput();

		//console.debug("handleResponse", response);
		var data = response.json();
		if (!data.success) {
			return this.handleDataError(data);
		}
		return Promise.resolve(data);
	}

	private handleDataError(data: any): Promise<void> {
		//console.debug("handleDataError", data);
		var error: string = `Data error: ${data.error}`;

		// Notify observer about error
		if (this.observer) {
			this.observer.next({ error: error });
		}

		return Promise.reject(`Data error: ${data.error}`);
	}

	private handleServerError(response: Response): Promise<void> {
		//console.debug("handleServerError", response);
		var error: string;
		if (response.status) {
			error = `Server error: ${response.status} ${response.statusText}`;
		}
		else {
			error = "Could not connect to server.";
		}

		// Notify observer about error
		if (this.observer) {
			this.observer.next({ error: error });
		}

		return Promise.reject(error);
	}

	private retryOutputLater() {
		this.retryTimer = setTimeout(() => {
			this.retryOutput();
		}, 15000);
	}

	retryOutput() {
		// If waiting to retry after a server error, clear the timer and retry
		// immediately
		if (this.retryTimer && this.observer) {
			clearTimeout(this.retryTimer);
			this.retryTimer = undefined;
			this.awaitOutput(this.observer);
		}
	}

	awaitOutput(observer: Observer<any>) {
		// If not currently logged in, don't bother to contact the server.
		if (!this.sessionService.isLoggedIn()) {
			this.retryOutputLater();
			return;
		}

		// Allow awaitOutput() to be called with same observer later
		this.observer = observer;

		return this.getOutput()
			.then((data: EventStream) => {
				// If data.log.length is 0, then it's an empty array signifying
				// that no new lines have been output since the last check for
				// new output
				if (data.log.length) {
					// Set lastCheckTime based on the timestamp of the last
					// EventStream
					this.lastCheckTime = Math.max(this.lastCheckTime, data.log[data.log.length - 1].timestamp);
				}

				// Notify observer about new output available
				observer.next(data);

				// Send next request
				this.awaitOutput(observer);
			})
			.catch((error) => {
				// To avoid spamming the server while it is down, wait a while
				// before sending the next request
				this.retryOutputLater();
			});
	}

	getOutput() {
		var headers = new Headers({
			"Authorization": this.sessionService.token,
			"Content-Type": "application/json"
		});

		//console.debug("Getting output from", Urls.termOutput + "?since=" + (this.lastCheckTime + 1) + "&datehack=" + new Date().getTime(), headers);
		return this.http.get(
				Urls.termEvents + "?since=" + (this.lastCheckTime + 1) + "&datehack=" + new Date().getTime(),
				{ headers: headers }
			)
			.toPromise()
			.then(
				this.handleResponse.bind(this),  this.handleServerError.bind(this)
			);
	}

	exec(command: string) {
		var headers = new Headers({
			"Authorization": this.sessionService.token,
			"Content-Type": "application/json"
		});

		return this.http.get(
				Urls.termExec + encodeURIComponent(command) + "?tag=" + this.tag,
				{ headers: headers }
			)
			.toPromise()
			.then(
				this.handleResponse.bind(this), this.handleServerError.bind(this)
			);
	}
}
