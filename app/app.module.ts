/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { EditorModule } from "./editor.module";
import { SessionModule } from "./session.module";

import { AppComponent } from "./app.component";
import { appRouting } from "./app.routing";

import { EmbedMediaComponent } from "./embed-media.component";
import { InfobarComponent } from "./infobar.component";
import { InteractiveChunkComponent } from "./interactive-chunk.component";
import { MainTerminalComponent } from "./main-terminal.component";
import { TerminalComponent } from "./terminal.component";

import { MaskPipe} from "./mask.pipe";

import { AutocompleteService } from "./autocomplete.service";
import { TerminalEventService } from "./terminal-event.service";
import { WobService } from "./wob.service";

@NgModule({
	imports: [
		BrowserModule,
		EditorModule,
		SessionModule,
		appRouting
	],
	declarations: [
		AppComponent,
		EmbedMediaComponent,
		InfobarComponent,
		InteractiveChunkComponent,
		MainTerminalComponent,
		TerminalComponent,
		MaskPipe
	],
	providers: [
		AutocompleteService,
		TerminalEventService,
		WobService
	],
	bootstrap: [
		AppComponent
	]
})
export class AppModule {
}
