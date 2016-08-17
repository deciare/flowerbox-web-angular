/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs/Subscription";

import { EventStream, EventStreamItem } from "./event-stream";
import { WobInfo } from "./wob";

import { InteractiveChunkComponent } from "./interactive-chunk.component";

import { SessionEvent, SessionService } from "./session.service";
import { TerminalEventService } from "./terminal-event.service";
import { WobService } from "./wob.service";

@Component({
	moduleId: module.id,
	selector: "infobar",
	styles: [`
		header {
			position: fixed;
			background-color: black;
			border-bottom: 1px solid #666666;
			font-family: Consolas, Monaco, "Liberation Mono", Fixed, monospace;
			width: 100%;
		}
	`],
	template: `
		<header>
			<span class="brand primary">Flower</span><span class="brand secondary">box</span>
			<span *ngIf="!player">&nbsp;&nbsp;Not logged in</span>
			<span *ngIf="player">
				&nbsp;&nbsp;<span class="glyphicon glyphicon-user"></span>
				{{player.name}}
				<span *ngIf="location">
					&nbsp;&nbsp;<span class="glyphicon glyphicon-screenshot"></span>
					{{location.name}} (#{{location.id}})
				</span>
			</span>
		</header>
	`
})
export class InfobarComponent implements OnDestroy, OnInit {
	private sessionEvents: Subscription;
	private terminalEvents: Subscription;

	location: WobInfo;
	locationChunk: any;
	player: WobInfo;
	playerChunk: any;

	constructor(
		private sessionService: SessionService,
		private terminalEventService: TerminalEventService,
		private wobService: WobService
	) {
		// Dependency injetion only; no code
	}

	private handleSessionEvent(event: SessionEvent) {
		switch(event.type) {
		case SessionEvent.Login:
			this.player = event.player;
			this.playerChunk = {
				text: this.player.name,
				type: "wob",
				interactive: {
					id: this.player.id
				}
			};
			this.getLocationInfo(this.player.container);
			break;
		case SessionEvent.Logout:
			this.player = undefined;
			break;
		}
	}

	private handleTerminalEvent(event: EventStream) {
		event.log.forEach((log) => {
			switch(log.type) {
			case EventStreamItem.TypeMoveNotification: // movement
				var movedWob = log.items[0];
				var oldLocation = log.items[1];
				var newLocation = log.items[2];

				this.getLocationInfo(newLocation.id);
				break;
			}
		});
	}

	private getLocationInfo(id: number): Promise<WobInfo> {
		return this.wobService.getInfo(id)
			.then((location: WobInfo) => {
				// Cache location info
				this.location = location;
				this.locationChunk = {
					type: "wob",
					text: location.name,
					interactive: {
						id: location.id
					}
				};

				return location;
			});
	}

	ngOnInit() {
		// Subscribe to session state change notifications
		this.sessionEvents = this.sessionService.events.subscribe(this.handleSessionEvent.bind(this));

		// Subscribe to the server event stream
		this.terminalEvents = this.terminalEventService.output.subscribe(this.handleTerminalEvent.bind(this));

		// If player is already logged in, get player info manually since we
		// won't be receiving it as part of a login event
		if (this.sessionService.isLoggedIn()) {
			this.sessionService.getPlayerInfo()
				.then((player: WobInfo) => {
					this.player = player;
					this.playerChunk = {
						text: this.player.name,
						type: "wob",
						interactive: {
							id: this.player.id
						}
					};
					this.getLocationInfo(this.player.container);
				});
		}
	}

	ngOnDestroy() {
		this.terminalEvents.unsubscribe();
	}
}