/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Routes, RouterModule } from "@angular/router";

import { LoginComponent } from "./login.component";

const sessionRoutes = [
	{
		path: "login",
		component: LoginComponent
	}
];

export const sessionRouting = RouterModule.forRoot(sessionRoutes);
