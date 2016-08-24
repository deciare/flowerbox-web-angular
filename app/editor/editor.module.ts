/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { ApiModule } from "../api/api.module";
import { SessionModule } from "../session/session.module";
import { editorRouting } from "./editor.routing";

import { PropertyEditorComponent } from "./property-editor.component";
import { VerbEditorComponent } from "./verb-editor.component";
import { WobEditorComponent } from "./wob-editor.component";

import { WobEditorResolve } from "./wob-editor-resolve.service";

@NgModule({
	imports: [
		ApiModule,
		CommonModule,
		FormsModule,
		SessionModule,
		editorRouting
	],
	declarations: [
		PropertyEditorComponent,
		VerbEditorComponent,
		WobEditorComponent
	],
	providers: [
		WobEditorResolve
	]
})
export class EditorModule {
}
