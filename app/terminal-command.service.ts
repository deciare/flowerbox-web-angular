import { Injectable } from "@angular/core";
import { Headers, Http, Response } from "@angular/http";
import { Observable } from "rxjs/observable";
import { Observer } from "rxjs/observer";
import "rxjs/add/operator/toPromise";
import { HearLog, HearLogItem, WobRef } from "./hear-log";

@Injectable()
export class TerminalCommandService {
	private execUrl: string;
	private outputUrl: string;
	private interval: any;
	private lastCheckTime: number;

	tag: string;

	output: Observable<HearLog>;

	constructor(private http: Http) {
		this.execUrl = "http://localhost:3001/terminal/command";
		this.outputUrl = "http://localhost:3001/terminal/new-output";
		this.lastCheckTime = 0; // UNIX timestamp of most recent query to new-output
		this.output = Observable.create(this.awaitOutput.bind(this));
		this.tag = this.makeTag(); // Random tag for identifying commands submitted from this session
	}

	makeTag(): string {
		var text = "";
	    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	    for (var i = 0; i < 16; i++)
	        text += possible.charAt(Math.floor(Math.random() * possible.length));

	    return text;
	};

	handleResponse(response: Response): Promise<any> {
		console.debug("handleResponse", response);
		var data = response.json();
		if (!data.success) {
			return this.handleDataError(data);
		}
		return Promise.resolve(data);
	}

	handleDataError(data: any): Promise<void> {
		console.debug("handleDataError", data);
		return Promise.reject(`Data error: ${data.error}`);
	}

	handleServerError(response: Response): Promise<void> {
		console.debug("handleServerError", data);
		var data = response.json();
		return Promise.reject(`Server error: ${data.status} ${data.statusText}`);
	}

	awaitOutput(observer: Observer<any>) {
		return this.getOutput()
			.then((data: HearLog) => {
				// If data.log.length is 0, then it's an empty array signifying
				// that no new lines have been output since the last check for
				// new output
				if (data.log.length) {
					// Set lastCheckTime based on the timestamp of the last
					// HearLog
					this.lastCheckTime = Math.max(this.lastCheckTime, data.log[data.log.length - 1].timestamp);
				}

				// Notify observer about new output available
				observer.next(data);

				// Send next request
				return this.awaitOutput(observer);
			})
			.catch((error) => {
				// Notify observer about server error or data error
				observer.error(error);

				// Send next request
				return this.awaitOutput(observer);
			});
	}

	getOutput() {
		var headers = new Headers({
			"Content-Type": "application/json"
		});

		console.debug("Getting output from", this.outputUrl + "/?since=" + (this.lastCheckTime + 1) + "&datehack=" + new Date().getTime(), headers);
		return this.http.get(this.outputUrl + "/?since=" + (this.lastCheckTime + 1) + "&datehack=" + new Date().getTime(), headers)
			.toPromise()
			.then(
				this.handleResponse.bind(this),  this.handleServerError.bind(this)
			);
	}

	exec(command: string) {
		var headers = new Headers({
			"Content-Type": "application/json"
		});

		return this.http.get(this.execUrl + "/" + encodeURIComponent(command) + "?tag=" + this.tag)
			.toPromise()
			.then(
				this.handleResponse.bind(this), this.handleServerError.bind(this)
			);
	}
}
