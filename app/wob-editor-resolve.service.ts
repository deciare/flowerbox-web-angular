import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Router, Resolve } from "@angular/router";
import { Observable } from "rxjs/Observable";

import { WobInfo } from "./wob.ts";

import { SessionHttp } from "./session-http.service";
import { WobService } from "./wob.service";

@Injectable()
export class WobEditorResolve implements Resolve<WobInfo> {
	constructor(
		private wobService: WobService
	) {
		// Dependency injection only; no code
	}

	resolve(route: ActivatedRouteSnapshot): Observable<any> | Promise<any> | any {
		var id = +route.parent.params["id"];
		return this.wobService.getEditState(id);
	}
}