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

import { AceConfigComponent } from "./ace-config.component";
import { AudioPropertyEditorComponent } from "./audio-property-editor.component";
import { GenericPropertyEditorComponent } from "./generic-property-editor.component";
import { ImagePropertyEditorComponent } from "./image-property-editor.component";
import { NewPropertyComponent } from "./new-property.component";
import { PermissionsComponent } from "./permissions.component";
import { PermissionEditorComponent } from "./permission-editor.component";
import { PropertyEditorComponent } from "./property-editor.component";
import { TextPropertyEditorComponent } from "./text-property-editor.component";
import { VerbEditorComponent } from "./verb-editor.component";
import { VerbformEditorComponent } from "./verbform-editor.component";
import { WobEditorComponent } from "./wob-editor.component";

import { KeyValuePipe } from "./key-value.pipe";

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
		AceConfigComponent,
		AudioPropertyEditorComponent,
		GenericPropertyEditorComponent,
		ImagePropertyEditorComponent,
		KeyValuePipe,
		NewPropertyComponent,
		PermissionsComponent,
		PermissionEditorComponent,
		PropertyEditorComponent,
		TextPropertyEditorComponent,
		VerbEditorComponent,
		VerbformEditorComponent,
		WobEditorComponent
	],
	providers: [
		WobEditorResolve
	]
})
export class EditorModule {
}
