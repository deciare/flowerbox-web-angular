/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs/Subscription";

import { EventStream, EventStreamItem } from "./event-stream";
import { InstanceOfList, InstanceOfResult, WobInfo, WobInfoList } from "./wob";

import { InteractiveChunk, InteractiveChunkComponent } from "./interactive-chunk.component";

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
			<span *ngIf="!player">&nbsp;Not logged in</span>
			<span *ngIf="player">
				&nbsp;{{player.name}}
				<span *ngIf="location" aria-label="Current location:">
					&nbsp;<span class="glyphicon glyphicon-screenshot" title="Location" aria-hidden="true"></span>
					{{location.name}} (#{{location.id}})
				</span>
				<span *ngIf="locationPlayers" aria-label="Number of other players here:">
					&nbsp;<span class="glyphicon glyphicon-user" title="Other players here" aria-hidden="true"></span>
					{{locationPlayers.list.length - 1}}
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
	locationContents: WobInfoList;
	locationPlayers: WobInfoList;
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
			this.setPlayerInfo(event.player);
			this.getLocationInfo(this.player.container);
			this.getLocationContents(this.player.container);
			break;
		case SessionEvent.Logout:
			this.player = undefined;
			break;
		}
	}

	private handleTerminalEvent(event: EventStream) {
		var hasPlayerMoved = false;
		var hasOtherMoved = false;

		// If player isn't yet available, then we aren't ready to
		// process events
		if (!this.player) {
			return;
		}

		event.log.forEach((log) => {
			switch(log.type) {
			case EventStreamItem.TypeMoveNotification: // movement
				var movedWob = log.items[0];
				var oldLocation = log.items[1];
				var newLocation = log.items[2];

				if (movedWob.id == this.player.id) {
					hasPlayerMoved = true;
				}
				else {
					hasOtherMoved = true;
				}
				break;
			}
		});

		// If the player moved, update player and location info
		if (hasPlayerMoved) {
			this.sessionService.getPlayerInfo()
				.then((player: WobInfo) => {
					this.setPlayerInfo(player);
					this.getLocationInfo(this.player.container);
					this.getLocationContents(this.player.container);
				});
		}
		// Otherwise, just update the current location's contents.
		else if (hasOtherMoved) {
			this.getLocationContents(this.player.container);
		}
	}

	private getLocationInfo(id: number): Promise<WobInfo> {
		return this.wobService.getInfo(id)
			.then((location: WobInfo) => {
				// Cache location info
				this.location = location;
				this.locationChunk = new InteractiveChunk(
					location.id,
					InteractiveChunk.TypeWob,
					location.name
				);

				return location;
			});
	}

	private getLocationContents(id: number): Promise<WobInfoList> {
		return this.wobService.getContents(id)
			.then((contents: WobInfoList) => {
				// Cache location contents
				this.locationContents = contents;

				var ids: number[] = [];
				contents.list.forEach((wob) => {
					ids.push(wob.id);
				});

				var players: WobInfo[] = [];
				this.wobService.instanceOf(ids, "@player")
					.then((results: InstanceOfList) => {
						results.list.forEach((result) => {
							if (result.isInstance) {
								players.push(contents.list.find((value: WobInfo) =>  {
									return value.id == result.id;
								}));
							}
						});
						this.locationPlayers = new WobInfoList(players);
					});

				return contents;
			});
	}

	private setPlayerInfo(player: WobInfo) {
		this.player = player;
		this.playerChunk = new InteractiveChunk(
			this.player.id,
			InteractiveChunk.TypeWob,
			this.player.name
		);
	}

	ngOnInit() {
		// Subscribe to session state change notifications
		this.sessionEvents = this.sessionService.events
			.subscribe(this.handleSessionEvent.bind(this));

		// Subscribe to the server event stream
		this.terminalEvents = this.terminalEventService.output
			.subscribe(this.handleTerminalEvent.bind(this));

		// If player is already logged in, get player info manually since we
		// won't be receiving it as part of a login event
		if (this.sessionService.isLoggedIn()) {
			this.sessionService.getPlayerInfo()
				.then((player: WobInfo) => {
					this.setPlayerInfo(player);
					this.getLocationInfo(this.player.container);
					this.getLocationContents(this.player.container);
				});
		}
	}

	ngOnDestroy() {
		this.sessionEvents.unsubscribe();
		this.terminalEvents.unsubscribe();
	}
}