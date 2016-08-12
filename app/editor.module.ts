import { NgModule } from "@angular/core";

import { editorRouting } from "./editor.routing";

import { PropertyEditorComponent } from "./property-editor.component";
import { VerbEditorComponent } from "./verb-editor.component";
import { WobEditorComponent } from "./wob-editor.component";

import { WobEditorResolve } from "./wob-editor-resolve.service";

@NgModule({
	imports: [
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
