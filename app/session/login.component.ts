/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs/Subscription";

import { SessionEvent, SessionService } from "./session.service";

@Component({
	moduleId: module.id,
	selector: "login",
	styleUrls: [
		"./login.component.css"
	],
	templateUrl: "./login.component.html"
})
export class LoginComponent implements OnDestroy, OnInit {
	private routeParamsSubscription: Subscription;
	private sessionEventSubscription: Subscription;

	admin: boolean;
	alert: any;
	redirectUrl: string;
	username: string;
	usernameDisabled: boolean;
	password: string;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private sessionService: SessionService
	) {
		this.usernameDisabled = false;
	}

	private handleSessionEvent(event: SessionEvent) {
		if (event.type == SessionEvent.Login) {
			// If username is already available, prefill it and focus the
			// password field. This is the expected behaviour when this page
			// was reached as a privilege escalation prompt.
			this.username = event.player.globalid;
			this.usernameDisabled = true;
			$("#password").focus();

			if (!this.admin) {
				// If the user is already logged in, and this wasn't a privilege
				// escalation prompt, just redirect to the next page.
				this.redirect();
			}
		}
		else if (this.admin && event.type == SessionEvent.AdminLogin) {
			// If this page was reached as a privelege escalation prompt and
			// admin login was successful, redirect to the next page.
			this.redirect();
		}
		// There should never be a situationw where the last-known session event
		// was a succeessful admin login, but we aren't here for privilege
		// escalation.
	}

	private redirect() {
		if (!this.redirectUrl) {
			// If no redirectUrl was passed in, then the default redirect URL
			// is the main termianl.
			this.redirectUrl = "/terminal";
		}
		this.router.navigateByUrl(this.redirectUrl);
	}

	ngOnInit() {
		this.routeParamsSubscription = this.route.params.subscribe((params) => {
			this.admin = params["admin"] == "true" ? true : false;
			this.redirectUrl = params["redirect"];
		});

		// Session events will notify us when login is successful, and also
		// provide us with cheap acess to the player wob.
		this.sessionEventSubscription = this.sessionService.events.subscribe(this.handleSessionEvent.bind(this));
	}

	ngOnDestroy() {
		this.sessionEventSubscription.unsubscribe();
	}

	onSubmit() {
		if (this.admin && !this.sessionService.isLoggedIn()) {
			// If this is a privilege escalation prompt and the user isn't
			// currently logged in, obtain a regular token in addition to
			// obtaining an admintoken.
			this.sessionService.login(this.username, this.password, false);
		}

		this.sessionService.login(this.username, this.password, this.admin)
			.catch((error) => {
				this.alert = {
					type: "danger",
					text: error
				}
			});
	}
}