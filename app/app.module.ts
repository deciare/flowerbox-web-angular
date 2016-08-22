/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { EditorModule } from "./editor/editor.module";
import { SessionModule } from "./session/session.module";

import { AppComponent } from "./app.component";
import { appRouting } from "./app.routing";

import { EmbedMediaComponent } from "./shared/embed-media.component";
import { InfobarComponent } from "./terminal/infobar.component";
import { InteractiveChunkComponent } from "./shared/interactive-chunk.component";
import { MainTerminalComponent } from "./main-terminal.component";
import { TerminalComponent } from "./terminal/terminal.component";

import { MaskPipe} from "./terminal/mask.pipe";

import { AutocompleteService } from "./terminal/autocomplete.service";
import { TerminalEventService } from "./api/terminal-event.service";
import { WobService } from "./api/wob.service";

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
