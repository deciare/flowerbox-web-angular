/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { ApiModule } from "../api/api.module";
import { SessionModule } from "../session/session.module";

import { InfobarComponent } from "./infobar.component";

@NgModule({
	imports: [
		ApiModule,
		BrowserModule,
		SessionModule
	],
	declarations: [
		InfobarComponent
	],
	exports: [
		InfobarComponent
	]
})
export class StatusModule {
}
