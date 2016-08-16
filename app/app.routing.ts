/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Routes, RouterModule } from "@angular/router";

import { TerminalComponent } from "./terminal.component";

const appRoutes: Routes = [
	{
		path: "terminal",
		component: TerminalComponent
	},
	{
		path: "",
		pathMatch: "full",
		redirectTo: "/terminal"
	}
];

export const appRouting = RouterModule.forRoot(appRoutes);
