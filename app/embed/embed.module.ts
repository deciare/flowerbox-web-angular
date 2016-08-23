/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { ApiModule } from "../api/api.module";
import { SessionModule } from "../session/session.module";

import { EmbedMediaComponent } from "./embed-media.component";
import { InteractiveChunkComponent } from "./interactive-chunk.component";

@NgModule({
	imports: [
		ApiModule,
		CommonModule,
		SessionModule
	],
	exports: [
		EmbedMediaComponent,
		InteractiveChunkComponent
	],
	declarations: [
		EmbedMediaComponent,
		InteractiveChunkComponent
	]
})
export class EmbedModule {
}
