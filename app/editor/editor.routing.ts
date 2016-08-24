/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Routes, RouterModule } from "@angular/router";

import { PropertyEditorComponent } from "./property-editor.component";
import { VerbEditorComponent } from "./verb-editor.component";
import { WobEditorComponent } from "./wob-editor.component";

import { SessionGuard } from "../session/session-guard.service";
import { WobEditorResolve } from "./wob-editor-resolve.service";

const editorRoutes: Routes = [
	{
		path: "wob/:id",
		component: WobEditorComponent,
		canActivate: [
			SessionGuard
		],
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
