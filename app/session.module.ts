/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { HttpModule, RequestOptions, XHRBackend } from "@angular/http";

import { SessionHttp } from "./session-http.service";
import { SessionService } from "./session.service";

@NgModule({
	imports: [
		HttpModule
	],
	providers: [
		{
			provide: SessionHttp,
			deps: [
				XHRBackend,
				RequestOptions,
				SessionService
			],
			useFactory: (backend: XHRBackend, defaultOptions: RequestOptions, sessionService: SessionService) => {
				return new SessionHttp(backend, defaultOptions, sessionService);
			}
		},
		SessionService
	]
})
export class SessionModule {
}
