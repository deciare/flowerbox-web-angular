import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { EditorModule } from "./editor.module";
import { SessionModule } from "./session.module";

import { AppComponent } from "./app.component";
import { appRouting } from "./app.routing";

import { EmbedMediaComponent } from "./embed-media.component";
import { InteractiveChunkComponent } from "./interactive-chunk.component";
import { TerminalComponent } from "./terminal.component";

import { MaskPipe} from "./mask.pipe";

import { AutocompleteService } from "./autocomplete.service";
import { TagService } from "./tag.service";
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
		InteractiveChunkComponent,
		TerminalComponent,
		MaskPipe
	],
	providers: [
		AutocompleteService,
		TagService,
		TerminalEventService,
		WobService
	],
	bootstrap: [
		AppComponent
	]
})
export class AppModule {
}
