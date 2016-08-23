/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";

import { SessionModule } from "../session/session.module";

import { TerminalEventService } from "./terminal-event.service";
import { WobService } from "./wob.service";

@NgModule({
	imports: [
		SessionModule
	],
	providers: [
		TerminalEventService,
		WobService
	]
})
export class ApiModule {
}
