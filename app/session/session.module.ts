/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpModule, RequestOptions, XHRBackend } from "@angular/http";

import { sessionRouting } from "./session.routing";

import { LoginComponent } from "./login.component";

import { SessionHttp } from "../session/session-http.service";
import { SessionService } from "../session/session.service";

@NgModule({
	imports: [
		CommonModule,
		FormsModule,
		HttpModule,
		sessionRouting
	],
	exports: [
		LoginComponent
	],
	declarations: [
		LoginComponent
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
