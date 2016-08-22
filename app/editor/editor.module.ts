/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";

import { editorRouting } from "./editor.routing";

import { PropertyEditorComponent } from "./property-editor.component";
import { VerbEditorComponent } from "./verb-editor.component";
import { WobEditorComponent } from "./wob-editor.component";

import { WobEditorResolve } from "./wob-editor-resolve.service";

@NgModule({
	imports: [
		BrowserModule,
		FormsModule,
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
