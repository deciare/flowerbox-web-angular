/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Observer } from "rxjs/Observer";
import { Subscription } from "rxjs/Subscription";
import "rxjs/add/operator/publishReplay";

import { EventStream, EventStreamItem } from "../models/event-stream";
import { InstanceOfModelList, WobInfoModel, WobInfoModelList } from "../models/wob";

import { SessionEvent, SessionService } from "../session/session.service";
import { TerminalEventService } from "../api/terminal-event.service";
import { WobService } from "../api/wob.service";

@Injectable()
export class StatusService {
	private _location: WobInfoModel;
	private _locationContents: WobInfoModelList;
	private _locationPlayers: WobInfoModelList;
	private _player: WobInfoModel;
	private sessionEvents: Subscription;
	private terminalEvents: Subscription;

	location: BehaviorSubject<WobInfoModel>;
	locationContents: BehaviorSubject<WobInfoModelList>;
	locationPlayers: BehaviorSubject<WobInfoModelList>;
	player: BehaviorSubject<WobInfoModel>;

	constructor(
		private sessionService: SessionService,
		private terminalEventService: TerminalEventService,
		private wobService: WobService
	) {
		// When the player's location changes, this observable publishes a
		// WobInfo of the new location.
		this.location = new BehaviorSubject<WobInfoModel>(null);

		// When the player's location changes, this observable publishes a
		// WobInfoList of the new location's contents.
		this.locationContents = new BehaviorSubject<WobInfoModelList>(null);

		// When the list of other players present at the player's location
		// changes, this observable publishes a WobInfoList of other players.
		this.locationPlayers = new BehaviorSubject<WobInfoModelList>(null);

		// When the player's location changes, or when the player logs in or
		// out, this observable publishes a WobInfo of the player object.
		this.player = new BehaviorSubject<WobInfoModel>(null);

		// Subscribe to session state change notifications
		this.sessionEvents = this.sessionService.events
			.subscribe(this.handleSessionEvent.bind(this));

		// Subscribe to the server event stream
		this.terminalEvents = this.terminalEventService.output
			.subscribe(this.handleTerminalEvent.bind(this));
	}

	private handleSessionEvent(event: SessionEvent) {
		switch(event.type) {
		case SessionEvent.Login:
			this.setPlayerInfo(event.player);
			this.getLocationInfo(this._player.container);
			this.getLocationContents(this._player.container);
			break;
		case SessionEvent.Logout:
			this.setPlayerInfo(undefined);
			break;
		}
	}

	private handleTerminalEvent(event: EventStream) {
		var hasPlayerMoved = false;
		var hasOtherMoved = false;

		// If player isn't yet available, then we aren't ready to
		// process events
		if (!this._player) {
			return;
		}

		event.log.forEach((log) => {
			switch(log.type) {
			case EventStreamItem.TypeMoveNotification: // movement
				var movedWob = log.items[0];
				var oldLocation = log.items[1];
				var newLocation = log.items[2];

				if (movedWob.id == this._player.id) {
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
				.then((player: WobInfoModel) => {
					this.setPlayerInfo(player);
					this.getLocationInfo(this._player.container);
					this.getLocationContents(this._player.container);
				});
		}
		// Otherwise, just update the current location's contents.
		else if (hasOtherMoved) {
			this.getLocationContents(this._player.container);
		}
	}

	private getLocationInfo(id: number): Promise<WobInfoModel> {
		return this.wobService.getInfo(id)
			.then((location: WobInfoModel) => {
				// Cache location info and notify
				this._location = location;
				this.location.next(location);
				return location;
			});
	}

	private getLocationContents(id: number): Promise<WobInfoModelList> {
		return this.wobService.getContents(id)
			.then((contents: WobInfoModelList) => {
				// Cache location contents and notify
				this._locationContents = contents;
				this.locationContents.next(contents);

				var ids: number[] = [];
				contents.list.forEach((wob) => {
					ids.push(wob.id);
				});

				var players: WobInfoModel[] = [];
				this.wobService.instanceOf(ids, "@player")
					.then((results: InstanceOfModelList) => {
						results.list.forEach((result) => {
							if (result.isInstance) {
								players.push(contents.list.find((value: WobInfoModel) =>  {
									return value.id == result.id;
								}));
							}
						});

						// Cache nearby players list and notify
						this._locationPlayers = new WobInfoModelList(players);
						this.locationPlayers.next(this._locationPlayers);
					});

				return contents;
			});
	}

	private setPlayerInfo(player: WobInfoModel) {
		// Cache player info and notify
		this._player = player;
		this.player.next(this._player);
	}
}