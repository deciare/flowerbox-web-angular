/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Router, Resolve } from "@angular/router";
import { Observable } from "rxjs/Observable";

import { WobInfo } from "../models/wob.ts";

import { SessionHttp } from "../session/session-http.service";
import { WobService } from "../api/wob.service";

@Injectable()
export class WobEditorResolve implements Resolve<WobInfo> {
	constructor(
		private wobService: WobService
	) {
		// Dependency injection only; no code
	}

	resolve(route: ActivatedRouteSnapshot): Observable<any> | Promise<any> | any {
		var id = +route.parent.params["id"];
		var admin = route.parent.params["admin"] == "true" ? true : false;
		return this.wobService.getEditState(id, admin);
	}
}