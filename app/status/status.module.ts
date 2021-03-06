/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { ApiModule } from "../api/api.module";
import { SessionModule } from "../session/session.module";

import { InfobarComponent } from "./infobar.component";
import { StatusService } from "./status.service";

@NgModule({
	imports: [
		ApiModule,
		CommonModule,
		SessionModule
	],
	exports: [
		InfobarComponent
	],
	declarations: [
		InfobarComponent
	],
	providers: [
		StatusService
	]
})
export class StatusModule {
}
