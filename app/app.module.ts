/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { ApiModule } from "./api/api.module";
import { EditorModule } from "./editor/editor.module";
import { SessionModule } from "./session/session.module";
import { StatusModule } from "./status/status.module";

import { AppComponent } from "./app.component";
import { appRouting } from "./app.routing";

import { EmbedMediaComponent } from "./shared/embed-media.component";
import { InteractiveChunkComponent } from "./shared/interactive-chunk.component";
import { MainTerminalComponent } from "./main-terminal.component";
import { TerminalComponent } from "./terminal/terminal.component";

import { MaskPipe} from "./terminal/mask.pipe";

import { AutocompleteService } from "./terminal/autocomplete.service";

@NgModule({
	imports: [
		ApiModule,
		BrowserModule,
		EditorModule,
		SessionModule,
		StatusModule,
		appRouting
	],
	declarations: [
		AppComponent,
		EmbedMediaComponent,
		InteractiveChunkComponent,
		MainTerminalComponent,
		TerminalComponent,
		MaskPipe
	],
	providers: [
		AutocompleteService
	],
	bootstrap: [
		AppComponent
	]
})
export class AppModule {
}
