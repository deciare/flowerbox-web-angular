/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { ApiModule } from "../api/api.module";
import { EmbedModule } from "../embed/embed.module";
import { SessionModule } from "../session/session.module";

import { TerminalComponent } from "./terminal.component";

import { MaskPipe } from "./mask.pipe";

import { AutocompleteService } from "./autocomplete.service";

@NgModule({
	imports: [
		ApiModule,
		CommonModule,
		EmbedModule,
		SessionModule
	],
	exports: [
		TerminalComponent
	],
	declarations: [
		MaskPipe,
		TerminalComponent
	],
	providers: [
		AutocompleteService
	]
})
export class TerminalModule {
}
