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
import { ImagePropertyComponent } from "./image-property.component";
import { RichChunkComponent } from "./rich-chunk.component";

@NgModule({
	imports: [
		ApiModule,
		CommonModule,
		SessionModule
	],
	exports: [
		EmbedMediaComponent,
		ImagePropertyComponent,
		RichChunkComponent
	],
	declarations: [
		EmbedMediaComponent,
		ImagePropertyComponent,
		RichChunkComponent
	]
})
export class EmbedModule {
}
