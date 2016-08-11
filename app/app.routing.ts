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
