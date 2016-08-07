/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { bootstrap } from "@angular/platform-browser-dynamic";
import { HTTP_PROVIDERS } from "@angular/http";
import { SessionService } from "./session.service";
import { TagService } from "./tag.service";
import { AppComponent } from "./app.component";

bootstrap(
	AppComponent,
	[
		HTTP_PROVIDERS,
		SessionService,
		TagService
	]
);
