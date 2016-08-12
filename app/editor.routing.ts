import { Routes, RouterModule } from "@angular/router";

import { PropertyEditorComponent } from "./property-editor.component";
import { VerbEditorComponent } from "./verb-editor.component";
import { WobEditorComponent } from "./wob-editor.component";

import { WobEditorResolve } from "./wob-editor-resolve.service";

const editorRoutes: Routes = [
	{
		path: "wob/:id",
		component: WobEditorComponent,
		children: [
			{
				path: "properties",
				component: PropertyEditorComponent,
				resolve: [
					WobEditorResolve
				]
			},
			{
				path: "verbs",
				component: VerbEditorComponent,
				resolve: [
					WobEditorResolve
				]
			},
			{
				path: "",
				redirectTo: "properties"
			}
		]
	}
];

export const editorRouting = RouterModule.forRoot(editorRoutes);
