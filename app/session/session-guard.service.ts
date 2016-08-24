/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, NavigationExtras, Router, RouterStateSnapshot } from "@angular/router";

import { SessionService } from "./session.service";

@Injectable()
export class SessionGuard implements CanActivate {
	constructor(
		private router: Router,
		private sessionService: SessionService
	) {
		// Dependency injection only; no code
	}

	canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
		var admin = route.params["admin"] == "true" ? true : false;
		var url = state.url;

		if (!this.sessionService.isLoggedIn()) {
			this.router.navigate([ "/login", {
				redirect: url
			} ]);
		}
		else if (admin && !this.sessionService.isLoggedInAsAdmin()) {
			this.router.navigate([ "/login", {
				admin: admin,
				redirect: url
			} ]);
		}
		else {
			return true;
		}

		return false;
	}
}
