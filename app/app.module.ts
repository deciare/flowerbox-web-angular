import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { HttpModule } from "@angular/http";

import { AppComponent } from "./app.component";
import { EmbedMediaComponent } from "./embed-media.component";
import { InteractiveChunkComponent } from "./interactive-chunk.component";
import { TerminalComponent } from "./terminal.component";

import { MaskPipe} from "./mask.pipe";

import { AutocompleteService } from "./autocomplete.service";
import { SessionService } from "./session.service";
import { TagService } from "./tag.service";
import { TerminalEventService } from "./terminal-event.service";

@NgModule({
	imports: [
		BrowserModule,
		HttpModule
	],
	declarations: [
		AppComponent,
		EmbedMediaComponent,
		InteractiveChunkComponent,
		TerminalComponent,
		MaskPipe
	],
	providers: [
		AutocompleteService,
		SessionService,
		TagService,
		TerminalEventService
	],
	bootstrap: [
		AppComponent
	]
})
export class AppModule {
}