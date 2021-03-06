/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { Headers, Response } from "@angular/http";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import "rxjs/add/operator/publishReplay";
import "rxjs/add/operator/toPromise";

import { EventStream, EventStreamItem, WobRef } from "../models/event-stream";
import { Tag } from "../shared/tag";
import { Urls } from "../shared/urls";

import { SessionHttp } from "../session/session-http.service";
import { SessionService } from "../session/session.service";

@Injectable()
export class TerminalEventService {
	private interval: any;
	private lastCheckTime: number;
	private retryTimer: NodeJS.Timer;

	output: BehaviorSubject<any>;
	tag: string;

	constructor(
		private http: SessionHttp,
		private sessionService: SessionService
	) {
		this.lastCheckTime = 0; // UNIX timestamp of most recent query to new-output
		this.tag = Tag.makeTag(); // Random tag for identifying commands submitted from this session

		// Begin trying to get new-events from server.
		this.output = new BehaviorSubject<any>(new EventStream([]));
		this.awaitOutput();
	}

	private handleResponse(response: Response): Promise<any> {
		// If we're here, that means we received a successful response from the
		// server. Retry checking the event stream immediately.
		this.retryOutput();

		// console.debug("handleResponse", response);
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
		this.output.next({ error: error });

		return Promise.reject(`Data error: ${data.error}`);
	}

	private handleServerError(response: Response): Promise<void> {
		// console.debug("TerminalEventService.handleServerError:", response);
		var error = "";
		if (response.status) {
			if (response.json) {
				error = "(" + response.json().error + ")";
			}
			error = `Server error: ${response.status} ${response.statusText} ` + error;
		}
		else {
			error = "Could not connect to server (TerminalEventService).";
		}

		// Notify observer about error
		this.output.next({ error: error });

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
		if (this.retryTimer) {
			clearTimeout(this.retryTimer);
			this.retryTimer = undefined;
			this.awaitOutput();
		}
	}

	awaitOutput() {
		return this.getOutput()
			.then((data: EventStream) => {
				// console.debug("awaitOutput data:", data);
				// If data.log.length is 0, then it's an empty array signifying
				// that no new lines have been output since the last check for
				// new output
				if (data.log.length) {
					// Set lastCheckTime based on the timestamp of the last
					// EventStream
					this.lastCheckTime = Math.max(this.lastCheckTime, data.log[data.log.length - 1].timestamp);
				}

				// Notify observer about new output available
				this.output.next(data);

				// Send next request
				this.awaitOutput();
			})
			.catch((error) => {
				// console.debug("awaitOutput error:", error);
				// To avoid spamming the server while it is down, wait a while
				// before sending the next request
				this.retryOutputLater();
			});
	}

	getOutput(): Promise<any> {
		// console.debug("Getting output from", Urls.termEvents + "?since=" + (this.lastCheckTime + 1) + "&datehack=" + new Date().getTime());
		return this.http.get(
				Urls.termEvents + "?since=" + (this.lastCheckTime + 1) + "&datehack=" + new Date().getTime()
			)
			.toPromise()
			.then(
				this.handleResponse.bind(this),  this.handleServerError.bind(this)
			);
	}

	exec(command: string, admin?: boolean) {
		admin = admin === undefined ? false : admin;
		return this.http.get(
				Urls.termExec + encodeURIComponent(command) + "?tag=" + this.tag,
				{ admin: admin }
			)
			.toPromise()
			.then(
				this.handleResponse.bind(this),
				this.handleServerError.bind(this)
			);
	}
}
